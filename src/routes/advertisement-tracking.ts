import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { successResponse } from '../utils/http';

const adParamsSchema = z.object({ id: z.string().uuid() });

const advertisementTrackingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/advertisements/:id/view', async (request, reply) => {
    const parsed = adParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid advertisement id.', statusCode: 400 });

    const ad = await fastify.prisma.advertisement.update({
      where: { id: parsed.data.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => null);

    if (!ad) return reply.code(404).send({ error: 'Not Found', message: 'Advertisement not found.', statusCode: 404 });
    return reply.send(successResponse('Advertisement view tracked successfully.', ad));
  });

  fastify.post('/advertisements/:id/click', async (request, reply) => {
    const parsed = adParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid advertisement id.', statusCode: 400 });

    const ad = await fastify.prisma.advertisement.update({
      where: { id: parsed.data.id },
      data: { clickCount: { increment: 1 } },
    }).catch(() => null);

    if (!ad) return reply.code(404).send({ error: 'Not Found', message: 'Advertisement not found.', statusCode: 404 });
    return reply.send(successResponse('Advertisement click tracked successfully.', ad));
  });
};

export default advertisementTrackingRoutes;