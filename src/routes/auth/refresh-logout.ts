import type { FastifyInstance } from 'fastify';
import type { JwtUserPayload } from '../../types/fastify-auth';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../../services/auth-cookies';
import { generateTokens } from '../../services/tokens';
import { verifyPassword } from '../../services/password';
import { getRefreshTokenFromRequest, normalizeAuthBodyHook, refreshTokenBodySchema, toPublicUser, type RefreshTokenBody } from './shared';
import { logoutSwaggerSchema, refreshSwaggerSchema } from './swagger';

export const registerRefreshLogoutRoutes = (fastify: FastifyInstance): void => {
  fastify.post<{ Body: RefreshTokenBody }>(
    '/auth/refresh',
    {
      schema: refreshSwaggerSchema,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      preValidation: [normalizeAuthBodyHook],
    },
    async (request, reply) => {
      const parsedBody = refreshTokenBodySchema.safeParse(request.body ?? {});
      if (!parsedBody.success) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid refresh payload.', statusCode: 400, details: parsedBody.error.flatten() });
      }

      const incomingRefreshToken = getRefreshTokenFromRequest(parsedBody.data, request.cookies);
      if (!incomingRefreshToken) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Refresh token is required.', statusCode: 401 });
      }

      let decodedToken: JwtUserPayload;
      try {
        decodedToken = await fastify.jwt.verify(incomingRefreshToken);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired refresh token.', statusCode: 401 });
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: decodedToken.userId },
        select: {
          id: true, username: true, email: true, password: true, full_name: true, tel_number: true,
          age: true, is_email_verified: true, role: true, pharmacy_id: true,
          pharmacy: { select: { id: true, name: true, address: true, phone: true, licenseNumber: true } },
          google_id: true, refresh_token_hash: true, created_at: true, updated_at: true,
        },
      });

      if (!user || !user.refresh_token_hash) {
        return reply.code(401).send({ error: 'Unauthorized', message: user ? 'Refresh session has been revoked.' : 'Refresh session is not valid.', statusCode: 401 });
      }

      const isRefreshTokenValid = await verifyPassword(user.refresh_token_hash, incomingRefreshToken);
      if (!isRefreshTokenValid) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Refresh session is not valid.', statusCode: 401 });
      }

      const tokens = await generateTokens(fastify as never, { userId: user.id, role: user.role, pharmacyId: user.pharmacy_id });
      setRefreshTokenCookie(fastify, reply, tokens.refreshToken);
      return reply.send({ message: 'Tokens refreshed successfully.', ...tokens, user: toPublicUser(user) });
    },
  );

  fastify.post(
    '/auth/logout',
    { schema: logoutSwaggerSchema, preHandler: [fastify.authenticate as never] },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication is required to logout.', statusCode: 401 });

      await fastify.prisma.user.update({ where: { id: userId }, data: { refresh_token_hash: null } });
      clearRefreshTokenCookie(fastify, reply);
      return reply.send({ message: 'Logged out successfully.' });
    },
  );
};