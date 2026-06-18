import type { FastifyInstance } from 'fastify';
import { createAuditLog } from '../../services/audit';
import { successResponse } from '../../utils/http';
import {
  createPharmacySchema,
  createPharmacySwaggerSchema,
  pharmacyParamsSchema,
  updatePharmacySchema,
} from './shared';

export const registerSuperAdminPharmacyRoutes = (
  fastify: FastifyInstance,
): void => {
  fastify.get(
    '/super-admin/pharmacies',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (_request, reply) => {
      const pharmacies = await fastify.prisma.pharmacy.findMany({
        include: {
          users: {
            select: { id: true, username: true, email: true, role: true },
          },
          subscriptions: {
            include: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  price: true,
                  billingInterval: true,
                },
              },
            },
            orderBy: [{ createdAt: 'desc' }],
            take: 1,
          },
          _count: { select: { stocks: true, sales: true, users: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      return reply.send(successResponse('Pharmacies fetched successfully.', pharmacies));
    },
  );

  fastify.post(
    '/super-admin/pharmacies',
    {
      schema: createPharmacySwaggerSchema,
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsed = createPharmacySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid pharmacy payload.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const existing = await fastify.prisma.pharmacy.findUnique({
        where: { licenseNumber: parsed.data.licenseNumber },
        select: { id: true },
      });
      if (existing) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'A pharmacy with this license number already exists.',
          statusCode: 409,
        });
      }

      const pharmacy = await fastify.prisma.pharmacy.create({ data: parsed.data });
      await createAuditLog(fastify, request, {
        action: 'PHARMACY_CREATED',
        entityType: 'Pharmacy',
        entityId: pharmacy.id,
        pharmacyId: pharmacy.id,
        metadata: {
          name: pharmacy.name,
          licenseNumber: pharmacy.licenseNumber,
        },
      });

      return reply.code(201).send(successResponse('Pharmacy created successfully.', pharmacy));
    },
  );

  fastify.patch(
    '/super-admin/pharmacies/:id',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsedParams = pharmacyParamsSchema.safeParse(request.params);
      const parsedBody = updatePharmacySchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid pharmacy update payload.',
          statusCode: 400,
        });
      }

      const pharmacy = await fastify.prisma.pharmacy.update({
        where: { id: parsedParams.data.id },
        data: parsedBody.data,
      }).catch(() => null);
      if (!pharmacy) {
        return reply.code(404).send({ error: 'Not Found', message: 'Pharmacy not found.', statusCode: 404 });
      }

      await createAuditLog(fastify, request, {
        action: 'PHARMACY_UPDATED',
        entityType: 'Pharmacy',
        entityId: pharmacy.id,
        pharmacyId: pharmacy.id,
      });

      return reply.send(successResponse('Pharmacy updated successfully.', pharmacy));
    },
  );

  for (const action of ['block', 'unblock'] as const) {
    fastify.patch(
      `/super-admin/pharmacies/:id/${action}`,
      {
        preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
      },
      async (request, reply) => {
        const parsed = pharmacyParamsSchema.safeParse(request.params);
        if (!parsed.success) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Invalid pharmacy id.',
            statusCode: 400,
            details: parsed.error.flatten(),
          });
        }

        const pharmacy = await fastify.prisma.pharmacy
          .update({
            where: { id: parsed.data.id },
            data: { isBlocked: action === 'block' },
          })
          .catch(() => null);

        if (!pharmacy) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Pharmacy not found.',
            statusCode: 404,
          });
        }

        await createAuditLog(fastify, request, {
          action: action === 'block' ? 'PHARMACY_BLOCKED' : 'PHARMACY_UNBLOCKED',
          entityType: 'Pharmacy',
          entityId: pharmacy.id,
          pharmacyId: pharmacy.id,
        });

        return reply.send(
          successResponse(
            `Pharmacy ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`,
            pharmacy,
          ),
        );
      },
    );
  }

  for (const action of ['archive', 'unarchive'] as const) {
    fastify.patch(
      `/super-admin/pharmacies/:id/${action}`,
      {
        preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
      },
      async (request, reply) => {
        const parsed = pharmacyParamsSchema.safeParse(request.params);
        if (!parsed.success) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Invalid pharmacy id.',
            statusCode: 400,
            details: parsed.error.flatten(),
          });
        }

        const pharmacy = await fastify.prisma.pharmacy
          .update({
            where: { id: parsed.data.id },
            data: { archivedAt: action === 'archive' ? new Date() : null },
          })
          .catch(() => null);

        if (!pharmacy) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Pharmacy not found.',
            statusCode: 404,
          });
        }

        await createAuditLog(fastify, request, {
          action: action === 'archive' ? 'PHARMACY_ARCHIVED' : 'PHARMACY_UNARCHIVED',
          entityType: 'Pharmacy',
          entityId: pharmacy.id,
          pharmacyId: pharmacy.id,
          metadata: { name: pharmacy.name, archivedAt: pharmacy.archivedAt },
        });

        return reply.send(
          successResponse(
            `Pharmacy ${action === 'archive' ? 'archived' : 'unarchived'} successfully.`,
            pharmacy,
          ),
        );
      },
    );
  }

  fastify.get(
    '/super-admin/pharmacies/:id',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsed = pharmacyParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid pharmacy id.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const pharmacy = await fastify.prisma.pharmacy.findUnique({
        where: { id: parsed.data.id },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              created_at: true,
            },
            orderBy: [{ created_at: 'desc' }],
          },
          subscriptions: {
            include: { plan: true },
            orderBy: [{ createdAt: 'desc' }],
          },
          stocks: {
            select: {
              id: true,
              productId: true,
              batchNumber: true,
              quantity: true,
              expiryDate: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  sellingPrice: true,
                  imageUrl: true,
                },
              },
            },
            take: 20,
            orderBy: [{ createdAt: 'desc' }],
          },
          auditLogs: {
            take: 20,
            orderBy: [{ createdAt: 'desc' }],
          },
          _count: { select: { users: true, sales: true, stocks: true } },
        },
      });

      if (!pharmacy) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Pharmacy not found.',
          statusCode: 404,
        });
      }

      return reply.send(successResponse('Pharmacy details fetched successfully.', pharmacy));
    },
  );
};
