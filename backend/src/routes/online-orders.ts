import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuditLog } from '../services/audit';

const orderItemSchema = z.object({
  productId: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
});

const createOnlineOrderSchema = z.object({
  pharmacyId: z.string().uuid().optional().nullable(),
  customerName: z.string().trim().min(2).max(150),
  customerPhone: z.string().trim().min(7).max(30).optional().nullable(),
  items: z.array(orderItemSchema).min(1),
});

const orderParamsSchema = z.object({ id: z.string().uuid() });

const rejectOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const onlineOrdersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/online-orders',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['CUSTOMER', 'SUPER_ADMIN', 'OWNER', 'ADMIN', 'SELLER'])],
    },
    async (request, reply) => {
      const parsed = createOnlineOrderSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid online order payload.',
          statusCode: 400,
          details: parsed.error.flatten(),
        });
      }

      const totalAmount = parsed.data.items.reduce((sum, item) => sum + item.total, 0);
      const order = await fastify.prisma.onlineOrder.create({
        data: {
          pharmacyId: parsed.data.pharmacyId ?? null,
          customerId: request.user?.userId ?? null,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone ?? null,
          totalAmount,
          items: parsed.data.items,
        },
      });

      await createAuditLog(fastify, request, {
        action: 'ONLINE_ORDER_CREATED',
        entityType: 'OnlineOrder',
        entityId: order.id,
        pharmacyId: order.pharmacyId,
        metadata: { totalAmount: Number(order.totalAmount) },
      });

      return reply.code(201).send({ data: order, message: 'Online order created successfully.' });
    },
  );

  fastify.get(
    '/online-orders',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN', 'OWNER', 'ADMIN', 'SELLER'])],
    },
    async (request, reply) => {
      const role = request.user?.role;
      const pharmacyId = request.user?.pharmacyId;
      const orders = await fastify.prisma.onlineOrder.findMany({
        where: role === 'SUPER_ADMIN' ? {} : { pharmacyId: pharmacyId ?? '' },
        include: {
          pharmacy: { select: { id: true, name: true, phone: true, address: true } },
          customer: { select: { id: true, full_name: true, email: true, tel_number: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
      });

      return reply.send({ data: orders });
    },
  );

  fastify.patch(
    '/online-orders/:id/approve',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN', 'OWNER', 'ADMIN', 'SELLER'])],
    },
    async (request, reply) => {
      const parsed = orderParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid order id.', statusCode: 400 });
      }

      const order = await fastify.prisma.onlineOrder.update({
        where: { id: parsed.data.id },
        data: { status: 'APPROVED' },
      }).catch(() => null);
      if (!order) return reply.code(404).send({ error: 'Not Found', message: 'Online order not found.', statusCode: 404 });

      await createAuditLog(fastify, request, {
        action: 'ONLINE_ORDER_APPROVED',
        entityType: 'OnlineOrder',
        entityId: order.id,
        pharmacyId: order.pharmacyId,
      });

      return reply.send({ data: order, message: 'Online order approved successfully.' });
    },
  );

  fastify.patch(
    '/online-orders/:id/reject',
    {
      preHandler: [fastify.authenticate as never, fastify.checkRole(['SUPER_ADMIN', 'OWNER', 'ADMIN', 'SELLER'])],
    },
    async (request, reply) => {
      const parsedParams = orderParamsSchema.safeParse(request.params);
      const parsedBody = rejectOrderSchema.safeParse(request.body ?? {});
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid order rejection payload.', statusCode: 400 });
      }

      const order = await fastify.prisma.onlineOrder.update({
        where: { id: parsedParams.data.id },
        data: { status: 'REJECTED', rejectedReason: parsedBody.data.reason ?? null },
      }).catch(() => null);
      if (!order) return reply.code(404).send({ error: 'Not Found', message: 'Online order not found.', statusCode: 404 });

      await createAuditLog(fastify, request, {
        action: 'ONLINE_ORDER_REJECTED',
        entityType: 'OnlineOrder',
        entityId: order.id,
        pharmacyId: order.pharmacyId,
      });

      return reply.send({ data: order, message: 'Online order rejected successfully.' });
    },
  );
};

export default onlineOrdersRoutes;
