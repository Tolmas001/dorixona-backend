import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuditLog } from '../services/audit';
import { successResponse } from '../utils/http';

const billingPlanSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(60).toUpperCase(),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().nonnegative(),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']),
  maxUsers: z.coerce.number().int().positive().optional(),
  maxPharmacies: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const idParamsSchema = z.object({ id: z.string().uuid() });

const billingPlanRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/billing/plans',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN', 'OWNER', 'ADMIN'])] },
    async (_request, reply) => {
      const plans = await fastify.prisma.billingPlan.findMany({ orderBy: [{ price: 'asc' }] });
      return reply.send(successResponse('Billing plans fetched successfully.', plans));
    },
  );

  fastify.post(
    '/billing/plans',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const parsed = billingPlanSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid billing plan payload.', statusCode: 400, details: parsed.error.flatten() });
      }

      const plan = await fastify.prisma.billingPlan.create({ data: { ...parsed.data, price: parsed.data.price } }).catch(() => null);
      if (!plan) return reply.code(409).send({ error: 'Conflict', message: 'A billing plan with this name or code already exists.', statusCode: 409 });

      await createAuditLog(fastify, request, { action: 'BILLING_PLAN_CREATED', entityType: 'BillingPlan', entityId: plan.id, metadata: { code: plan.code, name: plan.name } });
      return reply.code(201).send(successResponse('Billing plan created successfully.', plan));
    },
  );

  fastify.patch(
    '/billing/plans/:id',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const parsedParams = idParamsSchema.safeParse(request.params);
      const parsedBody = billingPlanSchema.partial().safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid billing plan update payload.', statusCode: 400 });
      }

      const plan = await fastify.prisma.billingPlan.update({ where: { id: parsedParams.data.id }, data: parsedBody.data }).catch(() => null);
      if (!plan) return reply.code(404).send({ error: 'Not Found', message: 'Billing plan not found.', statusCode: 404 });

      await createAuditLog(fastify, request, { action: 'BILLING_PLAN_UPDATED', entityType: 'BillingPlan', entityId: plan.id, metadata: { code: plan.code, name: plan.name } });
      return reply.send(successResponse('Billing plan updated successfully.', plan));
    },
  );

  fastify.delete(
    '/billing/plans/:id',
    { preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid billing plan id.', statusCode: 400 });

      const subscriptionCount = await fastify.prisma.pharmacySubscription.count({ where: { planId: parsedParams.data.id } });
      const plan = subscriptionCount > 0
        ? await fastify.prisma.billingPlan.update({ where: { id: parsedParams.data.id }, data: { isActive: false } }).catch(() => null)
        : await fastify.prisma.billingPlan.delete({ where: { id: parsedParams.data.id } }).catch(() => null);

      if (!plan) return reply.code(404).send({ error: 'Not Found', message: 'Billing plan not found.', statusCode: 404 });

      await createAuditLog(fastify, request, { action: subscriptionCount > 0 ? 'BILLING_PLAN_DISABLED' : 'BILLING_PLAN_DELETED', entityType: 'BillingPlan', entityId: plan.id, metadata: { code: plan.code, name: plan.name } });
      return reply.send(successResponse('Billing plan removed successfully.', plan));
    },
  );
};

export default billingPlanRoutes;