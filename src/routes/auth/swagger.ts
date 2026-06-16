export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'integer' },
  },
};

const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    full_name: { type: 'string' },
    tel_number: { type: 'string' },
    age: { type: 'integer' },
    is_email_verified: { type: 'boolean' },
    role: { type: 'string' },
    pharmacy_id: { type: ['string', 'null'], format: 'uuid' },
    google_id: { type: ['string', 'null'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const registerSwaggerSchema = {
  tags: ['Auth'],
  summary: 'Register a new customer account',
  body: {
    type: 'object',
    required: ['fullname', 'username', 'email', 'password'],
    properties: {
      fullname: { type: 'string', minLength: 2, maxLength: 150 },
      username: { type: 'string', minLength: 3, maxLength: 30 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        nextStep: { type: 'string' },
        email: { type: 'string', format: 'email' },
        devOtpCode: { type: ['string', 'null'] },
        user: userResponseSchema,
      },
    },
    400: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const verifyOtpSwaggerSchema = {
  tags: ['Auth'],
  summary: 'Verify OTP after registration',
  body: {
    type: 'object',
    required: ['email', 'code'],
    properties: {
      email: { type: 'string', format: 'email' },
      code: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: userResponseSchema,
      },
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const resendOtpSwaggerSchema = {
  tags: ['Auth'],
  summary: 'Resend email OTP',
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        email: { type: 'string', format: 'email' },
        devOtpCode: { type: ['string', 'null'] },
      },
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const loginSwaggerSchema = {
  tags: ['Auth'],
  summary: 'Login with email and password',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: userResponseSchema,
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
  },
};

export const googleLoginSwaggerSchema = {
  tags: ['Auth'],
  summary: 'Login with Google token',
  body: {
    type: 'object',
    required: ['idToken'],
    properties: {
      idToken: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: userResponseSchema,
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
};

export const refreshSwaggerSchema = {
  tags: ['Auth'],
  summary: 'Refresh access and refresh tokens',
  body: {
    type: 'object',
    properties: {
      refreshToken: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: userResponseSchema,
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
};

export const logoutSwaggerSchema = {
  tags: ['Auth'],
  summary: 'Logout current user',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    401: errorResponseSchema,
  },
};
