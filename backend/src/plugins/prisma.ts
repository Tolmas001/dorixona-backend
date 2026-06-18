import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prisma = new PrismaClient();

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await fastify.prisma.$disconnect();
  });
};

export default fp(prismaPlugin, {
  name: 'prisma-plugin',
});
