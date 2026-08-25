import type { Request } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Request Meta Helper
//
// Shared by every controller that writes audit-log entries (ipAddress +
// userAgent). Extracted from auth.controller.ts once a second controller
// (profile) needed the identical logic.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract client IP safely — trusts X-Forwarded-For only when
 * app.set('trust proxy', 1) is configured (production behind Nginx/LB).
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown'
  );
}

export function getRequestMeta(req: Request): { ipAddress: string; userAgent: string | undefined } {
  return {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };
}
