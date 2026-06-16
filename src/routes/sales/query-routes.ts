import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const salesQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const registerSalesQueryRoutes = (fastify: FastifyInstance): void => {
  fastify.get(
    '/sales',
    {
      preHandler: [
        fastify.authenticate as never,
        fastify.checkRole(['SUPER_ADMIN', 'OWNER', 'ADMIN', 'SELLER']),
      ],
    },
    async (request, reply) => {
      const parsedQuery = salesQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid sales query.',
          statusCode: 400,
          details: parsedQuery.error.flatten(),
        });
      }

      const role = request.user?.role;
      const pharmacyId = request.user?.pharmacyId;
      const { dateFrom, dateTo, limit } = parsedQuery.data;
      const sales = await fastify.prisma.sale.findMany({
        where: {
          ...(role === 'SUPER_ADMIN' ? {} : { pharmacyId: pharmacyId ?? '' }),
          ...(dateFrom || dateTo
            ? {
                soldAt: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: new Date(dateTo) } : {}),
                },
              }
            : {}),
        },
        include: {
          seller: { select: { id: true, full_name: true, username: true } },
          pharmacy: { select: { id: true, name: true, phone: true, address: true } },
          items: { include: { product: { select: { id: true, name: true, barcode: true } } } },
        },
        orderBy: [{ soldAt: 'desc' }],
        take: limit,
      });

      return reply.send({ data: sales });
    },
  );
};
