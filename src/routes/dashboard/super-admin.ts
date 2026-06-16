import type { FastifyInstance } from 'fastify';
import { successResponse } from '../../utils/http';
import { globalStatsQuerySchema } from '../super-admin/shared';
import { toNumber } from './shared';

export const registerSuperAdminDashboardRoutes = (
  fastify: FastifyInstance,
): void => {
  fastify.get(
    '/super-admin/stats/global',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsed = globalStatsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid stats query.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const soldAt: Record<string, Date> = {};
      if (parsed.data.dateFrom) soldAt.gte = new Date(parsed.data.dateFrom);
      if (parsed.data.dateTo) soldAt.lte = new Date(parsed.data.dateTo);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

      const [
        sales,
        todaySales,
        monthSales,
        pharmacies,
        usersByRole,
        subscriptionsByStatus,
        lowStockCount,
        productCount,
        pendingOrderCount,
      ] = await Promise.all([
        fastify.prisma.sale.findMany({
          where: Object.keys(soldAt).length > 0 ? { soldAt } : undefined,
          select: { totalAmount: true, pharmacyId: true },
        }),
        fastify.prisma.sale.aggregate({
          where: { soldAt: { gte: todayStart } },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        fastify.prisma.sale.aggregate({
          where: { soldAt: { gte: monthStart } },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        fastify.prisma.pharmacy.findMany({
          select: { id: true, name: true, isBlocked: true, archivedAt: true },
        }),
        fastify.prisma.user.groupBy({
          by: ['role'],
          _count: { _all: true },
        }),
        fastify.prisma.pharmacySubscription.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        fastify.prisma.stock.count({
          where: { quantity: { lte: 20 } },
        }),
        fastify.prisma.product.count(),
        fastify.prisma.onlineOrder.count({
          where: { status: 'PENDING' },
        }),
      ]);

      const revenueByPharmacy = new Map<string, number>();
      for (const sale of sales) {
        revenueByPharmacy.set(
          sale.pharmacyId,
          (revenueByPharmacy.get(sale.pharmacyId) ?? 0) +
            toNumber(sale.totalAmount),
        );
      }

      return reply.send(
        successResponse('Global statistics fetched successfully.', {
          totalRevenue: sales.reduce(
            (sum, sale) => sum + toNumber(sale.totalAmount),
            0,
          ),
          totalRevenueToday: Number(todaySales._sum.totalAmount ?? 0),
          totalRevenueThisMonth: Number(monthSales._sum.totalAmount ?? 0),
          salesToday: todaySales._count.id,
          salesThisMonth: monthSales._count.id,
          totalPharmacies: pharmacies.length,
          activePharmacies: pharmacies.filter((item) => !item.isBlocked && !item.archivedAt).length,
          blockedPharmacies: pharmacies.filter((item) => item.isBlocked).length,
          archivedPharmacies: pharmacies.filter((item) => item.archivedAt).length,
          totalUsers: usersByRole.reduce((sum, item) => sum + item._count._all, 0),
          usersByRole: Object.fromEntries(usersByRole.map((item) => [item.role, item._count._all])),
          subscriptionsByStatus: Object.fromEntries(subscriptionsByStatus.map((item) => [item.status, item._count._all])),
          activeSubscriptions: subscriptionsByStatus
            .filter((item) => ['ACTIVE', 'TRIAL'].includes(item.status))
            .reduce((sum, item) => sum + item._count._all, 0),
          lowStockCount,
          totalProducts: productCount,
          pendingOrderCount,
          pharmacies: pharmacies.map((item) => ({
            id: item.id,
            name: item.name,
            isBlocked: item.isBlocked,
            archivedAt: item.archivedAt,
            revenue: revenueByPharmacy.get(item.id) ?? 0,
          })),
        }),
      );
    },
  );
};
