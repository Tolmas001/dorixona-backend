import { z } from 'zod';

export const createPharmacySchema = z.object({
  name: z.string().trim().min(2).max(200),
  licenseNumber: z.string().trim().min(3).max(100),
  address: z.string().trim().min(3).max(500).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
});

export const updatePharmacySchema = createPharmacySchema.partial();

export const pharmacyParamsSchema = z.object({
  id: z.string().uuid(),
});

export const assignPharmacyUserSchema = z.object({
  userId: z.string().uuid(),
});

export const globalStatsQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'integer' },
  },
};

export const createPharmacySwaggerSchema = {
  tags: ['Super Admin'],
  summary: 'Create a pharmacy',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'licenseNumber'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 200 },
      licenseNumber: { type: 'string', minLength: 3, maxLength: 100 },
      address: { type: 'string' },
      phone: { type: 'string' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const assignUserSwaggerSchema = (summary: string) => ({
  tags: ['Super Admin'],
  summary,
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
  body: {
    type: 'object',
    required: ['userId'],
    properties: { userId: { type: 'string', format: 'uuid' } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
});
