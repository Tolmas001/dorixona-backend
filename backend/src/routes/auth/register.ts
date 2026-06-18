import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../../services/password';
import { issueEmailOtp } from '../../services/otp';
import {
  buildOtpNextStep,
  getDefaultCustomerProfile,
  normalizeAuthBodyHook,
  registerBodySchema,
  toPublicUser,
  type RegisterBody,
} from './shared';
import { registerSwaggerSchema } from './swagger';

export const registerRegisterRoutes = (fastify: FastifyInstance): void => {
  fastify.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      schema: registerSwaggerSchema,
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      preValidation: [normalizeAuthBodyHook],
    },
    async (request, reply) => {
      const parsedBody = registerBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid registration payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const { fullname, username, email, password } = parsedBody.data;
      const normalizedEmail = email;
      const normalizedUsername = username;
      const defaultCustomerProfile = getDefaultCustomerProfile();
      const existingUser = await fastify.prisma.user.findFirst({
        where: {
          OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
        },
        select: { id: true, email: true, username: true },
      });

      if (existingUser) {
        return reply.code(409).send({
          error: 'Conflict',
          message:
            existingUser.email === normalizedEmail
              ? 'A user with this email already exists.'
              : 'A user with this username already exists.',
          statusCode: 409,
        });
      }

      const hashedPassword = await hashPassword(password);
      const user = await fastify.prisma.user.create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          password: hashedPassword,
          full_name: fullname,
          tel_number: defaultCustomerProfile.tel_number,
          age: defaultCustomerProfile.age,
          role: 'CUSTOMER',
          pharmacy_id: null,
          is_email_verified: false,
        },
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

      const otpResult = await issueEmailOtp(fastify, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      });

      return reply.code(201).send({
        message:
          'Registration successful. Please verify the OTP sent to your email.',
        nextStep: buildOtpNextStep(fastify, user.email),
        email: user.email,
        devOtpCode: otpResult.devOtpCode,
        user: toPublicUser(user),
      });
    },
  );
};
