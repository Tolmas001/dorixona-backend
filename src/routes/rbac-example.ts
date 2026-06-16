import type { FastifyPluginAsync } from 'fastify';

const rbacExampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/admin/dashboard',
    {
      preHandler: [
        fastify.authenticate,
        fastify.checkRole(['SUPER_ADMIN', 'OWNER']),
      ],
    },
    async () => {
      return {
        message: 'Welcome to the admin dashboard.',
      };
    },
  );

  fastify.post(
    '/sales',
    {
      preHandler: [
        fastify.authenticate,
        fastify.checkRole(['OWNER', 'SELLER']),
      ],
    },
    async () => {
      return {
        message: 'Sale created successfully.',
      };
    },
  );
};

export default rbacExampleRoutes;
