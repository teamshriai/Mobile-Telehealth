import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { env } from '../config/env.config';
import { normalizeMobile } from '../utils/phone';
import type { Request } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiters
//
// Two tiers:
//  1. globalLimiter  — applied to all /api routes
//  2. authLimiter    — applied exclusively to auth endpoints (much stricter)
//
// authSlowDown — progressive delay before hard block (anti-credential-stuffing)
// In-memory store: suitable for single-instance deployments.
// For multi-instance (k8s), replace with redis store using rate-limit-redis.
// ─────────────────────────────────────────────────────────────────────────────

export const globalLimiter = rateLimit({
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error('Too many requests. Please try again later.'),
});

export const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: ApiResponseBuilder.error(
    'Too many authentication attempts. Please try again in 15 minutes.',
  ),
});

/**
 * Login gets its own limiter, separate from the rest of the auth endpoints,
 * for one reason: `skipSuccessfulRequests`.
 *
 * Brute force is a pattern of FAILURES. A successful login is proof the caller
 * already holds the credentials, so counting it protects nothing — it only
 * burns the allowance of the legitimate user, who then gets locked out of
 * their own account for 15 minutes after a handful of ordinary sign-ins
 * (several devices, a demo, a shared clinic terminal). That is a denial of
 * service against the real user, not a defence against an attacker.
 *
 * Failed attempts are still counted, and still capped well below what any
 * password-guessing run needs. `authSlowDown` in front of this adds
 * escalating latency, which is the control that actually makes guessing
 * expensive.
 *
 * Registration deliberately does NOT use this: there, a *successful* request
 * is the thing worth limiting, or one IP can mint unlimited accounts.
 */
export const loginLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: ApiResponseBuilder.error(
    'Too many failed sign-in attempts. Please try again in 15 minutes.',
  ),
});

const AUTH_SLOWDOWN_DELAY_AFTER = 3;

/** Login's slow-down, which likewise only escalates on failures. */
export const loginSlowDown = slowDown({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  delayAfter: AUTH_SLOWDOWN_DELAY_AFTER,
  delayMs: (used) => (used - AUTH_SLOWDOWN_DELAY_AFTER) * 500,
  maxDelayMs: 20_000,
  skipSuccessfulRequests: true,
});

export const authSlowDown = slowDown({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  delayAfter: AUTH_SLOWDOWN_DELAY_AFTER,
  // express-slow-down v2 replaced the flat `delayMs: number` (deprecated,
  // logs a warning on every boot) with a function so callers explicitly
  // choose the curve. This reproduces the original v1 behavior exactly:
  // request 4 waits 500ms, request 5 waits 1000ms, etc.
  delayMs: (used) => (used - AUTH_SLOWDOWN_DELAY_AFTER) * 500,
  maxDelayMs: 20_000,
});

/**
 * Refresh is NOT a credential-guessing endpoint and must not share the login
 * limiter.
 *
 * Login has 10 attempts / 15 min because each attempt is a password guess.
 * Refresh presents an existing 256-bit token: there is nothing to brute force,
 * and it fires on every page load, tab restore and access-token expiry. Behind
 * the login limiter, an ordinary user hitting refresh across a few tabs would
 * be locked out of their OWN valid session — the failure mode is a denial of
 * service against legitimate users, not protection against attackers.
 *
 * It still needs a ceiling (it is unauthenticated and writes to the database),
 * so the limit is generous but finite. Reuse detection, not rate limiting, is
 * what defends this endpoint against a stolen token.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error('Too many session refresh attempts. Please sign in again.'),
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error(
    'Too many password reset requests. Please try again in 15 minutes.',
  ),
});

export const verifyTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error(
    'Too many token verification requests. Please try again later.',
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mobile OTP
//
// ⚠️ TWO INDEPENDENT AXES, AND THAT IS THE WHOLE DESIGN. Every other limiter
// in this file keys on IP alone. For OTP that is not enough in either
// direction:
//
//   per IP only     → one attacker rotates through a botnet and grinds a
//                     single victim's number down at will.
//   per mobile only → one attacker walks a list of numbers, a handful of
//                     requests each, and never trips anything.
//
// So each endpoint gets BOTH limiters and a request must satisfy both. A
// combined "IP + mobile" bucket would be worse than either: changing one
// component mints a fresh bucket, so it is trivially bypassed by the attacker
// who has the most of whichever component is cheapest.
//
// ⚠️ The mobile key is the NORMALIZED number, so "+91 98765 43210",
// "9876543210" and "09876543210" share one bucket rather than three.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bucket by normalized mobile, falling back to IP when the body has no usable
 * number. The fallback matters: without it a malformed body would key every
 * request to the same bucket and let one caller lock out everybody.
 */
