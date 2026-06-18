import type { FastifyPluginAsync } from 'fastify';
import { registerSuperAdminPharmacyRoutes } from './super-admin/pharmacy-routes';
import { registerUserManagementRoutes } from './super-admin/user-management-routes';

const superAdminRoutes: FastifyPluginAsync = async (fastify) => {
  registerSuperAdminPharmacyRoutes(fastify);
  registerUserManagementRoutes(fastify);
};

export default superAdminRoutes;
