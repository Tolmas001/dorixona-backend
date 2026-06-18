import type { FastifyInstance } from 'fastify';
import { createAuditLog } from '../../services/audit';
import { deleteProductImageByUrl } from '../../services/product-images';
import {
  addStockBatchBodySchema,
  addStockBatchSwaggerSchema,
  getPharmacyIdOrReply,
  parseUuidParams,
  type AddStockBatchBody,
  type ProductParams,
} from './shared';

export const registerProductStockMutationRoutes = (
  fastify: FastifyInstance,
): void => {
  fastify.delete<{ Params: ProductParams }>(
    '/products/:id',
    {
      preHandler: [
        fastify.authenticate as never,
        fastify.checkRole(['OWNER', 'ADMIN']),
      ],
    },
    async (request, reply) => {
      const parsedParams = parseUuidParams(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid product id.',
          statusCode: 400,
          details: parsedParams.error.flatten(),
        });
      }

      const pharmacyId = getPharmacyIdOrReply(request, reply);
      if (!pharmacyId) return;

      const existingProduct = await fastify.prisma.product.findFirst({
        where: {
          id: parsedParams.data.id,
          stocks: { some: { pharmacyId } },
        },
        include: { stocks: { where: { pharmacyId }, select: { id: true } } },
      });
      if (!existingProduct) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found.',
          statusCode: 404,
        });
      }

      await fastify.prisma.stock.deleteMany({
        where: { productId: parsedParams.data.id, pharmacyId },
      });

      const remainingStocks = await fastify.prisma.stock.findMany({
        where: { productId: parsedParams.data.id },
        select: { id: true },
      });
      if (remainingStocks.length === 0) {
        await deleteProductImageByUrl(existingProduct.imageUrl);
        await fastify.prisma.product.delete({ where: { id: parsedParams.data.id } });
      }

      await createAuditLog(fastify, request, {
        action: 'PRODUCT_DELETED',
        entityType: 'Product',
        entityId: parsedParams.data.id,
        pharmacyId,
      });

      return reply.send({ message: 'Product deleted successfully.' });
    },
  );

  fastify.post<{ Params: ProductParams; Body: AddStockBatchBody }>(
    '/products/:id/stock-batches',
    {
      schema: addStockBatchSwaggerSchema,
      preHandler: [
        fastify.authenticate as never,
        fastify.checkRole(['OWNER', 'ADMIN']),
      ],
    },
    async (request, reply) => {
      const parsedParams = parseUuidParams(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid product id.',
          statusCode: 400,
          details: parsedParams.error.flatten(),
        });
      }

      const parsedBody = addStockBatchBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid stock batch payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const pharmacyId = getPharmacyIdOrReply(request, reply);
      if (!pharmacyId) return;

      const product = await fastify.prisma.product.findFirst({
        where: {
          id: parsedParams.data.id,
          stocks: { some: { pharmacyId } },
        },
        select: { id: true },
      });
      if (!product) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found.',
          statusCode: 404,
        });
      }

      const batch = await fastify.prisma.stock.create({
        data: {
          pharmacyId,
          productId: parsedParams.data.id,
          batchNumber: parsedBody.data.batchNumber,
          quantity: parsedBody.data.quantity,
          reorderLevel: parsedBody.data.reorderLevel,
          expiryDate: parsedBody.data.expiryDate,
        },
      });

      await createAuditLog(fastify, request, {
        action: 'STOCK_BATCH_CREATED',
        entityType: 'Stock',
        entityId: batch.id,
        pharmacyId,
        metadata: {
          productId: parsedParams.data.id,
          batchNumber: batch.batchNumber,
        },
      });

      return reply.code(201).send({
        message: 'Stock batch added successfully.',
        data: batch,
      });
    },
  );
};
