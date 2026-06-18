import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { AppRole, JwtUserPayload } from '../types/fastify-auth';

export const ROLES = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'SELLER', 'CUSTOMER'] as const;
export type Role = AppRole;

const rbacPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'checkRole',
    (allowedRoles: AppRole[]): preHandlerHookHandler =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user as JwtUserPayload | undefined;

        if (!user) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Authentication is required to access this resource.',
            statusCode: 401,
          });
        }

        const userRole = user.role;
        const userId = user.userId;

        if (!userId || !userRole) {
          fastify.log.warn(
            {
              route: request.url,
              userId,
              userRole,
            },
            'Invalid JWT payload received during RBAC check',
          );

          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'The access token is invalid or incomplete.',
            statusCode: 401,
          });
        }

        if (!allowedRoles.includes(userRole)) {
          fastify.log.warn(
            {
              route: request.url,
              userId,
              userRole,
              allowedRoles,
            },
            'RBAC access denied',
          );

          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to perform this action.',
            statusCode: 403,
          });
        }
      },
  );
};

export default fp(rbacPlugin, {
  name: 'rbac-plugin',
});
