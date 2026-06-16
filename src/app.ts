import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import authenticatePlugin from './plugins/authenticate';
import configPlugin from './plugins/config';
import prismaPlugin from './plugins/prisma';
import rbacPlugin from './plugins/rbac';
import authRoutes from './routes/auth';
import advertisementsRoutes from './routes/advertisements';
import advertisementTrackingRoutes from './routes/advertisement-tracking';
import auditLogsRoutes from './routes/audit-logs';
import billingPlanRoutes from './routes/billing-plans';
import billingSubscriptionRoutes from './routes/billing-subscriptions';
import dashboardRoutes from './routes/dashboard';
import productsRoutes from './routes/products';
import onlineOrdersRoutes from './routes/online-orders';
import platformSettingsRoutes from './routes/platform-settings';
import reportsRoutes from './routes/reports';
import salesRoutes from './routes/sales';
import superAdminRoutes from './routes/super-admin';
import usersRoutes from './routes/users';
import { errorResponse, successResponse } from './utils/http';

const isDatabaseConnectionError = (error: unknown): boolean => {
  const candidate = error as { code?: string; name?: string; message?: string };

  return (
    candidate.code === 'P1001' ||
    candidate.name === 'PrismaClientInitializationError' ||
    /can't reach database server|connect ECONNREFUSED|connection refused/i.test(candidate.message ?? '')
  );
};

const isDatabaseSchemaError = (error: unknown): boolean => {
  const candidate = error as { code?: string; message?: string };

  return (
    candidate.code === 'P2022' ||
    /column .* does not exist|table .* does not exist|relation .* does not exist/i.test(candidate.message ?? '')
  );
};

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: true,
  });

  await app.register(configPlugin);

  await app.register(cookie, {
    secret: app.config.COOKIE_SECRET,
    hook: 'onRequest',
  });

  await app.register(jwt, {
    secret: app.config.JWT_SECRET,
  });

  await app.register(rateLimit, {
    global: false,
    enableDraftSpec: true,
    skipOnError: false,
  });

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024,
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Dorixona Backend API',
        description: 'Fastify + TypeScript + Prisma backend for pharmacy management.',
        version: '1.0.0',
      },
      servers: [
        {
          url: app.config.APP_BASE_URL,
          description: 'Current application server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) =>
      header.replace("style-src 'self' https:", "style-src 'self' 'unsafe-inline' https:"),
  });

  const uploadsRoot = resolve(process.cwd(), 'uploads');
  await mkdir(uploadsRoot, { recursive: true });

  await app.register(staticPlugin, {
    root: uploadsRoot,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(prismaPlugin);
  await app.register(authenticatePlugin);
  await app.register(rbacPlugin);

  const publicRoutes = new Set([
    '/',
    '/health',
    '/api/health',
    '/auth/register',
    '/auth/login',
    '/auth/google',
    '/auth/refresh',
    '/auth/verify-otp',
    '/auth/resend-otp',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/google',
    '/api/auth/refresh',
    '/api/auth/verify-otp',
    '/api/auth/resend-otp',
  ]);

  app.addHook('onRoute', (routeOptions) => {
    const isStaticOrDocsRoute =
      routeOptions.url.startsWith('/docs') ||
      routeOptions.url.startsWith('/uploads/');

    if (publicRoutes.has(routeOptions.url) || isStaticOrDocsRoute) {
      return;
    }

    routeOptions.schema = {
      ...(routeOptions.schema ?? {}),
      security: routeOptions.schema?.security ?? [{ bearerAuth: [] }],
    };
  });

  app.get('/', async (_request, reply) => {
    return reply.redirect('/health');
  });

  app.get('/health', async (_request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      app.log.error({ err: error }, 'Database health check failed');
      return reply.code(503).send(
        errorResponse(
          503,
          'Database Unavailable',
          'PostgreSQL database is not reachable. Start PostgreSQL and run Prisma migrations.',
        ),
      );
    }

    return successResponse('Service is healthy.', {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  const apiRoutes: FastifyPluginAsync = async (instance) => {
    await instance.register(authRoutes);
    await instance.register(advertisementsRoutes);
    await instance.register(advertisementTrackingRoutes);
    await instance.register(usersRoutes);
    await instance.register(productsRoutes);
    await instance.register(salesRoutes);
    await instance.register(onlineOrdersRoutes);
    await instance.register(platformSettingsRoutes);
    await instance.register(dashboardRoutes);
    await instance.register(reportsRoutes);
    await instance.register(auditLogsRoutes);
    await instance.register(billingPlanRoutes);
    await instance.register(billingSubscriptionRoutes);
    await instance.register(superAdminRoutes);
  };

  await app.register(apiRoutes);
  await app.register(apiRoutes, { prefix: '/api' });
  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send(
      errorResponse(404, 'Not Found', 'The requested resource was not found.'),
    );
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if (reply.sent) {
      return;
    }

    if (isDatabaseConnectionError(error)) {
      return reply
        .code(503)
        .send(
          errorResponse(
            503,
            'Database Unavailable',
            'PostgreSQL database is not reachable. Start PostgreSQL on the configured DATABASE_URL port.',
          ),
        );
    }

    if (isDatabaseSchemaError(error)) {
      return reply
        .code(500)
        .send(
          errorResponse(
            500,
            'Database Schema Error',
            'Database schema is not up to date. Run Prisma migrations before using the server.',
          ),
        );
    }

    const appError = error as Partial<Error> & { statusCode?: number };
    const statusCode = appError.statusCode ?? 500;
    const errorName = appError.name || 'Internal Server Error';
    const message = appError.message || 'Something went wrong.';

    return reply
      .code(statusCode)
      .send(errorResponse(statusCode, errorName, message));
  });

  return app;
};

export default buildApp;
