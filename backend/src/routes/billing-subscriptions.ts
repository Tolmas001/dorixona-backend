import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuditLog } from '../services/audit';
import { successResponse } from '../utils/http';

const assignPlanSchema = z.object({
  pharmacyId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIAL']).default('ACTIVE'),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  autoRenew: z.boolean().default(true),
});

const idParamsSchema = z.object({ id: z.string().uuid() });

const updateSubscriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIAL']).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  autoRenew: z.boolean().optional(),
});

const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/billing/subscriptions',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN', 'OWNER', 'ADMIN'])] },
    async (request, reply) => {
      const role = request.user?.role;
      const pharmacyId = request.user?.pharmacyId;
      const subscriptions = await fastify.prisma.pharmacySubscription.findMany({
        where: role === 'SUPER_ADMIN' ? {} : { pharmacyId: pharmacyId ?? '' },
        include: {
          pharmacy: { select: { id: true, name: true, licenseNumber: true } },
          plan: { select: { id: true, name: true, code: true, price: true, billingInterval: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      });
      return reply.send(successResponse('Subscriptions fetched successfully.', subscriptions));
    },
  );

  fastify.post(
    '/billing/subscriptions',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const parsed = assignPlanSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid subscription payload.', statusCode: 400, details: parsed.error.flatten() });
      }

      const subscription = await fastify.prisma.$transaction(async (tx) => {
        if (['ACTIVE', 'TRIAL'].includes(parsed.data.status)) {
          await tx.pharmacySubscription.updateMany({
            where: { pharmacyId: parsed.data.pharmacyId, status: { in: ['ACTIVE', 'TRIAL'] } },
            data: { status: 'CANCELED', endsAt: new Date(), autoRenew: false },
          });
        }
        return tx.pharmacySubscription.create({
          data: {
            pharmacyId: parsed.data.pharmacyId, planId: parsed.data.planId, status: parsed.data.status,
            startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date(),
            endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null, autoRenew: parsed.data.autoRenew,
          },
          include: { pharmacy: { select: { id: true, name: true } }, plan: { select: { id: true, name: true, code: true, price: true, billingInterval: true } } },
        });
      });

      await createAuditLog(fastify, request, { action: 'SUBSCRIPTION_ASSIGNED', entityType: 'PharmacySubscription', entityId: subscription.id, pharmacyId: subscription.pharmacyId, metadata: { planId: subscription.planId, status: subscription.status } });
      return reply.code(201).send(successResponse('Subscription assigned successfully.', subscription));
    },
  );

  fastify.patch(
    '/billing/subscriptions/:id',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const parsedParams = idParamsSchema.safeParse(request.params);
      const parsedBody = updateSubscriptionSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid subscription update payload.', statusCode: 400 });
      }

      const subscription = await fastify.prisma.pharmacySubscription.update({
        where: { id: parsedParams.data.id },
        data: {
          status: parsedBody.data.status,
          startsAt: !parsedBody.data.startsAt ? undefined : new Date(parsedBody.data.startsAt),
          endsAt: parsedBody.data.endsAt === undefined ? undefined : parsedBody.data.endsAt ? new Date(parsedBody.data.endsAt) : null,
          autoRenew: parsedBody.data.autoRenew,
        },
        include: { pharmacy: { select: { id: true, name: true } }, plan: { select: { id: true, name: true, code: true } } },
      }).catch(() => null);

      if (!subscription) return reply.code(404).send({ error: 'Not Found', message: 'Subscription not found.', statusCode: 404 });

      await createAuditLog(fastify, request, { action: 'SUBSCRIPTION_UPDATED', entityType: 'PharmacySubscription', entityId: subscription.id, pharmacyId: subscription.pharmacyId, metadata: { status: subscription.status, autoRenew: subscription.autoRenew } });
      return reply.send(successResponse('Subscription updated successfully.', subscription));
    },
  );
};

export default subscriptionRoutes;