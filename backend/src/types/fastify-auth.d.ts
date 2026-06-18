import '@fastify/jwt';
import 'fastify';
import type { preHandlerHookHandler } from 'fastify';

export type AppRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'SELLER' | 'CUSTOMER';

export type JwtUserPayload = {
  userId: string;
  role: AppRole;
  pharmacyId?: string | null;
  email?: string;
  iat?: number;
  exp?: number;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
    checkRole: (allowedRoles: AppRole[]) => preHandlerHookHandler;
  }
}
