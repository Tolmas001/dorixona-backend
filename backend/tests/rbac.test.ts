import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import rbacPlugin from '../src/plugins/rbac';

describe('rbac plugin', () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('allows access when the role is permitted', async () => {
    app = Fastify();
    await app.register(rbacPlugin);

    app.get(
      '/owner-only',
      {
        preHandler: [
          async (request) => {
            request.user = { userId: 'user-1', role: 'OWNER' };
          },
          app.checkRole(['OWNER']),
        ],
      },
      async () => ({ ok: true }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/owner-only',
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 403 when the role is not permitted', async () => {
    app = Fastify();
    await app.register(rbacPlugin);

    app.get(
      '/owner-only',
      {
        preHandler: [
          async (request) => {
            request.user = { userId: 'user-2', role: 'SELLER' };
          },
          app.checkRole(['OWNER']),
        ],
      },
      async () => ({ ok: true }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/owner-only',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    });
  });
});
