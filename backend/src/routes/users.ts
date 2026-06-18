import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword } from '../services/password';
import { createAuditLog } from '../services/audit';
import { successResponse } from '../utils/http';

const createSellerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  full_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  tel_number: z.string().trim().min(7).max(30),
  age: z.coerce.number().int().min(18),
  password: z.string().min(8).max(128),
});

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(150).optional(),
  tel_number: z.string().trim().min(7).max(30).optional(),
  delivery_address: z.string().trim().min(3).max(500).optional().nullable(),
  age: z.coerce.number().int().min(1).max(120).optional(),
});

const userProfileSelect = {
  id: true,
  username: true,
  email: true,
  full_name: true,
  tel_number: true,
  delivery_address: true,
  age: true,
  is_email_verified: true,
  role: true,
  pharmacy_id: true,
  created_at: true,
  updated_at: true,
} as const;

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'integer' },
  },
};

const createSellerSwaggerSchema = {
  tags: ['Users'],
  summary: 'Create a seller account for the current pharmacy',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['username', 'full_name', 'email', 'tel_number', 'age', 'password'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 50 },
      full_name: { type: 'string', minLength: 2, maxLength: 150 },
      email: { type: 'string', format: 'email', maxLength: 255 },
      tel_number: { type: 'string', minLength: 7, maxLength: 30 },
      age: { type: 'integer', minimum: 18 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            full_name: { type: 'string' },
            tel_number: { type: 'string' },
            age: { type: 'integer' },
            role: { type: 'string' },
            pharmacy_id: { type: ['string', 'null'], format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
  },
};

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/users/me',
    {
      preHandler: [fastify.authenticate as never],
    },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Unauthorized.', statusCode: 401 });
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: userProfileSelect,
      });
      if (!user) {
        return reply.code(404).send({ error: 'Not Found', message: 'User not found.', statusCode: 404 });
      }

      return reply.send(successResponse('Profile fetched successfully.', user));
    },
  );

  fastify.patch(
    '/users/me',
    {
      preHandler: [fastify.authenticate as never],
    },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Unauthorized.', statusCode: 401 });
      }

      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid profile payload.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const user = await fastify.prisma.user.update({
        where: { id: userId },
        data: parsed.data,
        select: userProfileSelect,
      }).catch(() => null);
      if (!user) {
        return reply.code(404).send({ error: 'Not Found', message: 'User not found.', statusCode: 404 });
      }

      await createAuditLog(fastify, request, {
        action: 'PROFILE_UPDATED',
        entityType: 'User',
        entityId: user.id,
        pharmacyId: user.pharmacy_id,
      });

      return reply.send(successResponse('Profile updated successfully.', user));
    },
  );

  fastify.post(
    '/users/sellers',
    {
      schema: createSellerSwaggerSchema,
      preHandler: [fastify.authenticate as never, fastify.checkRole(['OWNER', 'ADMIN'])],
    },
    async (request, reply) => {
      const parsed = createSellerSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid seller payload.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const pharmacyId = request.user?.pharmacyId;
      if (!pharmacyId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Admin account must be linked to a pharmacy.',
          statusCode: 400,
        });
      }

      const existingUser = await fastify.prisma.user.findFirst({
        where: {
          OR: [
            { email: parsed.data.email.toLowerCase() },
            { username: parsed.data.username },
          ],
        },
        select: { id: true, email: true, username: true },
      });

      if (existingUser) {
        return reply.code(409).send({
          error: 'Conflict',
          message:
            existingUser.email === parsed.data.email.toLowerCase()
              ? 'A user with this email already exists.'
              : 'A user with this username already exists.',
          statusCode: 409,
        });
      }

      const seller = await fastify.prisma.user.create({
        data: {
          username: parsed.data.username,
          email: parsed.data.email.toLowerCase(),
          password: await hashPassword(parsed.data.password),
          full_name: parsed.data.full_name,
          tel_number: parsed.data.tel_number,
          age: parsed.data.age,
          role: 'SELLER',
          pharmacy_id: pharmacyId,
        },
        select: {
          id: true,
          username: true,
          email: true,
          full_name: true,
          tel_number: true,
          age: true,
          role: true,
          pharmacy_id: true,
          created_at: true,
        },
      });

      await createAuditLog(fastify, request, {
        action: 'SELLER_CREATED',
        entityType: 'User',
        entityId: seller.id,
        pharmacyId,
        metadata: {
          username: seller.username,
          email: seller.email,
        },
      });

      return reply.code(201).send(successResponse('Seller created successfully.', seller));
    },
  );
};

export default usersRoutes;
