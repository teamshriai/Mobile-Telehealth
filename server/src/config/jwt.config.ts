import type { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { env } from './env.config';

// ─────────────────────────────────────────────────────────────────────────────
// JWT Configuration
//
// Algorithm: HS256 (HMAC-SHA256) — explicitly set to prevent alg:none attack.
// Issuer + Audience: validates token was issued by this service for this client.
//
// Refresh token architecture: this file is intentionally structured so that
// refresh token secrets/options can be added as a second export without
// touching any other module.
// ─────────────────────────────────────────────────────────────────────────────

export const JWT_SECRET = env.JWT_SECRET;

// ── Brand migration: oncotrace-* → stroke-ai-* ───────────────────────────────
// New tokens are signed with the Stroke AI identity. Verification accepts BOTH
// the new and the legacy values, because tokens signed before this deploy are
// still within their 15-minute lifetime and there are live users holding them.
// Rejecting the legacy pair immediately would sign every active session out.
//
// REMOVE the legacy entries once the longest access-token TTL has elapsed past
// the deploy (i.e. after 15 minutes in production — keep for one release for
// safety). Tracked in STROKE_AI_PHASE_2_IMPLEMENTATION.md.
const ISSUER = 'stroke-ai';
const AUDIENCE = 'stroke-ai-client';
const LEGACY_ISSUER = 'oncotrace-ai';
const LEGACY_AUDIENCE = 'oncotrace-client';

export const jwtSignOptions: SignOptions = {
  algorithm: 'HS256',
  expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  issuer: ISSUER,
  audience: AUDIENCE,
};

export const jwtVerifyOptions: VerifyOptions = {
  algorithms: ['HS256'],
  issuer: [ISSUER, LEGACY_ISSUER],
  audience: [AUDIENCE, LEGACY_AUDIENCE],
};
