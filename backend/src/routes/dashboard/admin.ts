import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { addDays, endOfDay, startOfDay, toNumber } from './shared';

export const registerAdminDashboardRoutes = (
  fastify: FastifyInstance,
): void => {
  fastify.get(
    '/dashboard/stats',
    {
      preHandler: [
        fastify.authenticate as never,
        fastify.checkRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']),
      ],
    },
    async (request, reply) => {
      let pharmacyId = request.user?.pharmacyId;
      const role = request.user?.role;

      if ((role === 'OWNER' || role === 'ADMIN') && !pharmacyId) {
        const defaultPharmacy = await fastify.prisma.pharmacy.findFirst({
          where: { licenseNumber: 'DORI-001' },
          select: { id: true },
        });

        pharmacyId = defaultPharmacy?.id ?? null;

        if (pharmacyId && request.user?.userId) {
          await fastify.prisma.user.update({
            where: { id: request.user.userId },
            data: { pharmacy_id: pharmacyId },
            select: { id: true },
          });
        }

        if (!pharmacyId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message:
              'Admin account must be linked to a pharmacy to view dashboard stats.',
            statusCode: 400,
          });
        }
      }

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const next30Days = endOfDay(addDays(now, 30));
      const stockWhere: Prisma.StockWhereInput =
        role === 'SUPER_ADMIN' ? {} : { pharmacyId: pharmacyId as string };
      const salesWhere: Prisma.SaleWhereInput =
        role === 'SUPER_ADMIN'
          ? { soldAt: { gte: todayStart, lte: todayEnd } }
          : {
              pharmacyId: pharmacyId as string,
              soldAt: { gte: todayStart, lte: todayEnd },
            };

      const orderWhere: Prisma.OnlineOrderWhereInput =
        role === 'SUPER_ADMIN' ? {} : { pharmacyId: pharmacyId as string };
      const productWhere: Prisma.ProductWhereInput =
        role === 'SUPER_ADMIN'
          ? {}
          : { stocks: { some: { pharmacyId: pharmacyId as string } } };

      const [todaySales, stockRows, expiringStocks, orderGroups, productsCount] = await Promise.all([
        fastify.prisma.sale.findMany({
          where: salesWhere,
          select: {
            totalAmount: true,
            paymentType: true,
            items: {
              select: {
                quantity: true,
                lineTotal: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    purchasePrice: true,
                  },
                },
              },
            },
          },
        }),
        fastify.prisma.stock.findMany({
          where: stockWhere,
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            reorderLevel: true,
            expiryDate: true,
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                purchasePrice: true,
                sellingPrice: true,
              },
            },
          },
        }),
        fastify.prisma.stock.findMany({
          where: {
            ...stockWhere,
            quantity: { gt: 0 },
            expiryDate: {
              gte: todayStart,
              lte: next30Days,
            },
          },
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            reorderLevel: true,
            expiryDate: true,
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
              },
            },
          },
          orderBy: [{ expiryDate: 'asc' }, { quantity: 'asc' }],
        }),
        fastify.prisma.onlineOrder.groupBy({
          by: ['status'],
          where: orderWhere,
          _count: { _all: true },
        }),
        fastify.prisma.product.count({ where: productWhere }),
      ]);

      const totalRevenueToday = todaySales.reduce(
        (sum, sale) => sum + toNumber(sale.totalAmount),
        0,
      );
      const totalItemsSoldToday = todaySales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
      );
      const grossProfitToday = todaySales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce(
            (itemSum, item) =>
              itemSum +
              (toNumber(item.lineTotal) -
                toNumber(item.product.purchasePrice) * item.quantity),
            0,
          ),
        0,
      );
      const inventoryValue = stockRows.reduce(
        (sum, stock) =>
          sum + stock.quantity * toNumber(stock.product.purchasePrice),
        0,
      );
      const inventoryRetailValue = stockRows.reduce(
        (sum, stock) =>
          sum + stock.quantity * toNumber(stock.product.sellingPrice),
        0,
      );
      const orderStatusCounts = orderGroups.reduce<Record<string, number>>(
        (acc, group) => {
          acc[group.status] = group._count._all;
          return acc;
        },
        {},
      );
      const paymentBreakdown = todaySales.reduce<Record<string, number>>(
        (acc, sale) => {
          const key = sale.paymentType || 'Nomaʼlum';
          acc[key] = (acc[key] || 0) + toNumber(sale.totalAmount);
          return acc;
        },
        {},
      );
      const productMap = new Map<
        string,
        { productId: string; name: string; quantity: number; revenue: number }
      >();
      for (const sale of todaySales) {
        for (const item of sale.items) {
          const current = productMap.get(item.product.id) ?? {
            productId: item.product.id,
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
          current.quantity += item.quantity;
          current.revenue += toNumber(item.lineTotal);
          productMap.set(item.product.id, current);
        }
      }
      const topProductsToday = [...productMap.values()]
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 6);
      const lowStockCount = stockRows.filter(
        (stock) => stock.quantity <= stock.reorderLevel,
      ).length;

      return reply.send({
        data: {
          totalRevenueToday,
          salesCountToday: todaySales.length,
          totalItemsSoldToday,
          averageCheckToday:
            todaySales.length > 0 ? totalRevenueToday / todaySales.length : 0,
          grossProfitToday,
          inventoryValue,
          inventoryRetailValue,
          productsCount,
          lowStockCount,
          activeOrders:
            (orderStatusCounts.PENDING || 0) + (orderStatusCounts.APPROVED || 0),
          pendingOrders: orderStatusCounts.PENDING || 0,
          approvedOrders: orderStatusCounts.APPROVED || 0,
          rejectedOrders: orderStatusCounts.REJECTED || 0,
          totalOnlineOrders: Object.values(orderStatusCounts).reduce(
            (sum, count) => sum + count,
            0,
          ),
          paymentBreakdown,
          topProductsToday,
          expiringSoon: expiringStocks.map((stock) => ({
            stockId: stock.id,
            productId: stock.product.id,
            productName: stock.product.name,
            barcode: stock.product.barcode,
            batchNumber: stock.batchNumber,
            quantity: stock.quantity,
            reorderLevel: stock.reorderLevel,
            expiryDate: stock.expiryDate,
          })),
        },
      });
    },
  );
};