function identifierKey(req: Request): string {
  const body = req.body as { channel?: unknown; identifier?: unknown } | undefined;
  const channel = body?.channel;
  const raw = body?.identifier;
  if (typeof raw !== 'string' || typeof channel !== 'string') {
    return `ip:${req.ip ?? 'unknown'}`;
  }

  // ⚠️ CHANNEL-QUALIFIED. Two independent axes is the whole design (see the
  // note above); an unprefixed key would let the same string share a bucket
  // across channels, and a caller could then spend one channel's budget to
  // throttle the other.
  //
  // ⚠️ Normalised with the SAME functions the service uses. If this keyed on
  // the raw string, "+91 98765 43210", "9876543210" and "09876543210" would be
  // three buckets and the limit would be trivially three times looser.
  if (channel === 'Sms') {
    const normalized = normalizeMobile(raw);
    return normalized === null ? `ip:${req.ip ?? 'unknown'}` : `sms:${normalized}`;
  }
  const email = raw.trim().toLowerCase();
  return email === '' ? `ip:${req.ip ?? 'unknown'}` : `email:${email}`;
}

/** Bucket by the challenge being verified — see otpVerifyPerChallengeLimiter. */
function challengeKey(req: Request): string {
  const raw: unknown = (req.body as { challengeId?: unknown } | undefined)?.challengeId;
  return typeof raw === 'string' && raw.length > 0
    ? `challenge:${raw}`
    : `ip:${req.ip ?? 'unknown'}`;
}

const OTP_WINDOW_MS = 15 * 60 * 1000;

/**
 * Requesting a code — per HANDSET.
 *
 * ⚠️ This one protects a third party, not us. Every request sends a real SMS
 * to a real phone that may belong to someone with no interest in this
 * application. Uncapped, it is a harassment tool and a way to spend our SMS
 * budget. Modelled on forgotPasswordLimiter for exactly that reason, and it
 * deliberately does NOT skip successful requests — a successful send is
 * precisely the expensive thing being limited.
 */
export const otpRequestPerIdentifierLimiter = rateLimit({
  windowMs: OTP_WINDOW_MS,
  max: 5,
  keyGenerator: identifierKey,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error(
    'Too many codes requested for this account. Please try again in 15 minutes.',
  ),
});

/** Requesting a code — per SOURCE, so one host cannot walk a list of numbers. */
export const otpRequestPerIpLimiter = rateLimit({
  windowMs: OTP_WINDOW_MS,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error('Too many requests. Please try again in 15 minutes.'),
});

/**
 * Verifying a code — per CHALLENGE.
 *
 * ⚠️ Belt and braces with `OtpChallenge.attemptCount`, which is the real
 * control and is enforced in the database. This exists because the DB counter
 * costs a query per guess; the limiter turns away a flood before it gets that
 * far.
 */
export const otpVerifyPerChallengeLimiter = rateLimit({
  windowMs: OTP_WINDOW_MS,
  max: 10,
  keyGenerator: challengeKey,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error('Too many attempts. Request a new code.'),
});

/** Verifying a code — per SOURCE, against distributed guessing. */
export const otpVerifyPerIpLimiter = rateLimit({
  windowMs: OTP_WINDOW_MS,
  max: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error('Too many attempts. Please try again in 15 minutes.'),
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error(
    'Too many password reset attempts. Please try again in 15 minutes.',
  ),
});

/**
 * Patient search is a different threat model from login: the risk is not
 * credential guessing but an attacker (or a curious insider) scanning the
 * patient population by repeated queries. This limiter exists independently
 * of the search endpoint's own minimum-specificity validation (which refuses
 * an under-specified query at the schema level) — the two controls address
 * different attack shapes: specificity stops a single broad query, this
 * stops many narrow ones run in sequence.
 */
export const patientSearchLimiter = rateLimit({
  windowMs: env.PATIENT_SEARCH_RATE_LIMIT_WINDOW_MS,
  max: env.PATIENT_SEARCH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error('Too many patient search requests. Please try again later.'),
});
