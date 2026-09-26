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
const numericEnv = (fallback: string, { min, max }: { min: number; max: number }) =>
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
    // communications (the password reset link, and the button in every
    // notification email). Not a security boundary; CORS/ALLOWED_ORIGINS
    // remains the source of truth for allowed origins.
    //
    // ⚠️ REQUIRED, WITH NO DEFAULT, AND THAT IS DELIBERATE.
    //
    // This used to default to `http://localhost:5173` and the default was
    // wrong twice over. The port was wrong — this client runs on 3000, so the
    // link was dead even on the developer's own machine. And `localhost` in an
    // email means *the recipient's* device, so a clinician opening a
    // password-reset link on their phone got connection-refused from their own
    // handset. A default that is always wrong is worse than no default,
    // because it lets the server boot and fail silently later, out of band,
    // in a message nobody watching the logs will ever see.
    //
    // It cannot be derived from the request either: emails are sent
    // asynchronously and there is no request to derive it from. So it is
    // configuration, and it fails the boot when absent — exactly as
    // ALLOWED_ORIGINS above already does.
    CLIENT_URL: z
      .string()
      .url(
        'CLIENT_URL must be a full URL, e.g. http://192.168.1.42:3000 or https://app.example.com',
      )
      .min(1, 'CLIENT_URL is required — it is the origin used in links inside outbound email'),

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
    // Display name + address emails are sent from, e.g. "SHRI HEALTH <no-reply@shri-ai.org>"
    EMAIL_FROM: z.string().min(1).optional(),

    // ── Field-level encryption (PatientProfile PII) ─────────────────────────
    // Required in every environment — encrypted data must round-trip even in
    // dev. Each must decode (base64) to exactly 32 bytes.
    // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    // ── Mobile OTP authentication ───────────────────────────────────────────
    // ⚠️ Configured, never hardcoded at the call sites. Both of these are
    // security parameters someone will want to tune under incident conditions
    // without a code change.
    //
    // 300s (5 min) is the default because it is long enough to survive a slow
    // SMS route and a user fetching their phone from another room, and short
    // enough that a code glimpsed on a lock screen is not still live an hour
    // later. 5 attempts against a 6-digit space leaves a 1-in-200,000 chance
    // per challenge, and the challenge dies at the cap rather than throttling.
    OTP_TTL_SECONDS: numericEnv('300', { min: 60, max: 900 }),
    OTP_MAX_ATTEMPTS: numericEnv('5', { min: 3, max: 10 }),
    /// Seconds before a resend is allowed. Enforced SERVER-side; the client
    /// countdown is presentation only.
    OTP_RESEND_COOLDOWN_SECONDS: numericEnv('30', { min: 15, max: 300 }),
    /**
     * ⚠️ DEVELOPMENT / DEMO ONLY. When set, every OTP the server issues is
     * this code instead of a random one — for use while no SMS provider is
     * contracted.
     *
     * It is NOT a bypass, and that distinction is the reason it lives in code
     * generation rather than verification: the code is still hashed, stored,
     * expired, attempt-capped and single-use exactly like a random one, so any
     * other six digits fail, and an expired or used challenge fails even with
     * this one. Only the value is predictable.
     *
     * The server refuses to boot with this set in production (see superRefine
     * below). To go live: configure SMS_* and delete the line from .env — no
     * code change.
     */
    OTP_DEV_FIXED_CODE: z
      .string()
      .regex(/^\d{6}$/, 'OTP_DEV_FIXED_CODE must be exactly six digits.')
      .optional(),

    // ── Speech-to-text for patient voice health notes ──────────────────────
    // ⚠️ LOCAL ONLY, BY DECISION. A patient's recorded voice never leaves the
    // server: `local` runs Whisper in-process on the pinned, SHA-verified
    // model (npm run models:fetch:whisper). `off` is the default so a fresh
    // deployment never half-enables voice — the portal then offers typed
    // notes only, and says why.
    STT_PROVIDER: z.enum(['local', 'off']).default('off'),
    /// Longest clip accepted. Enforced on the server from the WAV header.
    STT_MAX_SECONDS: numericEnv('120', { min: 10, max: 300 }),
    /// Jobs allowed to WAIT behind the one running; beyond this, 503 "busy".
    STT_QUEUE_MAX: numericEnv('4', { min: 0, max: 50 }),
    /// A single transcription is abandoned after this long.
    STT_TIMEOUT_MS: numericEnv('120000', { min: 5000, max: 600000 }),

    // ── Encrypted file storage (voice-note audio) ──────────────────────────
    // Outside any web root; created with mode 0700 at first use. Relative
    // paths resolve from the server's working directory.
    FILE_STORAGE_DIR: z.string().trim().min(1).default('./storage'),

    // ── SMS delivery ────────────────────────────────────────────────────────
    // Optional in development (see sms.service.ts for the dev outbox), and
    // required in production via the superRefine below — the same shape the
    // EMAIL_* keys already use.
    SMS_PROVIDER: z.enum(['msg91', 'twilio']).optional(),
    SMS_API_KEY: z.string().min(8).optional(),
    SMS_SENDER_ID: z.string().min(3).max(11).optional(),
    /**
     * ⚠️ MSG91 / DLT template id. Indian carriers reject transactional SMS
     * that does not quote a registered template, so without this the provider
     * accepts the call and nothing arrives. Optional in the schema because
     * other providers do not use one.
     */
    SMS_TEMPLATE_ID: z.string().min(3).optional(),

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

    // Per provider attempt. The assistant's whole turn is bounded by
    // AI_OVERALL_DEADLINE_MS, which must stay below the client's 45s timeout
    // on sending a message (client/src/services/ai.service.ts) so the patient
    // always sees our own copy, never a raw network error.
    AI_REQUEST_TIMEOUT_MS: numericEnv('12000', { min: 1000, max: 60000 }),
    AI_OVERALL_DEADLINE_MS: numericEnv('38000', { min: 5000, max: 42000 }),
    // The reply cap. A reasoning model spends part of it thinking, so 500 cut
    // answers off; a reply that is still empty or cut off is retried once at
    // AI_RETRY_COMPLETION_TOKENS, never shown half-written.
    AI_MAX_COMPLETION_TOKENS: numericEnv('1100', { min: 64, max: 4096 }),
    AI_RETRY_COMPLETION_TOKENS: numericEnv('1800', { min: 64, max: 8192 }),
    // How much of the patient's record the assistant may be given per turn.
    AI_CONTEXT_TOKENS: numericEnv('2400', { min: 300, max: 16000 }),
    // Signed visit notes' Assessment and Plan sections, quoted to the
    // assistant (never the history or examination). Off = visits without them.
    AI_INCLUDE_NOTE_ASSESSMENT_PLAN: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
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

    // ⚠️ A predictable OTP in production is an open door to every patient
    // account whose mobile number is known. Fail the boot, never the login.
    if (val.OTP_DEV_FIXED_CODE !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_DEV_FIXED_CODE'],
        message:
          'OTP_DEV_FIXED_CODE must not be set when NODE_ENV=production. It makes every OTP ' +
          'predictable. Remove it from the environment.',
      });
    }

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

    // ⚠️ AT LEAST ONE OTP CHANNEL MUST BE FULLY CONFIGURED — not both.
    //
    // This used to demand all three SMS_* keys, justified as "a production
    // server that cannot send an SMS cannot log anybody in". That stopped
    // being true the moment email became a login channel: a deployment that
    // delivers codes by email only is now perfectly coherent, and refusing to
    // boot it would be the config check inventing a requirement the product
    // does not have.
    //
    // What must NOT be allowed is a production server with NEITHER, because
    // then nobody can sign in at all and every login request 200s with "a code
    // has been sent" while nothing is ever sent. That failure is silent and
    // indistinguishable from an unregistered account, which is exactly the
    // kind of thing that should stop a deploy rather than page someone later.
    const smsReady = Boolean(val.SMS_PROVIDER && val.SMS_API_KEY && val.SMS_SENDER_ID);
    const emailReady = Boolean(
      val.EMAIL_HOST && val.EMAIL_PORT && val.EMAIL_USER && val.EMAIL_PASSWORD && val.EMAIL_FROM,
    );
    if (!smsReady && !emailReady) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMS_PROVIDER'],
        message:
          'At least one OTP delivery channel must be configured in production: either the ' +
          'SMS_* keys or the EMAIL_* keys. Without one, no user can sign in.',
      });
    }
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
