import type { Prisma } from '@prisma/client';
import { z } from 'zod';

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const createSaleBodySchema = z
  .object({
    items: z.array(saleItemSchema).min(1),
    paymentType: z.string().trim().min(2).max(40).default('Naqd'),
    discountPercent: z.coerce.number().min(0).max(100).default(0),
    discountAmount: z.coerce.number().min(0).default(0),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const item of value.items) {
      if (seen.has(item.productId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate productId values are not allowed in sale items.',
          path: ['items'],
        });
        return;
      }

      seen.add(item.productId);
    }
  });

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'integer' },
  },
};

export const createSaleSwaggerSchema = {
  tags: ['Sales'],
  summary: 'Create a sale',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
      paymentType: { type: 'string', maxLength: 40 },
      discountPercent: { type: 'number', minimum: 0, maximum: 100 },
      discountAmount: { type: 'number', minimum: 0 },
      notes: { type: 'string', maxLength: 1000 },
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
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export type CreateSaleBody = z.infer<typeof createSaleBodySchema>;

export type StockBatch = Prisma.StockGetPayload<{
  select: {
    id: true;
    pharmacyId: true;
    productId: true;
    batchNumber: true;
    quantity: true;
    expiryDate: true;
    createdAt: true;
  };
}>;

export class SalesRouteError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const toNumber = (value: Prisma.Decimal | number | string): number =>
  Number(value);
