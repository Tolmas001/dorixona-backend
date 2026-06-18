import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuditLog } from '../services/audit';
import { successResponse } from '../utils/http';

const settingsBodySchema = z.object({
  settings: z.record(z.string().trim().min(1).max(120), z.string().max(2000)),
});

const defaultSettings = {
  siteName: 'Dorixona',
  supportPhone: '+998 90 123 45 67',
  telegram: '@dorixona_support',
  instagram: '@dorixona',
  minimalStockWarning: '20',
  prescriptionKeywords: 'antibiotik,amox,amoks,retsept,cef,azitro',
};

const platformSettingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/platform-settings', async (_request, reply) => {
    try {
      const rows = await fastify.prisma.platformSetting.findMany({
        orderBy: [{ key: 'asc' }],
      });
      const settings = { ...defaultSettings };
      for (const row of rows) settings[row.key as keyof typeof settings] = row.value;
      return reply.send(successResponse('Platform settings fetched successfully.', settings));
    } catch (error) {
      fastify.log.warn({ error }, 'Platform settings table is not ready; returning defaults.');
      return reply.send(successResponse('Platform settings defaults returned.', defaultSettings));
    }
  });

  fastify.put(
    '/platform-settings',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parsed = settingsBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid platform settings payload.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const settings = parsed.data.settings;
      try {
        await fastify.prisma.$transaction(
          Object.entries(settings).map(([key, value]) =>
            fastify.prisma.platformSetting.upsert({
              where: { key },
              create: { key, value },
              update: { value },
            }),
          ),
        );
      } catch (error) {
        fastify.log.error({ error }, 'Platform settings migration is missing.');
        return reply.code(503).send({
          error: 'Service Unavailable',
          message: 'Platform settings table is not ready. Run Prisma migrations first.',
          statusCode: 503,
        });
      }

      await createAuditLog(fastify, request, {
        action: 'PLATFORM_SETTINGS_UPDATED',
        entityType: 'PlatformSetting',
        metadata: settings,
      });

      return reply.send(successResponse('Platform settings updated successfully.', settings));
    },
  );
};

export default platformSettingsRoutes;
