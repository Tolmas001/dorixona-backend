import type { FastifyInstance } from 'fastify';
import { setRefreshTokenCookie } from '../../services/auth-cookies';
import { generateTokens } from '../../services/tokens';
import { hashPassword, verifyPassword } from '../../services/password';
import {
  buildOtpNextStep,
  loginBodySchema,
  normalizeAuthBodyHook,
  toPublicUser,
  type LoginBody,
} from './shared';
import { loginSwaggerSchema } from './swagger';

export const registerLoginRoutes = (fastify: FastifyInstance): void => {
  fastify.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: loginSwaggerSchema,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      preValidation: [normalizeAuthBodyHook],
    },
    async (request, reply) => {
      const parsedBody = loginBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid login payload.',
          statusCode: 400,
          details: parsedBody.error.flatten(),
        });
      }

      const { email, password } = parsedBody.data;
      const normalizedEmail = email;
      const demoSuperAdminEmail = process.env.DEMO_SUPER_ADMIN_1_EMAIL?.toLowerCase();
      const demoSuperAdminPassword = process.env.DEMO_SUPER_ADMIN_1_PASSWORD;

      if (demoSuperAdminEmail && demoSuperAdminPassword && normalizedEmail === demoSuperAdminEmail && password === demoSuperAdminPassword) {
        const existingSuperAdmin = await fastify.prisma.user.findFirst({
          where: { OR: [{ email: normalizedEmail }, { username: 'superadmin' }] },
          select: { id: true },
        });

        const superAdminData = {
          username: 'superadmin', email: normalizedEmail,
          password: await hashPassword(demoSuperAdminPassword),
          full_name: 'System Super Admin', tel_number: '+998901111111',
          age: 30, is_email_verified: true, role: 'SUPER_ADMIN' as const, pharmacy_id: null,
        };

        if (existingSuperAdmin) {
          await fastify.prisma.user.update({ where: { id: existingSuperAdmin.id }, data: superAdminData, select: { id: true } });
        } else {
          await fastify.prisma.user.create({ data: superAdminData, select: { id: true } });
        }
      }

      let user = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true, username: true, email: true, password: true, full_name: true, tel_number: true,
          age: true, is_email_verified: true, role: true, pharmacy_id: true,
          pharmacy: { select: { id: true, name: true, address: true, phone: true, licenseNumber: true } },
          google_id: true, created_at: true, updated_at: true,
        },
      });

      if (!user || !user.password) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: !user ? 'Invalid email or password.' : 'This account uses Google login. Please continue with Google.',
          statusCode: 401,
        });
      }

      const isPasswordValid = await verifyPassword(user.password, password);
      if (!isPasswordValid) return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password.', statusCode: 401 });

      if (!user.is_email_verified) {
        return reply.code(403).send({
          error: 'Forbidden', message: 'Please verify your email with the OTP code before logging in.',
          statusCode: 403, nextStep: buildOtpNextStep(fastify, user.email),
        });
      }

      if ((user.role === 'OWNER' || user.role === 'ADMIN') && !user.pharmacy_id) {
        const defaultPharmacy = await fastify.prisma.pharmacy.findFirst({ where: { licenseNumber: 'DORI-001' }, select: { id: true } });
        if (defaultPharmacy) {
          user = await fastify.prisma.user.update({
            where: { id: user.id }, data: { pharmacy_id: defaultPharmacy.id },
            select: {
              id: true, username: true, email: true, password: true, full_name: true, tel_number: true,
              age: true, is_email_verified: true, role: true, pharmacy_id: true,
              pharmacy: { select: { id: true, name: true, address: true, phone: true, licenseNumber: true } },
              google_id: true, created_at: true, updated_at: true,
            },
          });
        }
      }

      const tokens = await generateTokens(fastify as never, { userId: user.id, role: user.role, pharmacyId: user.pharmacy_id });
      setRefreshTokenCookie(fastify, reply, tokens.refreshToken);
      return reply.send({ message: 'Login successful.', ...tokens, user: toPublicUser(user) });
    },
  );
};