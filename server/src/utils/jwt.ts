import jwt from 'jsonwebtoken';
import { JWT_SECRET, jwtSignOptions, jwtVerifyOptions } from '../config/jwt.config';
import type { JwtPayload } from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// JWT Utilities
// All token operations go through here — never call jwt directly elsewhere.
// Centralizing here means algorithm changes, key rotation, and claim
// additions only require changes in one file.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign a JWT access token.
 * Algorithm is locked to HS256 via jwtSignOptions — prevents alg:none attack.
 */
export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
  return jwt.sign(payload, JWT_SECRET, jwtSignOptions);
}

/**
 * Verify a JWT access token.
 * Throws TokenExpiredError or JsonWebTokenError on failure —
 * both are caught by the global error handler in errorHandler.ts.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, jwtVerifyOptions) as JwtPayload;
}
