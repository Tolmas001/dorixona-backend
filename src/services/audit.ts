import type { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';

type AuditPayload = {
  action: string;
  entityType: string;
  entityId?: string | null;
  pharmacyId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export const createAuditLog = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  payload: AuditPayload,
): Promise<void> => {
  const actorId = request.user?.userId ?? null;

  await fastify.prisma.auditLog.create({
    data: {
      actorId,
      pharmacyId: payload.pharmacyId ?? request.user?.pharmacyId ?? null,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId ?? null,
      metadata: payload.metadata,
    },
  });
};
