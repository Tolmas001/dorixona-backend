import type { FastifyPluginAsync } from 'fastify';
import { registerProductCatalogMutationRoutes } from './products/catalog-mutation-routes';
import { registerProductImageUploadRoutes } from './products/image-upload-routes';
import { registerProductQueryRoutes } from './products/query-routes';
import { registerProductStockMutationRoutes } from './products/stock-mutation-routes';

const productsRoutes: FastifyPluginAsync = async (fastify) => {
  registerProductCatalogMutationRoutes(fastify);
  registerProductImageUploadRoutes(fastify);
  registerProductStockMutationRoutes(fastify);
  registerProductQueryRoutes(fastify);
};

export default productsRoutes;
