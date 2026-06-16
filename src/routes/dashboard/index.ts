import type { FastifyPluginAsync } from 'fastify';
import { registerAdminDashboardRoutes } from './admin';
import { registerSuperAdminDashboardRoutes } from './super-admin';

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  registerAdminDashboardRoutes(fastify);
  registerSuperAdminDashboardRoutes(fastify);
};

export default dashboardRoutes;
