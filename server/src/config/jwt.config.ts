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

export const jwtSignOptions: SignOptions = {
  algorithm: 'HS256',
  expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  issuer: 'oncotrace-ai',
  audience: 'oncotrace-client',
};

export const jwtVerifyOptions: VerifyOptions = {
  algorithms: ['HS256'],
  issuer: 'oncotrace-ai',
  audience: 'oncotrace-client',
};
