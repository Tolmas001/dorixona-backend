import type { FastifyPluginAsync } from 'fastify';
import { registerCreateSaleRoute } from './sales/create-sale-route';
import { registerSalesQueryRoutes } from './sales/query-routes';

const salesRoutes: FastifyPluginAsync = async (fastify) => {
  registerCreateSaleRoute(fastify);
  registerSalesQueryRoutes(fastify);
};

export default salesRoutes;
