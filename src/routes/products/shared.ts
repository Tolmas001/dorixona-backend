import type { Prisma } from '@prisma/client';
import { z } from 'zod';

export const stockBatchSchema = z.object({
  batchNumber: z.string().trim().min(1).max(100),
  quantity: z.coerce.number().int().min(0),
  expiryDate: z.coerce.date(),
  reorderLevel: z.coerce.number().int().min(0).default(0),
});

export const createProductBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(2).max(100).optional(),
  barcode: z.string().trim().min(4).max(100),
  imageUrl: z.string().trim().max(500).optional(),
  purchasePrice: z.coerce.number().positive(),
  sellingPrice: z.coerce.number().positive(),
  manufacturer: z.string().trim().min(2).max(200).optional(),
  expiryDate: z.coerce.date().optional(),
  stockBatches: z.array(stockBatchSchema).min(1),
});

export const updateProductBodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  sku: z.string().trim().min(2).max(100).nullable().optional(),
  barcode: z.string().trim().min(4).max(100).optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  purchasePrice: z.coerce.number().positive().optional(),
  sellingPrice: z.coerce.number().positive().optional(),
  manufacturer: z.string().trim().min(2).max(200).nullable().optional(),
  expiryDate: z.coerce.date().optional(),
  stockBatches: z
    .array(stockBatchSchema.extend({ id: z.string().uuid().optional() }))
    .optional(),
});

export const addStockBatchBodySchema = stockBatchSchema;

export const productParamsSchema = z.object({
  id: z.string().uuid(),
});

export const searchProductsQuerySchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'integer' },
  },
};

const stockBatchSwaggerSchema = {
  type: 'object',
  required: ['batchNumber', 'quantity', 'expiryDate'],
  properties: {
    batchNumber: { type: 'string', minLength: 1, maxLength: 100 },
    quantity: { type: 'integer', minimum: 0 },
    expiryDate: { type: 'string', format: 'date-time' },
    reorderLevel: { type: 'integer', minimum: 0 },
  },
};

export const createProductSwaggerSchema = {
  tags: ['Products'],
  summary: 'Create a product with initial stock batches',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: [
      'name',
      'barcode',
      'purchasePrice',
      'sellingPrice',
      'stockBatches',
    ],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 200 },
      sku: { type: 'string', minLength: 2, maxLength: 100 },
      barcode: { type: 'string', minLength: 4, maxLength: 100 },
      imageUrl: { type: 'string', maxLength: 500 },
      purchasePrice: { type: 'number', exclusiveMinimum: 0 },
      sellingPrice: { type: 'number', exclusiveMinimum: 0 },
      manufacturer: { type: 'string', minLength: 2, maxLength: 200 },
      expiryDate: { type: 'string', format: 'date-time' },
      stockBatches: {
        type: 'array',
        minItems: 1,
        items: stockBatchSwaggerSchema,
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const updateProductSwaggerSchema = {
  tags: ['Products'],
  summary: 'Update a product',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 200 },
      sku: { type: ['string', 'null'], minLength: 2, maxLength: 100 },
      barcode: { type: 'string', minLength: 4, maxLength: 100 },
      imageUrl: { type: ['string', 'null'], maxLength: 500 },
      purchasePrice: { type: 'number', exclusiveMinimum: 0 },
      sellingPrice: { type: 'number', exclusiveMinimum: 0 },
      manufacturer: { type: ['string', 'null'], minLength: 2, maxLength: 200 },
      expiryDate: { type: 'string', format: 'date-time' },
      stockBatches: {
        type: 'array',
        items: {
          type: 'object',
          required: ['batchNumber', 'quantity', 'expiryDate'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            batchNumber: { type: 'string', minLength: 1, maxLength: 100 },
            quantity: { type: 'integer', minimum: 0 },
            expiryDate: { type: 'string', format: 'date-time' },
            reorderLevel: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const addStockBatchSwaggerSchema = {
  tags: ['Products'],
  summary: 'Add a stock batch to a product',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
  body: stockBatchSwaggerSchema,
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const uploadProductImageSwaggerSchema = {
  tags: ['Products'],
  summary: 'Upload a product image',
  security: [{ bearerAuth: [] }],
  consumes: ['multipart/form-data'],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type AddStockBatchBody = z.infer<typeof addStockBatchBodySchema>;
export type ProductParams = z.infer<typeof productParamsSchema>;
export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;

export type ProductRecord = Prisma.ProductGetPayload<{
  include: { stocks: true };
}>;

export const parseUuidParams = (params: unknown) =>
  productParamsSchema.safeParse(params);

export const normalizeScore = (value: string, query: string): number => {
  const source = value.toLowerCase();
  const target = query.toLowerCase();

  if (source === target) return 100;
  if (source.startsWith(target)) return 75;
  if (source.includes(target)) return 50;
  return 0;
};

export const toProductResponse = (product: ProductRecord) => {
  const stockBatches = (product.stocks ?? []).map((stock) => ({
    id: stock.id,
    pharmacyId: stock.pharmacyId,
    batchNumber: stock.batchNumber,
    quantity: stock.quantity,
    reorderLevel: stock.reorderLevel,
    expiryDate: stock.expiryDate,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  }));

  return {
    ...product,
    imageUrl: product.imageUrl,
    stockBatches,
    totalQuantity: stockBatches.reduce((sum, batch) => sum + batch.quantity, 0),
  };
};

export const getPharmacyIdOrReply = (
  request: { user?: { pharmacyId?: string | null } },
  reply: {
    code: (
      statusCode: number,
    ) => { send: (payload: unknown) => unknown };
  },
): string | null => {
  const pharmacyId = request.user?.pharmacyId;
  if (!pharmacyId) {
    reply.code(400).send({
      error: 'Bad Request',
      message:
        'Admin account must be linked to a pharmacy before managing inventory.',
      statusCode: 400,
    });
    return null;
  }

  return pharmacyId;
};

export const buildProductWhere = (
  role: string | undefined,
  pharmacyId: string | null | undefined,
): Prisma.ProductWhereInput =>
  role === 'SUPER_ADMIN' || role === 'CUSTOMER'
    ? {}
    : !pharmacyId
      ? { id: { in: [] } }
      : {
          stocks: {
            some: {
              pharmacyId,
            },
          },
        };

export const buildStockWhere = (
  role: string | undefined,
  pharmacyId: string | null | undefined,
): Prisma.StockWhereInput | undefined =>
  role === 'SUPER_ADMIN' || role === 'CUSTOMER'
    ? undefined
    : !pharmacyId
      ? { id: { in: [] } }
    : {
        pharmacyId,
      };
