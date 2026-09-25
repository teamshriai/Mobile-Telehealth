import crypto from 'crypto';
import { authRepository } from './auth.repository';
import { passwordLinkDelivery } from '../services/passwordLinkDelivery';

// ─────────────────────────────────────────────────────────────────────────────
// Password-reset and set-password tokens.
//
// Its own module so provisioning (hospitalAdmin, admin, the CLI) can issue an
// invitation without importing auth.service, which already imports from
// hospitalAdmin — that would be a cycle.
// ─────────────────────────────────────────────────────────────────────────────

export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
export const SETUP_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * 32 CSPRNG bytes → 64-hex raw token; only its SHA-256 is stored. Saving
 * invalidates every earlier unused token for the user, so a new link always
 * kills the old one. The raw token is returned once and never persisted.
 */
export async function issuePasswordToken(
  userId: string,
  ttlMs: number,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + ttlMs);
  await authRepository.savePasswordResetToken(userId, tokenHash, expiresAt);
  return { rawToken, expiresAt };
}

/**
 * Issue a set-password invitation and deliver it (email, or the development
 * outbox). Called after a provisioning transaction COMMITS — a token for a row
 * that was rolled back would point at nothing.
 *
 * ⚠️ Never throws. A delivery failure must not undo a successful provisioning;
 * the person can still use "Forgot password", which issues the same kind of
 * token.
 */
export async function sendPasswordSetupInvite(
  userId: string,
  email: string,
): Promise<{ sent: boolean }> {
  try {
    const { rawToken, expiresAt } = await issuePasswordToken(userId, SETUP_TOKEN_TTL_MS);
    return await passwordLinkDelivery.send({
      kind: 'password-setup',
      to: email,
      rawToken,
      expiresAt,
    });
  } catch (err) {
    console.error('[auth] could not issue a set-password invitation:', (err as Error).message);
    return { sent: false };
  }
}
