import type { FastifyInstance } from 'fastify';
import { hashPassword, verifyPassword } from './password';
import { sendOtpEmail } from './email';

const OTP_EXPIRY_MINUTES = 10;

const generateOtpCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getOtpExpiryDate = (): Date => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiresAt;
};

export const issueEmailOtp = async (
  fastify: FastifyInstance,
  user: {
    id: string;
    email: string;
    full_name: string;
  },
): Promise<{ delivered: boolean; devOtpCode?: string }> => {
  const code = generateOtpCode();
  const codeHash = await hashPassword(code);

  await fastify.prisma.emailOtp.updateMany({
    where: {
      userId: user.id,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  await fastify.prisma.emailOtp.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: getOtpExpiryDate(),
    },
  });

  const delivered = await sendOtpEmail(fastify, {
    to: user.email,
    fullName: user.full_name,
    code,
  });

  return delivered || fastify.config.NODE_ENV !== 'production'
    ? {
        delivered,
        devOtpCode: fastify.config.NODE_ENV !== 'production' ? code : undefined,
      }
    : {
        delivered,
      };
};

export const verifyLatestEmailOtp = async (
  fastify: FastifyInstance,
  userId: string,
  code: string,
): Promise<boolean> => {
  const otp = await fastify.prisma.emailOtp.findFirst({
    where: {
      userId,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otp) {
    return false;
  }

  const isMatch = await verifyPassword(otp.codeHash, code);

  if (!isMatch) {
    return false;
  }

  await fastify.prisma.emailOtp.update({
    where: { id: otp.id },
    data: {
      consumedAt: new Date(),
    },
  });

  return true;
};
