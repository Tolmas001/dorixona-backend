import type { FastifyInstance } from 'fastify';
import { verifyGoogleIdToken } from '../../services/google-auth';
import { setRefreshTokenCookie } from '../../services/auth-cookies';
import { generateTokens } from '../../services/tokens';
import {
  buildGoogleUsername,
  googleLoginBodySchema,
  toPublicUser,
  type GoogleLoginBody,
} from './shared';
import { googleLoginSwaggerSchema } from './swagger';

export const registerOauthRoutes = (fastify: FastifyInstance): void => {
  fastify.post<{ Body: GoogleLoginBody }>(
    '/auth/google',
    {
      schema: googleLoginSwaggerSchema,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const parsedBody = googleLoginBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid Google login payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const googleClientId = fastify.config.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Google login is not configured on the server.',
          statusCode: 500,
        });
      }

      let googleProfile;
      try {
        googleProfile = await verifyGoogleIdToken(
          parsedBody.data.idToken,
          googleClientId,
        );
      } catch {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid Google token.',
          statusCode: 401,
        });
      }

      let user = await fastify.prisma.user.findFirst({
        where: {
          OR: [
            { google_id: googleProfile.googleId },
            { email: googleProfile.email },
          ],
        },
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
          created_at: true,
          updated_at: true,
        },
      });

      if (!user) {
        user = await fastify.prisma.user.create({
          data: {
            username: buildGoogleUsername(
              googleProfile.email,
              googleProfile.googleId,
            ),
            email: googleProfile.email,
            full_name: googleProfile.fullName,
            tel_number: '+10000000000',
            age: 18,
            google_id: googleProfile.googleId,
            role: 'CUSTOMER',
            pharmacy_id: null,
            is_email_verified: true,
          },
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
            created_at: true,
            updated_at: true,
          },
        });
      } else if (
        !user.google_id ||
        !user.is_email_verified
      ) {
        user = await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            google_id: googleProfile.googleId,
            is_email_verified: true,
          },
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
            created_at: true,
            updated_at: true,
          },
        });
      }

      if (!user) {
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Unable to resolve Google user session.',
          statusCode: 500,
        });
      }

      const tokens = await generateTokens(fastify as never, {
        userId: user.id,
        role: user.role,
        pharmacyId: user.pharmacy_id,
      });

      setRefreshTokenCookie(fastify, reply, tokens.refreshToken);
      return reply.send({
        message: 'Google login successful.',
        ...tokens,
        user: toPublicUser(user),
      });
    },
  );
};
