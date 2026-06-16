import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { JwtUserPayload } from '../types/fastify-auth';

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const authenticatePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'authenticate',
    (async (request: FastifyRequest, reply: FastifyReply) => {
      const token = extractBearerToken(request.headers.authorization);

      if (!token) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'A valid Bearer token is required in the Authorization header.',
          statusCode: 401,
        });
      }

      try {
        const decoded = await fastify.jwt.verify<JwtUserPayload>(token);

        if (!decoded?.userId || !decoded?.role) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'The access token payload is invalid.',
            statusCode: 401,
          });
        }

        request.user = decoded;
      } catch (error) {
        fastify.log.warn(
            {
              err: error,
              route: request.url,
            },
            'JWT authentication failed',
          );

        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'The access token is missing, invalid, or expired.',
          statusCode: 401,
        });
      }
    }) as preHandlerHookHandler,
  );
};

export default fp(authenticatePlugin, {
  name: 'authenticate-plugin',
});
