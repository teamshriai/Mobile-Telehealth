import type { Request } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Request Meta Helper
//
// Shared by every controller that writes audit-log entries (ipAddress +
// userAgent). Extracted from auth.controller.ts once a second controller
// (profile) needed the identical logic.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The client IP, as recorded on every audit-log row and auth attempt.
 *
 * ⚠️ THIS READS `req.ip`, NOT `x-forwarded-for`, AND THAT IS THE POINT.
 *
 * It used to read the header directly and unconditionally, while its own
 * docstring claimed it "trusts X-Forwarded-For only when app.set('trust
 * proxy', 1) is configured". It never consulted that setting — the claim was
 * simply untrue, and `app.ts` only sets trust proxy in production anyway.
 *
 * `x-forwarded-for` is a request header: anyone who can reach the API can send
 * whatever they like in it. While the only client was loopback that was a
 * latent problem. It stopped being latent the moment the API became reachable
 * over the LAN — any device on the Wi-Fi could forge the IP written into the
 * security audit trail, which is precisely the record you would reach for to
 * work out who did something.
 *
 * Express's `req.ip` does the correct thing on both sides of that line: with
 * `trust proxy` unset it returns the real socket address and ignores the
 * header entirely; with it set (production, behind Nginx) it walks the
 * forwarded chain the configured number of hops. One source of truth, and the
 * decision lives in `app.ts` where the deployment topology is actually known.
 */
function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function getRequestMeta(req: Request): { ipAddress: string; userAgent: string | undefined } {
  return {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };
}
