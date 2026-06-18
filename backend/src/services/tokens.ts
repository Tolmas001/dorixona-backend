import type { FastifyInstance } from 'fastify';
import { hashPassword } from './password';

export type TokenUserPayload = {
  userId: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'SELLER' | 'CUSTOMER';
  pharmacyId: string | null;
};

type GeneratedTokens = {
  accessToken: string;
  refreshToken: string;
};

type TokenPrismaClient = {
  user: {
    update: (args: unknown) => Promise<unknown>;
  };
};

type JwtSigner = {
  sign: (
    payload: TokenUserPayload,
    options?: { expiresIn?: string },
  ) => string;
};

type TokenFastifyInstance = FastifyInstance & {
  jwt: JwtSigner;
  prisma: TokenPrismaClient;
};

export const generateTokens = async (
  fastify: TokenFastifyInstance,
  userPayload: TokenUserPayload,
): Promise<GeneratedTokens> => {
  const accessToken = fastify.jwt.sign(userPayload, {
    expiresIn: '30m',
  });

  const refreshToken = fastify.jwt.sign(userPayload, {
    expiresIn: '7d',
  });

  const refreshTokenHash = await hashPassword(refreshToken);

  await fastify.prisma.user.update({
    where: { id: userPayload.userId },
    data: {
      refresh_token_hash: refreshTokenHash,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};
