import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { successResponse } from '../utils/http';

const auditLogQuerySchema = z.object({
  action: z.string().trim().optional(),
  pharmacyId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const auditLogsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/audit-logs',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN', 'OWNER', 'ADMIN'])],
    },
    async (request, reply) => {
      const parsed = auditLogQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid audit log query.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const role = request.user?.role;
      const pharmacyId = role === 'SUPER_ADMIN' ? parsed.data.pharmacyId : request.user?.pharmacyId;

      if (role !== 'SUPER_ADMIN' && !pharmacyId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Admin account must be linked to a pharmacy to view audit logs.',
          statusCode: 400,
        });
      }

      const logs = await fastify.prisma.auditLog.findMany({
        where: {
          ...(parsed.data.action ? { action: parsed.data.action } : {}),
          ...(pharmacyId ? { pharmacyId } : {}),
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
          pharmacy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: parsed.data.limit,
      });

      return reply.send(successResponse('Audit logs fetched successfully.', logs));
    },
  );
};

export default auditLogsRoutes;
