import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAuditLog } from '../../services/audit';
import { hashPassword } from '../../services/password';
import { successResponse } from '../../utils/http';
import {
  assignPharmacyUserSchema,
  assignUserSwaggerSchema,
  pharmacyParamsSchema,
} from './shared';

const userRoleParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'SELLER', 'CUSTOMER']),
  pharmacyId: z.string().uuid().nullable().optional(),
});

const createManagedUserSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(2).max(150),
  tel_number: z.string().trim().min(7).max(30),
  age: z.coerce.number().int().min(1).max(120).default(25),
  role: z.enum(['OWNER', 'ADMIN', 'SELLER', 'CUSTOMER']).default('CUSTOMER'),
  pharmacyId: z.string().uuid().nullable().optional(),
  is_email_verified: z.boolean().default(true),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

const registerAssignmentRoute = (
  fastify: FastifyInstance,
  role: 'OWNER' | 'ADMIN',
  path: string,
  summary: string,
): void => {
  fastify.post(
    path,
    {
      schema: assignUserSwaggerSchema(summary),
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsedParams = pharmacyParamsSchema.safeParse(request.params);
      const parsedBody = assignPharmacyUserSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Invalid ${role.toLowerCase()} assignment payload.`,
          statusCode: 400,
          details: {
            params: parsedParams.success ? null : parsedParams.error.flatten(),
            body: parsedBody.success ? null : parsedBody.error.flatten(),
          },
        });
      }

      const pharmacy = await fastify.prisma.pharmacy.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true, name: true },
      });
      if (!pharmacy) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Pharmacy not found.',
          statusCode: 404,
        });
      }

      const user = await fastify.prisma.user
        .update({
          where: { id: parsedBody.data.userId },
          data: { role, pharmacy_id: pharmacy.id },
          select: { id: true, username: true, email: true, role: true, pharmacy_id: true },
        })
        .catch(() => null);

      if (!user) {
        return reply.code(404).send({ error: 'Not Found', message: 'User not found.', statusCode: 404 });
      }

      await createAuditLog(fastify, request, {
        action: role === 'OWNER' ? 'PHARMACY_OWNER_ASSIGNED' : 'PHARMACY_ADMIN_ASSIGNED',
        entityType: 'User',
        entityId: user.id,
        pharmacyId: pharmacy.id,
        metadata: { role, username: user.username, pharmacyName: pharmacy.name },
      });

      return reply.send(successResponse(`${role === 'OWNER' ? 'Owner' : 'Admin'} assigned successfully.`, user));
    },
  );
};

export const registerUserManagementRoutes = (fastify: FastifyInstance): void => {
  fastify.get(
    '/super-admin/users',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (_request, reply) => {
      const users = await fastify.prisma.user.findMany({
        select: {
          id: true, username: true, email: true, full_name: true,
          tel_number: true, age: true, role: true, isBlocked: true,
          pharmacy_id: true, is_email_verified: true, created_at: true,
          pharmacy: { select: { id: true, name: true, licenseNumber: true } },
        },
        orderBy: [{ created_at: 'desc' }],
      }).catch(async (error) => {
        fastify.log.warn({ error }, 'User block column is not ready; returning users without block state.');
        const fallbackUsers = await fastify.prisma.user.findMany({
          select: {
            id: true, username: true, email: true, full_name: true,
            tel_number: true, age: true, role: true, pharmacy_id: true,
            is_email_verified: true, created_at: true,
            pharmacy: { select: { id: true, name: true, licenseNumber: true } },
          },
          orderBy: [{ created_at: 'desc' }],
        });
        return fallbackUsers.map((user) => ({ ...user, isBlocked: false }));
      });

      return reply.send(successResponse('Users fetched successfully.', users));
    },
  );

  fastify.post(
    '/super-admin/users',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsed = createManagedUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid user payload.', statusCode: 400, details: parsed.error.flatten() });
      }

      const needsPharmacy = ['OWNER', 'ADMIN', 'SELLER'].includes(parsed.data.role);
      if (needsPharmacy && !parsed.data.pharmacyId) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Pharmacy is required for staff roles.', statusCode: 400 });
      }

      if (parsed.data.pharmacyId) {
        const pharmacy = await fastify.prisma.pharmacy.findUnique({ where: { id: parsed.data.pharmacyId }, select: { id: true } });
        if (!pharmacy) return reply.code(404).send({ error: 'Not Found', message: 'Pharmacy not found.', statusCode: 404 });
      }

      const existing = await fastify.prisma.user.findFirst({
        where: { OR: [{ email: parsed.data.email }, { username: parsed.data.username }] },
        select: { id: true, email: true, username: true },
      });
      if (existing) {
        return reply.code(409).send({
          error: 'Conflict',
          message: existing.email === parsed.data.email ? 'A user with this email already exists.' : 'A user with this username already exists.',
          statusCode: 409,
        });
      }

      const user = await fastify.prisma.user.create({
        data: {
          username: parsed.data.username, email: parsed.data.email,
          password: await hashPassword(parsed.data.password), full_name: parsed.data.full_name,
          tel_number: parsed.data.tel_number, age: parsed.data.age,
          role: parsed.data.role, pharmacy_id: needsPharmacy ? parsed.data.pharmacyId : null,
          is_email_verified: parsed.data.is_email_verified,
        },
        select: {
          id: true, username: true, email: true, full_name: true, tel_number: true,
          age: true, role: true, isBlocked: true, pharmacy_id: true, is_email_verified: true, created_at: true,
          pharmacy: { select: { id: true, name: true, licenseNumber: true } },
        },
      });

      await createAuditLog(fastify, request, {
        action: 'USER_CREATED_BY_SUPER_ADMIN', entityType: 'User', entityId: user.id,
        pharmacyId: user.pharmacy_id, metadata: { username: user.username, role: user.role },
      });

      return reply.code(201).send(successResponse('User created successfully.', user));
    },
  );

  fastify.patch(
    '/super-admin/users/:id/role',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsedParams = userRoleParamsSchema.safeParse(request.params);
      const parsedBody = updateUserRoleSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid user role payload.', statusCode: 400 });
      }

      const currentUser = await fastify.prisma.user.findUnique({ where: { id: parsedParams.data.id }, select: { id: true, username: true, role: true } });
      if (!currentUser) return reply.code(404).send({ error: 'Not Found', message: 'User not found.', statusCode: 404 });
      if (currentUser.role === 'SUPER_ADMIN') {
        return reply.code(400).send({ error: 'Bad Request', message: 'Super admin role cannot be changed from the dashboard.', statusCode: 400 });
      }

      const needsPharmacy = ['OWNER', 'ADMIN', 'SELLER'].includes(parsedBody.data.role);
      if (needsPharmacy && !parsedBody.data.pharmacyId) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Pharmacy is required for staff roles.', statusCode: 400 });
      }

      if (parsedBody.data.pharmacyId) {
        const pharmacy = await fastify.prisma.pharmacy.findUnique({ where: { id: parsedBody.data.pharmacyId }, select: { id: true } });
        if (!pharmacy) return reply.code(404).send({ error: 'Not Found', message: 'Pharmacy not found.', statusCode: 404 });
      }

      const user = await fastify.prisma.user.update({
        where: { id: currentUser.id },
        data: { role: parsedBody.data.role, pharmacy_id: needsPharmacy ? parsedBody.data.pharmacyId : null },
        select: { id: true, username: true, email: true, full_name: true, role: true, isBlocked: true, pharmacy_id: true, pharmacy: { select: { id: true, name: true, licenseNumber: true } } },
      });

      await createAuditLog(fastify, request, {
        action: 'USER_ROLE_UPDATED', entityType: 'User', entityId: user.id, pharmacyId: user.pharmacy_id,
        metadata: { username: user.username, previousRole: currentUser.role, nextRole: user.role },
      });

      return reply.send(successResponse('User role updated successfully.', user));
    },
  );

  for (const action of ['block', 'unblock'] as const) {
    fastify.patch(
      `/super-admin/users/:id/${action}`,
      { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] },
      async (request, reply) => {
        const parsedParams = userRoleParamsSchema.safeParse(request.params);
        if (!parsedParams.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid user id.', statusCode: 400 });

        const currentUser = await fastify.prisma.user.findUnique({ where: { id: parsedParams.data.id }, select: { id: true, username: true, role: true } });
        if (!currentUser) return reply.code(404).send({ error: 'Not Found', message: 'User not found.', statusCode: 404 });
        if (currentUser.role === 'SUPER_ADMIN') {
          return reply.code(400).send({ error: 'Bad Request', message: 'Super admin account cannot be blocked from the dashboard.', statusCode: 400 });
        }

        const user = await fastify.prisma.user.update({
          where: { id: currentUser.id }, data: { isBlocked: action === 'block' },
          select: { id: true, username: true, email: true, full_name: true, role: true, isBlocked: true, pharmacy_id: true, pharmacy: { select: { id: true, name: true, licenseNumber: true } } },
        });

        await createAuditLog(fastify, request, {
          action: action === 'block' ? 'USER_BLOCKED' : 'USER_UNBLOCKED', entityType: 'User', entityId: user.id, pharmacyId: user.pharmacy_id,
          metadata: { username: user.username, role: user.role },
        });

        return reply.send(successResponse(`User ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`, user));
      },
    );
  }

  fastify.patch(
    '/super-admin/users/:id/password',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const parsedParams = userRoleParamsSchema.safeParse(request.params);
      const parsedBody = resetPasswordSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid password reset payload.', statusCode: 400 });
      }

      const currentUser = await fastify.prisma.user.findUnique({ where: { id: parsedParams.data.id }, select: { id: true, username: true, role: true, pharmacy_id: true } });
      if (!currentUser) return reply.code(404).send({ error: 'Not Found', message: 'User not found.', statusCode: 404 });
      if (currentUser.role === 'SUPER_ADMIN') {
        return reply.code(400).send({ error: 'Bad Request', message: 'Super admin password cannot be reset from the dashboard.', statusCode: 400 });
      }

      const user = await fastify.prisma.user.update({
        where: { id: currentUser.id }, data: { password: await hashPassword(parsedBody.data.password) },
        select: { id: true, username: true, email: true, full_name: true, role: true, pharmacy_id: true, pharmacy: { select: { id: true, name: true, licenseNumber: true } } },
      });

      await createAuditLog(fastify, request, {
        action: 'USER_PASSWORD_RESET', entityType: 'User', entityId: user.id, pharmacyId: user.pharmacy_id,
        metadata: { username: user.username, role: user.role },
      });

      return reply.send(successResponse('User password reset successfully.', user));
    },
  );

  registerAssignmentRoute(fastify, 'OWNER', '/super-admin/pharmacies/:id/assign-owner', 'Assign an owner to a pharmacy');
  registerAssignmentRoute(fastify, 'ADMIN', '/super-admin/pharmacies/:id/assign-admin', 'Assign an admin to a pharmacy');
};