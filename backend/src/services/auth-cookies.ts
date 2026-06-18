import type { FastifyReply, FastifyInstance } from 'fastify';

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const setRefreshTokenCookie = (
  fastify: FastifyInstance,
  reply: FastifyReply,
  refreshToken: string,
): void => {
  reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    path: '/auth',
    httpOnly: true,
    sameSite: 'lax',
    secure: fastify.config.NODE_ENV === 'production',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    signed: false,
  });
};

export const clearRefreshTokenCookie = (
  fastify: FastifyInstance,
  reply: FastifyReply,
): void => {
  reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    path: '/auth',
    httpOnly: true,
    sameSite: 'lax',
    secure: fastify.config.NODE_ENV === 'production',
    signed: false,
  });
};

export const getRefreshTokenCookieName = (): string => REFRESH_TOKEN_COOKIE_NAME;
