import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import auditLogsRoutes from '../src/routes/audit-logs';

describe('/audit-logs', () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rejects non-super-admin users without a pharmacy scope', async () => {
    app = Fastify();
    const findMany = vi.fn();

    app.decorate('authenticate', async (request) => {
      request.user = { userId: 'user-1', role: 'ADMIN', pharmacyId: null };
    });
    app.decorate('checkRole', () => async () => {});
    app.decorate('prisma', {
      auditLog: { findMany },
    });

    await app.register(auditLogsRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/audit-logs',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: 'Bad Request',
      message: 'Admin account must be linked to a pharmacy to view audit logs.',
      statusCode: 400,
    });
    expect(findMany).not.toHaveBeenCalled();
  });
});
