import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createAuditLog } from '../../services/audit';
import {
  createSaleBodySchema,
  createSaleSwaggerSchema,
  SalesRouteError,
  toNumber,
  type CreateSaleBody,
  type StockBatch,
} from './shared';

export const registerCreateSaleRoute = (fastify: FastifyInstance): void => {
  const createSale = async (
    request: FastifyRequest<{ Body: CreateSaleBody }>,
    reply: FastifyReply,
    overrideSellerId?: string,
  ) => {
    const parsedBody = createSaleBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid sale payload.',
        statusCode: 400,
        details: parsedBody.error.flatten(),
      });
    }

    const pharmacyId = request.user?.pharmacyId;
    const sellerId = overrideSellerId ?? request.user?.userId;
    if (!pharmacyId || !sellerId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message:
          'Authenticated user must belong to a pharmacy to create sales.',
        statusCode: 400,
      });
    }

    const { items, notes, paymentType, discountPercent, discountAmount } = parsedBody.data;

    try {
      const sale = await fastify.prisma.$transaction(async (tx) => {
        const productIds = items.map((item) => item.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            barcode: true,
            sellingPrice: true,
          },
        });

        if (products.length !== productIds.length) {
          throw new SalesRouteError(404, 'One or more products were not found.');
        }

        const stocks = await tx.stock.findMany({
          where: {
            pharmacyId,
            productId: { in: productIds },
            quantity: { gt: 0 },
          },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        });

        const stockByProduct = new Map<string, StockBatch[]>();
        for (const stock of stocks) {
          const list = stockByProduct.get(stock.productId) ?? [];
          list.push({ ...stock });
          stockByProduct.set(stock.productId, list);
        }

        const productById = new Map(products.map((product) => [product.id, product]));
        const saleItemsData: Array<{
          productId: string;
          quantity: number;
          unitPrice: number;
          lineTotal: number;
        }> = [];
        const stockUpdates: Array<Promise<unknown>> = [];

        for (const item of items) {
          const batches = stockByProduct.get(item.productId) ?? [];
          const availableQuantity = batches.reduce(
            (sum, batch) => sum + batch.quantity,
            0,
          );

          if (availableQuantity < item.quantity) {
            const product = productById.get(item.productId);
            throw new SalesRouteError(
              400,
              `Insufficient stock for ${product?.name ?? 'the requested product'}. Available: ${availableQuantity}, requested: ${item.quantity}.`,
            );
          }

          const product = productById.get(item.productId);
          const unitPrice = toNumber(product!.sellingPrice);
          let remaining = item.quantity;

          for (const batch of batches) {
            if (remaining === 0) break;

            const deducted = Math.min(batch.quantity, remaining);
            batch.quantity -= deducted;
            remaining -= deducted;
            stockUpdates.push(
              tx.stock.update({
                where: { id: batch.id },
                data: { quantity: batch.quantity },
              }),
            );
          }

          saleItemsData.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
          });
        }

        await Promise.all(stockUpdates);

        const subtotal = saleItemsData.reduce(
          (sum, item) => sum + item.lineTotal,
          0,
        );
        const resolvedDiscountAmount = Math.min(
          subtotal,
          discountAmount || Math.round((subtotal * discountPercent) / 100),
        );

        return tx.sale.create({
          data: {
            pharmacyId,
            sellerId,
            totalAmount: Math.max(0, subtotal - resolvedDiscountAmount),
            paymentType,
            discountPercent,
            discountAmount: resolvedDiscountAmount,
            notes: notes ?? null,
            items: {
              create: saleItemsData.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, barcode: true },
                },
              },
            },
          },
        });
      });

      await createAuditLog(fastify, request, {
        action: 'SALE_CREATED',
        entityType: 'Sale',
        entityId: sale.id,
        pharmacyId,
        metadata: {
          sellerId,
          totalAmount: Number(sale.totalAmount),
          itemsCount: sale.items.length,
          paymentType: sale.paymentType,
          discountPercent: Number(sale.discountPercent),
          discountAmount: Number(sale.discountAmount),
        },
      });

      return reply.code(201).send({
        message: 'Sale created successfully.',
        data: sale,
      });
    } catch (error) {
      if (error instanceof SalesRouteError) {
        return reply.code(error.statusCode).send({
          error: error.statusCode === 404 ? 'Not Found' : 'Bad Request',
          message: error.message,
          statusCode: error.statusCode,
        });
      }

      throw error;
    }
  };

  fastify.post<{ Body: CreateSaleBody }>(
    '/sales',
    {
      schema: createSaleSwaggerSchema,
      preHandler: [
        fastify.authenticate as never,
        fastify.checkRole(['OWNER', 'ADMIN', 'SELLER']),
      ],
    },
    createSale,
  );
};
