import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { env } from '../config/env.config';

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
