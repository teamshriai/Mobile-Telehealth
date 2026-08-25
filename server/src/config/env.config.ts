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

  // Base URL of the frontend app — used to build links embedded in outbound
  // communications (e.g. the password reset link). Not a security boundary;
  // CORS/ALLOWED_ORIGINS remains the source of truth for allowed origins.
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // ── Transactional email (SMTP) ──────────────────────────────────────────
  // Required in production so password-reset emails can actually be sent.
  // Optional in development/test — email.service falls back to logging the
  // link to the console when unset, so local dev never needs real credentials.
  EMAIL_HOST: z.string().min(1).optional(),
  EMAIL_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  EMAIL_SECURE: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  EMAIL_USER: z.string().min(1).optional(),
  EMAIL_PASSWORD: z.string().min(1).optional(),
  // Display name + address emails are sent from, e.g. "OncoTrace AI <no-reply@shri-ai.org>"
  EMAIL_FROM: z.string().min(1).optional(),

  // ── Field-level encryption (PatientProfile PII) ─────────────────────────
  // Required in every environment — encrypted data must round-trip even in
  // dev. Each must decode (base64) to exactly 32 bytes.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ENCRYPTION_KEY: z.string().refine(
    (val) => Buffer.from(val, 'base64').length === 32,
    'ENCRYPTION_KEY must be 32 bytes, base64-encoded.',
  ),
  // Separate key for the deterministic blind-index (used only for abhaId
  // uniqueness lookups) — never reuse ENCRYPTION_KEY for this.
  BLIND_INDEX_KEY: z.string().refine(
    (val) => Buffer.from(val, 'base64').length === 32,
    'BLIND_INDEX_KEY must be 32 bytes, base64-encoded.',
  ),

  ARGON2_MEMORY_COST: z.string().transform(Number).default('65536'),
  ARGON2_TIME_COST: z.string().transform(Number).default('3'),
  ARGON2_PARALLELISM: z.string().transform(Number).default('4'),

  AUTH_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('10'),
  API_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  API_RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
}).superRefine((val, ctx) => {
  // In production, real email delivery is mandatory — a server that can't
  // send password-reset emails should fail to start, not fail silently later.
  if (val.NODE_ENV !== 'production') return;

  (['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM'] as const).forEach(
    (key) => {
      if (val[key] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when NODE_ENV=production (email delivery must be configured).`,
        });
      }
    },
  );
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed. Server cannot start.\n');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
