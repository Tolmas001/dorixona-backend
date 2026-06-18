import type { FastifyInstance } from 'fastify';
import {
  buildProductWhere,
  buildStockWhere,
  normalizeScore,
  parseUuidParams,
  searchProductsQuerySchema,
  toProductResponse,
  type ProductParams,
  type SearchProductsQuery,
} from './shared';

export const registerProductQueryRoutes = (fastify: FastifyInstance): void => {
  fastify.get(
    '/products',
    async (request, reply) => {
      const role = request.user?.role ?? 'CUSTOMER';
      const pharmacyId = request.user?.pharmacyId;
      const products = await fastify.prisma.product.findMany({
        where: buildProductWhere(role, pharmacyId),
        include: {
          stocks: {
            where: buildStockWhere(role, pharmacyId),
            orderBy: [{ expiryDate: 'asc' }],
          },
        },
        orderBy: [{ name: 'asc' }],
      });

      return reply.send({ data: products.map(toProductResponse) });
    },
  );

  fastify.get<{ Params: ProductParams }>(
    '/products/:id',
    async (request, reply) => {
      const parsedParams = parseUuidParams(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid product id.',
          statusCode: 400,
          details: parsedParams.error.flatten(),
        });
      }

      const role = request.user?.role ?? 'CUSTOMER';
      const pharmacyId = request.user?.pharmacyId;
      const product = await fastify.prisma.product.findFirst({
        where: {
          id: parsedParams.data.id,
          ...buildProductWhere(role, pharmacyId),
        },
        include: {
          stocks: {
            where: buildStockWhere(role, pharmacyId),
            orderBy: [{ expiryDate: 'asc' }],
          },
        },
      });

      if (!product) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found.',
          statusCode: 404,
        });
      }

      return reply.send({ data: toProductResponse(product) });
    },
  );

  fastify.get<{ Querystring: SearchProductsQuery }>(
    '/products/search',
    async (request, reply) => {
      const parsedQuery = searchProductsQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid search query.',
          statusCode: 400,
          details: parsedQuery.error.flatten(),
        });
      }

      const { query, limit } = parsedQuery.data;
      const role = request.user?.role ?? 'CUSTOMER';
      const pharmacyId = request.user?.pharmacyId;
      const products = await fastify.prisma.product.findMany({
        where: {
          AND: [
            buildProductWhere(role, pharmacyId),
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { barcode: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: {
          stocks: {
            where: buildStockWhere(role, pharmacyId),
            orderBy: [{ expiryDate: 'asc' }],
          },
        },
        take: limit,
        orderBy: [{ name: 'asc' }],
      });

      const rankedProducts = products
        .map((product) => ({
          ...toProductResponse(product),
          relevance: Math.max(
            normalizeScore(product.name, query),
            normalizeScore(product.barcode, query),
            normalizeScore(product.sku ?? '', query),
          ),
        }))
        .sort(
          (left, right) =>
            right.relevance - left.relevance ||
            left.name.localeCompare(right.name),
        );

      return reply.send({ data: rankedProducts });
    },
  );
};
