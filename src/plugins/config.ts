import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type AppConfig = {
  PORT: number;
  HOST: string;
  NODE_ENV: string;
  JWT_SECRET: string;
  COOKIE_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  APP_BASE_URL: string;
  FRONTEND_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
};

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}

const loadLocalEnv = (): void => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
};

const configPlugin: FastifyPluginAsync = async (fastify) => {
  loadLocalEnv();

  const config: AppConfig = {
    PORT: Number(process.env.PORT ?? 3000),
    HOST: process.env.HOST ?? '0.0.0.0',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    JWT_SECRET: process.env.JWT_SECRET ?? 'change-me-in-production',
    COOKIE_SECRET: process.env.COOKIE_SECRET ?? 'change-me-in-production',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    APP_BASE_URL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    FRONTEND_URL: process.env.FRONTEND_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  fastify.decorate('config', config);
};

export default fp(configPlugin, {
  name: 'config-plugin',
});
