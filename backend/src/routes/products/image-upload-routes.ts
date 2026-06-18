import type { FastifyInstance } from 'fastify';
import { createAuditLog } from '../../services/audit';
import {
  deleteProductImageByPath,
  deleteProductImageByUrl,
  ProductImageError,
  saveProductImage,
} from '../../services/product-images';
import {
  getPharmacyIdOrReply,
  parseUuidParams,
  toProductResponse,
  uploadProductImageSwaggerSchema,
  type ProductParams,
} from './shared';

export const registerProductImageUploadRoutes = (
  fastify: FastifyInstance,
): void => {
  fastify.post<{ Params: ProductParams }>(
    '/products/:id/image',
    {
      schema: uploadProductImageSwaggerSchema,
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
        include: {
          stocks: { where: { pharmacyId }, orderBy: [{ expiryDate: 'asc' }] },
        },
      });
      if (!existingProduct) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found.',
          statusCode: 404,
        });
      }

      const file = await request.file();
      if (!file) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Image file is required in multipart form-data.',
          statusCode: 400,
        });
      }

      let uploadedImage:
        | { imageUrl: string; imagePath: string }
        | null = null;

      try {
        uploadedImage = await saveProductImage(file);

        const updatedProduct = await fastify.prisma.product.update({
          where: { id: existingProduct.id },
          data: { imageUrl: uploadedImage.imageUrl },
          include: {
            stocks: { where: { pharmacyId }, orderBy: [{ expiryDate: 'asc' }] },
          },
        });

        await deleteProductImageByUrl(existingProduct.imageUrl);

        await createAuditLog(fastify, request, {
          action: 'PRODUCT_IMAGE_UPLOADED',
          entityType: 'Product',
          entityId: updatedProduct.id,
          pharmacyId,
          metadata: { imageUrl: updatedProduct.imageUrl },
        });

        return reply.send({
          message: 'Product image uploaded successfully.',
          data: toProductResponse(updatedProduct),
        });
      } catch (error) {
        await deleteProductImageByPath(uploadedImage?.imagePath);

        if (error instanceof ProductImageError) {
          return reply.code(error.statusCode).send({
            error: 'Bad Request',
            message: error.message,
            statusCode: error.statusCode,
          });
        }

        throw error;
      }
    },
  );
};
