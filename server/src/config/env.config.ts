import 'dotenv/config';
import { z } from 'zod';

/**
 * A numeric environment variable that cannot silently become NaN.
 *
 * The pattern used throughout this file until now was
 * `z.string().transform(Number)`, which accepts "abc" and yields NaN — a
 * NaN Argon2 memory cost or rate-limit ceiling is a worse outage than a
 * missing one, and it surfaces far from its cause. This validates the string
 * shape first, then range-checks the parsed number.
 */
const numericEnv = (
  fallback: string,
  { min, max }: { min: number; max: number },
) =>
  z
    .string()
    .regex(/^\d+$/, 'must be a whole number')
    .default(fallback)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

// ─────────────────────────────────────────────────────────────────────────────
// Environment Schema
// Server refuses to start if any required variable is missing or invalid.
// This is the single source of truth for all configuration.
// ─────────────────────────────────────────────────────────────────────────────

const envSchema = z
  .object({
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

    // ── Refresh tokens ──────────────────────────────────────────────────────
    // Short access token + long refresh token. Without this pair a 15-minute
    // access token logs the patient out mid-task every 15 minutes.
    //
    // REFRESH_TOKEN_TTL_DAYS is the absolute lifetime of one login session.
    // Rotation on every refresh means a stolen token is usable only until the
    // legitimate client next refreshes, at which point reuse detection fires
    // and the whole family is revoked.
    REFRESH_TOKEN_TTL_DAYS: z
      .string()
      .regex(/^\d+$/, 'REFRESH_TOKEN_TTL_DAYS must be a numeric string')
      .transform(Number)
      .default('30'),

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
    // Display name + address emails are sent from, e.g. "Stroke AI <no-reply@shri-ai.org>"
    EMAIL_FROM: z.string().min(1).optional(),

    // ── Field-level encryption (PatientProfile PII) ─────────────────────────
    // Required in every environment — encrypted data must round-trip even in
    // dev. Each must decode (base64) to exactly 32 bytes.
    // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    ENCRYPTION_KEY: z
      .string()
      .refine(
        (val) => Buffer.from(val, 'base64').length === 32,
        'ENCRYPTION_KEY must be 32 bytes, base64-encoded.',
      ),
    // Separate key for the deterministic blind-index (used only for abhaId
    // uniqueness lookups) — never reuse ENCRYPTION_KEY for this.
    BLIND_INDEX_KEY: z
      .string()
      .refine(
        (val) => Buffer.from(val, 'base64').length === 32,
        'BLIND_INDEX_KEY must be 32 bytes, base64-encoded.',
      ),

    ARGON2_MEMORY_COST: numericEnv('65536', { min: 8192, max: 1048576 }),
    ARGON2_TIME_COST: numericEnv('3', { min: 1, max: 10 }),
    ARGON2_PARALLELISM: numericEnv('4', { min: 1, max: 16 }),

    AUTH_RATE_LIMIT_WINDOW_MS: numericEnv('900000', { min: 1000, max: 86400000 }),
    AUTH_RATE_LIMIT_MAX: numericEnv('10', { min: 1, max: 10000 }),
    // Login counts FAILED attempts only (see loginLimiter), so this can be
    // higher than AUTH_RATE_LIMIT_MAX without weakening anything: 20 wrong
    // passwords in 15 minutes is still far below any guessing run, while a
    // real user signing in repeatedly is never counted at all.
    LOGIN_RATE_LIMIT_MAX: numericEnv('20', { min: 1, max: 10000 }),
    API_RATE_LIMIT_WINDOW_MS: numericEnv('900000', { min: 1000, max: 86400000 }),
    // Coarse abuse ceiling across ALL /api routes, keyed by IP.
    //
    // This was 100 per 15 minutes, which an ordinary signed-in session hits on
    // its own: the dashboard alone is ~6 requests, and NotificationBell polls
    // unread-count every 60s (15 per window while simply left open). Fifteen
    // minutes of normal use therefore produced "Too many requests" for a
    // legitimate user — a denial of service against the customer, not a
    // defence against an attacker.
    //
    // It is also per-IP, so a clinic or hospital behind one NAT address shares
    // a single allowance. 1000/15min (~66/min) still stops scraping and
    // hammering while leaving real usage far below the line; the credential
    // endpoints keep their own much stricter limiters.
    API_RATE_LIMIT_MAX: numericEnv('1000', { min: 1, max: 1000000 }),
    // Patient search is a distinct anti-enumeration surface from login: the
    // risk is not credential guessing but scanning the patient population.
    // Same window as the general API limiter, deliberately tighter max.
    PATIENT_SEARCH_RATE_LIMIT_WINDOW_MS: numericEnv('900000', { min: 1000, max: 86400000 }),
    PATIENT_SEARCH_RATE_LIMIT_MAX: numericEnv('30', { min: 1, max: 100000 }),

    // ── AI Insights (assistant) ─────────────────────────────────────────────
    //
    // Provider-neutral by design. An earlier version validated
    // `OPENAI_API_KEY` with `.startsWith('sk-')`, which took the server down
    // the moment a Groq key (`gsk_…`) was configured: vendor key prefixes are
    // not a stable contract, and the whole point of an OpenAI-COMPATIBLE
    // endpoint is that Groq, vLLM and others legitimately occupy it. A
    // malformed key should cost one handled 401, never a boot failure.
    //
    // Enablement is derived from the key being present, so no combination of
    // AI settings can stop the server starting — the feature degrades to the
    // placeholder path, which is a documented, supported state.
    AI_PROVIDER: z.enum(['groq', 'openai', 'anthropic']).default('groq'),
    AI_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
    AI_MODEL: z.string().min(1).default('openai/gpt-oss-20b'),
    AI_API_KEY: z
      .string()
      .transform((v) => (v.trim() === '' ? undefined : v.trim()))
      .optional()
      .refine(
        (v) => v === undefined || (v.length >= 20 && !/\s/.test(v)),
        'AI_API_KEY looks malformed (expected at least 20 characters and no whitespace).',
      ),

    // Real patient data must not transit a free/unvetted inference tier.
    // 'synthetic-only' refuses every patient not explicitly flagged as demo
    // data, and it is the default so a fresh deployment fails closed.
    AI_DATA_POLICY: z.enum(['synthetic-only', 'unrestricted']).default('synthetic-only'),

    // 12s, not 30s: client/src/lib/apiClient.js aborts at 15s, so a longer
    // server budget means axios gives up first and the patient sees a raw
    // network error instead of our own copy.
    AI_REQUEST_TIMEOUT_MS: numericEnv('12000', { min: 1000, max: 60000 }),
    AI_MAX_COMPLETION_TOKENS: numericEnv('500', { min: 64, max: 4096 }),
    AI_REASONING_EFFORT: z.enum(['low', 'medium', 'high']).default('low'),

    // Provider limits are configuration, not constants — changing tier must
    // not require a code change. Defaults are the Groq free tier.
    AI_LIMIT_RPM: numericEnv('30', { min: 1, max: 100000 }),
    AI_LIMIT_RPD: numericEnv('1000', { min: 1, max: 10000000 }),
    AI_LIMIT_TPM: numericEnv('8000', { min: 100, max: 100000000 }),
    AI_LIMIT_TPD: numericEnv('200000', { min: 100, max: 1000000000 }),
    /// Fraction of the vendor limit we allow ourselves, absorbing estimate error.
    AI_LIMIT_HEADROOM: z
      .string()
      .regex(/^0?\.\d+$|^1(\.0+)?$/, 'must be a fraction between 0 and 1')
      .default('0.8')
      .transform(Number),
    AI_PATIENT_DAILY_MESSAGES: numericEnv('15', { min: 1, max: 1000 }),
  })
  .superRefine((val, ctx) => {
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

/**
 * Back-compat: the key used to live in OPENAI_API_KEY / ANTHROPIC_API_KEY.
 * Accept either as a fallback so an existing .env keeps working, and say so
 * once at boot. Remove after one release.
 */
const legacyKey = process.env['OPENAI_API_KEY'] ?? process.env['ANTHROPIC_API_KEY'];
if (
  (process.env['AI_API_KEY'] ?? '').trim() === '' &&
  legacyKey !== undefined &&
  legacyKey.trim() !== ''
) {
  process.env['AI_API_KEY'] = legacyKey;
  console.warn(
    '[config] Using OPENAI_API_KEY/ANTHROPIC_API_KEY as AI_API_KEY. ' +
      'Rename it to AI_API_KEY in .env — the provider is chosen by AI_PROVIDER, ' +
      'so a vendor-named variable is misleading.',
  );
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed. Server cannot start.\n');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/**
 * The assistant is on only when a key is configured. Derived rather than a
 * separate flag, so the two can never disagree.
 */
export const aiEnabled = env.AI_API_KEY !== undefined;
