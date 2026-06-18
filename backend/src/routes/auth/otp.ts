import type { FastifyInstance } from 'fastify';
import { generateTokens } from '../../services/tokens';
import { issueEmailOtp, verifyLatestEmailOtp } from '../../services/otp';
import { setRefreshTokenCookie } from '../../services/auth-cookies';
import {
  normalizeAuthBodyHook,
  resendOtpBodySchema,
  toPublicUser,
  type ResendOtpBody,
  type VerifyOtpBody,
  verifyOtpBodySchema,
} from './shared';
import {
  resendOtpSwaggerSchema,
  verifyOtpSwaggerSchema,
} from './swagger';

export const registerOtpRoutes = (fastify: FastifyInstance): void => {
  fastify.post<{ Body: VerifyOtpBody }>(
    '/auth/verify-otp',
    {
      schema: verifyOtpSwaggerSchema,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      preValidation: [normalizeAuthBodyHook],
    },
    async (request, reply) => {
      const parsedBody = verifyOtpBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid OTP verification payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const normalizedEmail = parsedBody.data.email.toLowerCase();
      const user = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          username: true,
          email: true,
          password: true,
          full_name: true,
          tel_number: true,
          age: true,
          is_email_verified: true,
          role: true,
          pharmacy_id: true,
          pharmacy: { select: { id: true, name: true, address: true, phone: true, licenseNumber: true } },
          google_id: true,
          refresh_token_hash: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found for OTP verification.',
          statusCode: 404,
        });
      }

      if (user.is_email_verified) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'This email address is already verified.',
          statusCode: 409,
        });
      }

      const isOtpValid = await verifyLatestEmailOtp(
        fastify,
        user.id,
        parsedBody.data.code,
      );

      if (!isOtpValid) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid or expired OTP code.',
          statusCode: 400,
        });
      }

      const verifiedUser = await fastify.prisma.user.update({
        where: { id: user.id },
        data: { is_email_verified: true },
        select: {
          id: true,
          username: true,
          email: true,
          full_name: true,
          tel_number: true,
          age: true,
          is_email_verified: true,
          role: true,
          pharmacy_id: true,
          pharmacy: { select: { id: true, name: true, address: true, phone: true, licenseNumber: true } },
          google_id: true,
          created_at: true,
          updated_at: true,
        },
      });

      const tokens = await generateTokens(fastify as never, {
        userId: verifiedUser.id,
        role: verifiedUser.role,
        pharmacyId: verifiedUser.pharmacy_id,
      });

      setRefreshTokenCookie(fastify, reply, tokens.refreshToken);

      return reply.send({
        message: 'Email verified successfully.',
        ...tokens,
        user: toPublicUser(verifiedUser),
      });
    },
  );

  fastify.post<{ Body: ResendOtpBody }>(
    '/auth/resend-otp',
    {
      schema: resendOtpSwaggerSchema,
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      preValidation: [normalizeAuthBodyHook],
    },
    async (request, reply) => {
      const parsedBody = resendOtpBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid resend OTP payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const normalizedEmail = parsedBody.data.email.toLowerCase();
      const user = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          full_name: true,
          is_email_verified: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found.',
          statusCode: 404,
        });
      }

      if (user.is_email_verified) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'This email address is already verified.',
          statusCode: 409,
        });
      }

      const otpResult = await issueEmailOtp(fastify, user);
      return reply.send({
        message: 'A new OTP code has been sent to your email.',
        email: user.email,
        devOtpCode: otpResult.devOtpCode,
      });
    },
  );
};
