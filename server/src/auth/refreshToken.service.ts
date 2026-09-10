import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { env } from '../config/env.config';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';

// ─────────────────────────────────────────────────────────────────────────────
// Refresh Token Service — rotation + reuse detection
//
// Why this exists: the access token lives 15 minutes. Without a refresh token
// the patient is signed out every 15 minutes mid-task, which for the stroke
// population (fatigue, motor impairment, slow typing) makes the portal
// effectively unusable.
//
// Threat model and the response to it:
//
//  1. Tokens are opaque 256-bit random strings — NOT JWTs. There is nothing to
//     forge because there is no signature to verify; validity is "does this
//     hash exist in the table and is it still live". A JWT here would be
//     strictly worse: it could not be revoked before its own expiry.
//
//  2. Only the SHA-256 hash is stored. A leaked database dump does not yield
//     usable tokens. SHA-256 (not Argon2) is correct here — the input is 256
//     bits of entropy, so there is no dictionary to attack, and refresh runs
//     on every page load where a deliberately slow KDF would be a DoS vector.
//
//  3. Every refresh ROTATES: the presented token is revoked and a new one
//     issued. So a given token is valid exactly once.
//
//  4. Reuse detection. Because of (3), presenting an already-revoked token
//     means two parties hold it — i.e. it was stolen. We cannot tell which
//     party is the attacker, so the only safe response is to revoke the entire
//     family and force re-authentication. `familyId` groups every token
//     descended from one login for exactly this.
// ─────────────────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_BYTES = 32; // 256 bits

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function ttlMs(): number {
  return env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

export const refreshTokenService = {
  /**
   * Issue the first refresh token of a new login session.
   * Starts a new family — this is the only place a familyId is minted.
   */
  async issue(userId: string, meta: SessionMeta): Promise<{ token: string; expiresAt: Date }> {
    const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMs());

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        familyId: crypto.randomUUID(),
        expiresAt,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return { token: raw, expiresAt };
  },

  /**
   * Validate and rotate a refresh token.
   *
   * Returns the owning userId plus a freshly issued token. Throws 401 on any
   * failure — the caller must treat every failure identically and force a new
   * sign-in. We deliberately do NOT distinguish "expired" from "revoked" from
   * "unknown" in the error message: that distinction is useful only to an
   * attacker probing which tokens once existed.
   */
  async rotate(
    rawToken: string,
    meta: SessionMeta,
  ): Promise<{ userId: string; token: string; expiresAt: Date }> {
    const tokenHash = hashToken(rawToken);
    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (existing === null) {
      throw new AppError('Invalid or expired session. Please sign in again.', 401);
    }

    // ── Reuse detection ──────────────────────────────────────────────────
    // Already rotated away, yet presented again: the token was captured.
    // Revoke the whole family — we cannot distinguish victim from attacker.
    if (existing.revokedAt !== null) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      auditService.log({
        action: AuditAction.TokenReuseDetected,
        userId: existing.userId,
        severity: AuditSeverity.Critical,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { familyId: existing.familyId, reason: 'revoked_token_replayed' },
      });

      throw new AppError('Invalid or expired session. Please sign in again.', 401);
    }

    if (existing.expiresAt <= new Date()) {
      throw new AppError('Invalid or expired session. Please sign in again.', 401);
    }

    // ── Rotate ───────────────────────────────────────────────────────────
    const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const newHash = hashToken(raw);
    // The rotated token inherits the ORIGINAL session expiry rather than
    // extending it. Otherwise an active session could be refreshed forever and
    // REFRESH_TOKEN_TTL_DAYS would cap nothing.
    const expiresAt = existing.expiresAt;

    // Both writes in one transaction: a crash between them would either strand
    // the user (old revoked, new missing) or leave two live tokens in the
    // family, which would then trip reuse detection on the next refresh.
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date(), replacedBy: newHash },
      }),
      prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: newHash,
          familyId: existing.familyId,
          expiresAt,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
      }),
    ]);

    return { userId: existing.userId, token: raw, expiresAt };
  },

  /**
   * Revoke a single token (logout of this device).
   * Silent when the token is unknown — logout must never surface an error to
   * the client, and there is nothing useful to report.
   */
  async revoke(rawToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /**
   * Revoke every live session for a user.
   * Called on password change and account deletion — both of which must
   * invalidate sessions the user may no longer control.
   */
  async revokeAllForUser(userId: string, reason: string, meta?: SessionMeta): Promise<void> {
    const { count } = await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count > 0) {
      auditService.log({
        action: AuditAction.SessionRevoked,
        userId,
        severity: AuditSeverity.Warning,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { reason, sessionsRevoked: count },
      });
    }
  },
};
