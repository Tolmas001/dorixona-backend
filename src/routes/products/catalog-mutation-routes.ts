import type { FastifyInstance } from 'fastify';
import { createAuditLog } from '../../services/audit';
import { deleteProductImageByUrl } from '../../services/product-images';
import {
  createProductBodySchema,
  createProductSwaggerSchema,
  getPharmacyIdOrReply,
  parseUuidParams,
  toProductResponse,
  updateProductBodySchema,
  updateProductSwaggerSchema,
  type CreateProductBody,
  type ProductParams,
  type UpdateProductBody,
} from './shared';

export const registerProductCatalogMutationRoutes = (
  fastify: FastifyInstance,
): void => {
  fastify.post<{ Body: CreateProductBody }>(
    '/products',
    {
      schema: createProductSwaggerSchema,
      preHandler: [
        fastify.authenticate as never,
        fastify.checkRole(['OWNER', 'ADMIN']),
      ],
    },
    async (request, reply) => {
      const parsedBody = createProductBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid product payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const {
        name,
        sku,
        barcode,
        purchasePrice,
        sellingPrice,
        manufacturer,
        expiryDate,
        stockBatches,
      } = parsedBody.data;
      if (sellingPrice < purchasePrice) {
        return reply.code(400).send({
          error: 'Bad Request',
          message:
            'Selling price must be greater than or equal to purchase price.',
          statusCode: 400,
        });
      }

      const existingProduct = await fastify.prisma.product.findUnique({
        where: { barcode },
        select: { id: true },
      });
      if (existingProduct) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'A product with this barcode already exists.',
          statusCode: 409,
        });
      }

      const pharmacyId = getPharmacyIdOrReply(request, reply);
      if (!pharmacyId) return;

      const product = await fastify.prisma.product.create({
        data: {
          name,
          sku: sku ?? null,
          barcode,
          imageUrl: parsedBody.data.imageUrl ?? null,
          purchasePrice,
          sellingPrice,
          manufacturer: manufacturer ?? null,
          expiryDate: expiryDate ?? stockBatches[0].expiryDate,
          stocks: {
            create: stockBatches.map((batch) => ({
              pharmacyId,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              reorderLevel: batch.reorderLevel,
              expiryDate: batch.expiryDate,
            })),
          },
        },
        include: { stocks: { orderBy: [{ expiryDate: 'asc' }] } },
      });

      await createAuditLog(fastify, request, {
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: product.id,
        pharmacyId,
        metadata: { barcode: product.barcode, name: product.name },
      });

      return reply.code(201).send({
        message: 'Product created successfully.',
        data: toProductResponse(product),
      });
    },
  );

  fastify.put<{ Params: ProductParams; Body: UpdateProductBody }>(
    '/products/:id',
    {
      schema: updateProductSwaggerSchema,
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

      const parsedBody = updateProductBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid product payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const productId = parsedParams.data.id;
      const updateData = parsedBody.data;
      const pharmacyId = getPharmacyIdOrReply(request, reply);
      if (!pharmacyId) return;

      const existingProduct = await fastify.prisma.product.findFirst({
        where: {
          id: productId,
          stocks: { some: { pharmacyId } },
        },
        include: { stocks: { where: { pharmacyId } } },
      });
      if (!existingProduct) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found.',
          statusCode: 404,
        });
      }

      const nextPurchasePrice =
        updateData.purchasePrice ?? Number(existingProduct.purchasePrice);
      const nextSellingPrice =
        updateData.sellingPrice ?? Number(existingProduct.sellingPrice);
      if (nextSellingPrice < nextPurchasePrice) {
        return reply.code(400).send({
          error: 'Bad Request',
          message:
            'Selling price must be greater than or equal to purchase price.',
          statusCode: 400,
        });
      }

      if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
        const barcodeConflict = await fastify.prisma.product.findUnique({
          where: { barcode: updateData.barcode },
          select: { id: true },
        });
        if (barcodeConflict) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'A product with this barcode already exists.',
            statusCode: 409,
          });
        }
      }

      if (updateData.stockBatches) {
        await fastify.prisma.stock.deleteMany({ where: { productId, pharmacyId } });
        if (updateData.stockBatches.length > 0) {
          await fastify.prisma.stock.createMany({
            data: updateData.stockBatches.map((batch) => ({
              pharmacyId,
              productId,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              reorderLevel: batch.reorderLevel,
              expiryDate: batch.expiryDate,
            })),
          });
        }
      }

      const updatedProduct = await fastify.prisma.product.update({
        where: { id: productId },
        data: {
          name: updateData.name,
          sku: updateData.sku === undefined ? undefined : updateData.sku,
          barcode: updateData.barcode,
          imageUrl:
            updateData.imageUrl === undefined ? undefined : updateData.imageUrl,
          purchasePrice: updateData.purchasePrice,
          sellingPrice: updateData.sellingPrice,
          manufacturer:
            updateData.manufacturer === undefined
              ? undefined
              : updateData.manufacturer,
          expiryDate:
            updateData.expiryDate ??
            updateData.stockBatches?.[0]?.expiryDate ??
            existingProduct.expiryDate,
        },
        include: {
          stocks: { where: { pharmacyId }, orderBy: [{ expiryDate: 'asc' }] },
        },
      });

      if (
        updateData.imageUrl !== undefined &&
        updateData.imageUrl !== existingProduct.imageUrl
      ) {
        await deleteProductImageByUrl(existingProduct.imageUrl);
      }

      await createAuditLog(fastify, request, {
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: updatedProduct.id,
        pharmacyId,
        metadata: { barcode: updatedProduct.barcode, name: updatedProduct.name },
      });

      return reply.send({
        message: 'Product updated successfully.',
        data: toProductResponse(updatedProduct),
      });
    },
  );
};
