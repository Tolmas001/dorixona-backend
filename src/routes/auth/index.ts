import type { FastifyPluginAsync } from 'fastify';
import { registerLoginRoutes } from './login';
import { registerOauthRoutes } from './oauth';
import { registerOtpRoutes } from './otp';
import { registerRefreshLogoutRoutes } from './refresh-logout';
import { registerRegisterRoutes } from './register';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  registerRegisterRoutes(fastify);
  registerLoginRoutes(fastify);
  registerOtpRoutes(fastify);
  registerOauthRoutes(fastify);
  registerRefreshLogoutRoutes(fastify);
};

export default authRoutes;
