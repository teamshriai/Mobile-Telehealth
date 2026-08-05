import 'dotenv/config';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Environment Schema
// Server refuses to start if any required variable is missing or invalid.
// This is the single source of truth for all configuration.
// ─────────────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be a numeric string')
    .transform(Number)
    .default('5000'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string',
    ),

  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters for security'),

  JWT_EXPIRES_IN: z.string().default('15m'),

  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS is required'),

  ARGON2_MEMORY_COST: z.string().transform(Number).default('65536'),
  ARGON2_TIME_COST: z.string().transform(Number).default('3'),
  ARGON2_PARALLELISM: z.string().transform(Number).default('4'),

  AUTH_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('10'),
  API_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  API_RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed. Server cannot start.\n');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
