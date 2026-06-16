import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuditLog } from '../services/audit';
import { deleteProductImageByPath, deleteProductImageByUrl, ProductImageError, saveProductImage } from '../services/product-images';
import { successResponse } from '../utils/http';

const adParamsSchema = z.object({ id: z.string().uuid() });

const adQuerySchema = z.object({
  placement: z.string().trim().max(80).optional(),
  activeOnly: z.coerce.boolean().default(true),
});

const adBodySchema = z.object({
  title: z.string().trim().min(2).max(160),
  text: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  targetUrl: z.string().trim().max(500).optional().nullable(),
  placement: z.string().trim().min(2).max(80).default('HOME_HERO'),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

const adUpdateSchema = adBodySchema.partial();

const advertisementsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/advertisements', async (request, reply) => {
    const parsed = adQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid advertisement query.', statusCode: 400, details: parsed.error.flatten() });

    const now = new Date();
    const ads = await fastify.prisma.advertisement.findMany({
      where: {
        ...(parsed.data.placement ? { placement: parsed.data.placement } : {}),
        ...(parsed.data.activeOnly ? { isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
    }).catch((error: unknown) => {
      fastify.log.warn({ error }, 'Advertisements table is not ready; returning empty list.');
      return [];
    });

    return reply.send(successResponse('Advertisements fetched successfully.', ads));
  });

  fastify.post('/advertisements', { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] }, async (request, reply) => {
    const parsed = adBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid advertisement payload.', statusCode: 400, details: parsed.error.flatten() });

    const ad = await fastify.prisma.advertisement.create({
      data: { ...parsed.data, startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null, endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null },
    });

    await createAuditLog(fastify, request, { action: 'ADVERTISEMENT_CREATED', entityType: 'Advertisement', entityId: ad.id, metadata: { title: ad.title, placement: ad.placement } });
    return reply.code(201).send(successResponse('Advertisement created successfully.', ad));
  });

  fastify.patch('/advertisements/:id', { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] }, async (request, reply) => {
    const parsedParams = adParamsSchema.safeParse(request.params);
    const parsedBody = adUpdateSchema.safeParse(request.body);
    if (!parsedParams.success || !parsedBody.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid advertisement update payload.', statusCode: 400 });

    const existing = await fastify.prisma.advertisement.findUnique({ where: { id: parsedParams.data.id } });
    if (!existing) return reply.code(404).send({ error: 'Not Found', message: 'Advertisement not found.', statusCode: 404 });

    const ad = await fastify.prisma.advertisement.update({
      where: { id: existing.id },
      data: {
        ...parsedBody.data,
        startsAt: parsedBody.data.startsAt === undefined ? undefined : parsedBody.data.startsAt ? new Date(parsedBody.data.startsAt) : null,
        endsAt: parsedBody.data.endsAt === undefined ? undefined : parsedBody.data.endsAt ? new Date(parsedBody.data.endsAt) : null,
      },
    });

    if (parsedBody.data.imageUrl !== undefined && parsedBody.data.imageUrl !== existing.imageUrl) {
      await deleteProductImageByUrl(existing.imageUrl);
    }

    await createAuditLog(fastify, request, { action: 'ADVERTISEMENT_UPDATED', entityType: 'Advertisement', entityId: ad.id, metadata: { title: ad.title, placement: ad.placement } });
    return reply.send(successResponse('Advertisement updated successfully.', ad));
  });

  fastify.delete('/advertisements/:id', { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] }, async (request, reply) => {
    const parsed = adParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid advertisement id.', statusCode: 400 });

    const ad = await fastify.prisma.advertisement.delete({ where: { id: parsed.data.id } }).catch(() => null);
    if (!ad) return reply.code(404).send({ error: 'Not Found', message: 'Advertisement not found.', statusCode: 404 });

    await deleteProductImageByUrl(ad.imageUrl);
    await createAuditLog(fastify, request, { action: 'ADVERTISEMENT_DELETED', entityType: 'Advertisement', entityId: ad.id, metadata: { title: ad.title, placement: ad.placement } });
    return reply.send(successResponse('Advertisement deleted successfully.', ad));
  });

  fastify.post('/advertisements/:id/image', { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] }, async (request, reply) => {
    const parsed = adParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid advertisement id.', statusCode: 400 });

    const existing = await fastify.prisma.advertisement.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return reply.code(404).send({ error: 'Not Found', message: 'Advertisement not found.', statusCode: 404 });

    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Bad Request', message: 'Image file is required in multipart form-data.', statusCode: 400 });

    let uploadedImage: { imageUrl: string; imagePath: string } | null = null;
    try {
      uploadedImage = await saveProductImage(file);
      const ad = await fastify.prisma.advertisement.update({ where: { id: existing.id }, data: { imageUrl: uploadedImage.imageUrl } });
      await deleteProductImageByUrl(existing.imageUrl);
      await createAuditLog(fastify, request, { action: 'ADVERTISEMENT_IMAGE_UPLOADED', entityType: 'Advertisement', entityId: ad.id, metadata: { imageUrl: ad.imageUrl } });
      return reply.send(successResponse('Advertisement image uploaded successfully.', ad));
    } catch (error) {
      await deleteProductImageByPath(uploadedImage?.imagePath);
      if (error instanceof ProductImageError) return reply.code(error.statusCode).send({ error: 'Bad Request', message: error.message, statusCode: error.statusCode });
      throw error;
    }
  });
};

export default advertisementsRoutes;
