import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Role } from '@prisma/client';
import { z } from 'zod';
import { getRefreshTokenCookieName } from '../../services/auth-cookies';

const usernameRegex = /^(?=.{3,30}$)[a-zA-Z0-9_]+$/;
const fullNameRegex = /^(?=.{2,150}$)\p{L}[\p{L}\s'‘’ʻ-]*$/u;
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

const DEFAULT_CUSTOMER_PHONE = '+10000000000';
const DEFAULT_CUSTOMER_AGE = 18;

export const registerBodySchema = z.object({
  fullname: z
    .string()
    .trim()
    .regex(
      fullNameRegex,
      'Full name must contain only letters, spaces, apostrophes, or hyphens.',
    ),
  username: z
    .string()
    .trim()
    .regex(
      usernameRegex,
      'Username must be 3-30 characters and use only letters, numbers, or underscores.',
    ),
  email: z.string().trim().email().max(255),
  password: z.string().regex(
    passwordRegex,
    'Password must be 8-128 characters and include a letter, a number, and a special character.',
  ),
});

export const verifyOtpBodySchema = z.object({
  email: z.string().trim().email().max(255),
  code: z.string().trim().regex(/^\d{6}$/, 'OTP code must be 6 digits.'),
});

export const resendOtpBodySchema = z.object({
  email: z.string().trim().email().max(255),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().regex(
    passwordRegex,
    'Password must be 8-128 characters and include a letter, a number, and a special character.',
  ),
});

export const googleLoginBodySchema = z.object({
  idToken: z.string().min(1),
});

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
export type ResendOtpBody = z.infer<typeof resendOtpBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type GoogleLoginBody = z.infer<typeof googleLoginBodySchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
export type UserRole = Role;

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  tel_number: string;
  age: number;
  is_email_verified: boolean;
  isBlocked?: boolean;
  role: UserRole;
  pharmacy_id: string | null;
  pharmacy?: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    licenseNumber: string;
  } | null;
  google_id?: string | null;
  created_at: Date;
  updated_at: Date;
};

export const getRefreshTokenFromRequest = (
  body: RefreshTokenBody | undefined,
  cookies: Record<string, string | undefined> | undefined,
): string | null =>
  body?.refreshToken ?? cookies?.[getRefreshTokenCookieName()] ?? null;

export const deriveFullName = (
  fullName: string | undefined,
  username: string,
): string => fullName?.trim() || username;

export const normalizeAuthBodyHook = (
  request: FastifyRequest,
  _reply: unknown,
  done: () => void,
): void => {
  if (request.body && typeof request.body === 'object') {
    const body = request.body as Record<string, unknown>;

    if (typeof body.email === 'string') {
      body.email = body.email.trim().toLowerCase();
    }

    if (typeof body.username === 'string') {
      body.username = body.username.trim();
    }

    if (typeof body.fullname === 'string') {
      body.fullname = body.fullname.trim().replace(/\s+/g, ' ');
    }

    if (typeof body.login === 'string') {
      body.login = body.login.trim();
    }
  }

  done();
};

export const getDefaultCustomerProfile = () => ({
  tel_number: DEFAULT_CUSTOMER_PHONE,
  age: DEFAULT_CUSTOMER_AGE,
});

export const buildGoogleUsername = (
  email: string,
  googleId: string,
): string => {
  const localPart = email.split('@')[0] || 'google-user';
  return `${localPart}-${googleId.slice(-6)}`.toLowerCase();
};

export const buildOtpNextStep = (
  fastify: FastifyInstance,
  email: string,
): string => {
  const encodedEmail = encodeURIComponent(email);
  const frontendUrl = fastify.config.FRONTEND_URL ?? fastify.config.APP_BASE_URL;
  return `${frontendUrl.replace(/\/$/, '')}/otp.html?email=${encodedEmail}`;
};

export const toPublicUser = (user: UserProfile) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  full_name: user.full_name,
  tel_number: user.tel_number,
  age: user.age,
  is_email_verified: user.is_email_verified,
  isBlocked: user.isBlocked ?? false,
  role: user.role,
  pharmacy_id: user.pharmacy_id,
  pharmacy: user.pharmacy ?? null,
  google_id: user.google_id ?? null,
  created_at: user.created_at,
  updated_at: user.updated_at,
});
