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

export const authSlowDown = slowDown({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  delayAfter: 3,
  delayMs: 500,
  maxDelayMs: 20_000,
});
