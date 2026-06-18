import nodemailer from 'nodemailer';
import type { FastifyInstance } from 'fastify';

type SendOtpEmailParams = {
  to: string;
  fullName: string;
  code: string;
};

const buildOtpEmailHtml = (fullName: string, code: string): string => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>Dorixona tizimiga xush kelibsiz</h2>
      <p>Salom, ${fullName}.</p>
      <p>Hisobingizni tasdiqlash uchun quyidagi OTP koddan foydalaning:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 12px 0;">
        ${code}
      </div>
      <p>Kod 10 daqiqa davomida amal qiladi.</p>
      <p>Agar bu so'rovni siz yubormagan bo'lsangiz, ushbu emailni e'tiborsiz qoldiring.</p>
    </div>
  `;
};

export const sendOtpEmail = async (
  fastify: FastifyInstance,
  params: SendOtpEmailParams,
): Promise<boolean> => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, NODE_ENV } = fastify.config;

  if (!SMTP_HOST || !SMTP_FROM) {
    fastify.log.warn(
      {
        email: params.to,
        otpCode: params.code,
      },
      'SMTP is not configured. OTP email was not sent; using development fallback.',
    );
    return NODE_ENV !== 'production';
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined,
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: params.to,
      subject: 'Dorixona OTP Confirmation Code',
      text: `Salom, ${params.fullName}. Tasdiqlash kodingiz: ${params.code}. Kod 10 daqiqa davomida amal qiladi.`,
      html: buildOtpEmailHtml(params.fullName, params.code),
    });

    return true;
  } catch (error) {
    fastify.log.error(
      {
        err: error,
        email: params.to,
      },
      'Failed to send OTP email.',
    );

    if (NODE_ENV !== 'production') {
      fastify.log.warn(
        {
          email: params.to,
          otpCode: params.code,
        },
        'Falling back to development OTP delivery because SMTP sending failed.',
      );
      return false;
    }

    throw error;
  }
};
