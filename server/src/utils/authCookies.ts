import type { Response } from 'express';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// Refresh-token cookie
//
// The refresh token is delivered as an httpOnly cookie, NOT in the JSON body,
// and never touches localStorage. Rationale:
//
//  - httpOnly means script cannot read it, so an XSS bug cannot exfiltrate the
//    long-lived credential. The 15-minute access token still lives in memory on
//    the client and remains XSS-reachable, but its blast radius is bounded by
//    its TTL; the refresh token's is not, which is exactly why it is the one
//    worth protecting.
//  - `path` scopes the cookie to the endpoints that actually consume it, so it
//    is not attached to every API call it has no business being on.
//  - sameSite 'lax' + a strict CORS allowlist covers CSRF for this flow: the
//    refresh endpoint is POST-only, and a cross-site POST will not carry a lax
//    cookie. In production the API and client are expected on the same site;
//    if they are ever split across registrable domains this must become
//    sameSite 'none' + secure, together with a CSRF token.
// ─────────────────────────────────────────────────────────────────────────────

export const REFRESH_COOKIE_NAME = 'strokeai_refresh';

/** Endpoints that receive the cookie: refresh and logout. */
const REFRESH_COOKIE_PATH = '/api/v1/auth';

interface RefreshCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
}

function baseCookieOptions(): RefreshCookieOptions {
  return {
    httpOnly: true,
    // Secure requires HTTPS. Enabling it in local dev (plain http) would make
    // the browser silently drop the cookie and every refresh would 401.
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  // Options must match those used to set it, or the browser keeps the original.
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}
