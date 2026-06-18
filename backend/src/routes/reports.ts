import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { successResponse } from '../utils/http';

const reportQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sellerId: z.string().uuid().optional(),
  pharmacyId: z.string().uuid().optional(),
});

const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/reports/profit',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['OWNER', 'ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsed = reportQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid report query.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const role = request.user?.role;
      const scopedPharmacyId = role === 'SUPER_ADMIN' ? parsed.data.pharmacyId : request.user?.pharmacyId;

      if (!scopedPharmacyId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Pharmacy scope is required for this report.',
          statusCode: 400,
        });
      }

      const soldAt: Record<string, Date> = {};
      if (parsed.data.dateFrom) soldAt.gte = new Date(parsed.data.dateFrom);
      if (parsed.data.dateTo) soldAt.lte = new Date(parsed.data.dateTo);

      const sales = await fastify.prisma.sale.findMany({
        where: {
          pharmacyId: scopedPharmacyId,
          ...(Object.keys(soldAt).length > 0 ? { soldAt } : {}),
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  purchasePrice: true,
                  sellingPrice: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ soldAt: 'desc' }],
      });

      const revenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
      const cost = sales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce(
            (itemSum, item) => itemSum + Number(item.product.purchasePrice) * item.quantity,
            0,
          ),
        0,
      );

      return reply.send(
        successResponse('Profit report fetched successfully.', {
          pharmacyId: scopedPharmacyId,
          revenue,
          cost,
          profit: revenue - cost,
          totalSales: sales.length,
        }),
      );
    },
  );

  fastify.get(
    '/reports/shift',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['OWNER', 'ADMIN', 'SELLER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsed = reportQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid report query.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const role = request.user?.role;
      const actorUserId = request.user?.userId;
      const pharmacyId = role === 'SUPER_ADMIN' ? parsed.data.pharmacyId ?? request.user?.pharmacyId : request.user?.pharmacyId;
      const sellerId = role === 'SELLER' ? actorUserId : parsed.data.sellerId ?? actorUserId;

      if (!pharmacyId || !sellerId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Seller and pharmacy scope are required for this report.',
          statusCode: 400,
        });
      }

      const soldAt: Record<string, Date> = {};
      if (parsed.data.dateFrom) soldAt.gte = new Date(parsed.data.dateFrom);
      if (parsed.data.dateTo) soldAt.lte = new Date(parsed.data.dateTo);

      const sales = await fastify.prisma.sale.findMany({
        where: {
          pharmacyId,
          sellerId,
          ...(Object.keys(soldAt).length > 0 ? { soldAt } : {}),
        },
        include: {
          items: true,
        },
        orderBy: [{ soldAt: 'desc' }],
      });

      return reply.send(
        successResponse('Shift report fetched successfully.', {
          pharmacyId,
          sellerId,
          totalSales: sales.length,
          totalRevenue: sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
          totalItemsSold: sales.reduce(
            (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
            0,
          ),
        }),
      );
    },
  );
};

export default reportsRoutes;
