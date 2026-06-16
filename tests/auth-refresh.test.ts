import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authRoutes from '../src/routes/auth';
import configPlugin from '../src/plugins/config';
import { hashPassword } from '../src/services/password';

describe('/auth/refresh', () => {
  let app: Awaited<ReturnType<typeof Fastify>>;
  let validRefreshToken: string;

  beforeEach(async () => {
    app = Fastify();
    await app.register(configPlugin);
    await app.register(cookie);
    await app.register(jwt, {
      secret: app.config.JWT_SECRET,
    });

    validRefreshToken = app.jwt.sign(
      {
        userId: 'user-1',
        role: 'CUSTOMER',
        pharmacyId: null,
      },
      { expiresIn: '7d' },
    );

    const storedRefreshTokenHash = await hashPassword(validRefreshToken);
    const user = {
      id: 'user-1',
      username: 'ali',
      email: 'ali@example.com',
      password: null,
      full_name: 'Ali',
      tel_number: '+998901234567',
      age: 21,
      role: 'CUSTOMER' as const,
      pharmacy_id: null,
      google_id: null,
      refresh_token_hash: storedRefreshTokenHash,
      created_at: new Date(),
      updated_at: new Date(),
    };

    app.decorate('prisma', {
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(user),
      },
    });
    app.decorate('authenticate', async () => {});

    await app.register(authRoutes);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rotates refresh tokens and returns a new token pair', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken: validRefreshToken,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: 'Tokens refreshed successfully.',
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        id: 'user-1',
        username: 'ali',
        email: 'ali@example.com',
      },
    });
  });
});
