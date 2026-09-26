import { OtpChannel, RoleName } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { normalizeMobile } from '../utils/phone';
import { hmacBlindIndex } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Identity resolution for an OTP challenge.
//
// ⚠️ ONE FILE FOR ALL FOUR CHANNEL DIFFERENCES — normalize, look up, mask, and
// how it is delivered. `otp.service.ts` stays channel-blind and `verify()`
// needs no channel awareness at all, because it keys off a challengeId.
//
// ⚠️ THE NORMALISERS ARE THE WRITE PATH AND THE READ PATH. `utils/phone.ts`
// exists precisely because if those two ever normalise differently the blind
// index silently stops matching and nobody can log in. The email normaliser
// carries the same obligation: it must agree with the zod `.trim()
// .toLowerCase().email()` chain the validators use.
// ─────────────────────────────────────────────────────────────────────────────

/** Lowercased and trimmed. Matches zod's `.trim().toLowerCase()` exactly. */
export function normalizeEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  // Deliberately the same shape the validators accept — not a stricter or
  // looser rule, because an address this rejects could never be looked up.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value.length <= 255 ? value : null;
}

/** `null` when the input is not a usable identifier for that channel. */
export function normalizeIdentifier(channel: OtpChannel, raw: string): string | null {
  return channel === OtpChannel.Sms ? normalizeMobile(raw) : normalizeEmail(raw);
}

/**
 * The blind index stored on the challenge.
 *
 * ⚠️ Used for BOTH channels even though `users.email` is plaintext. The hash
 * is not about how the account is stored — it is about `otp_challenges` never
 * becoming a directory of everyone's contact details.
 */
export function identifierHashFor(channel: OtpChannel, normalized: string): string {
  return hmacBlindIndex(`${channel}:${normalized}`);
}

/**
 * Resolve a login-capable account, or `null`.
 *
 * ⚠️ The two lookups are genuinely different and that asymmetry is load-bearing.
 * A mobile is encrypted at rest with a unique blind index (`User.mobileHash`),
 * so it is queried by hash. An email is plaintext and `@unique`, so it is
 * queried directly — adding a redundant `emailHash` column, or encrypting the
 * address, would break password login, forgot-password and the G4
 * second-consultant override for no gain.
 */
export async function findUserByIdentifier(
  channel: OtpChannel,
  normalized: string,
): Promise<{ id: string; role: { name: RoleName } } | null> {
  const where =
    channel === OtpChannel.Sms
      ? { mobileHash: hmacBlindIndex(normalized), deletedAt: null, isActive: true }
      : { email: normalized, deletedAt: null, isActive: true };

  return prisma.user.findFirst({ where, select: { id: true, role: { select: { name: true } } } });
}

/**
 * What the screen may display back.
 *
 * ⚠️ Never the whole identifier. The masked form is the only version allowed
 * on screen or in the single log line the transports write, and it must not be
 * reversible — enough for the owner to recognise it, not enough for a
 * bystander to learn it.
 */
export function maskIdentifier(channel: OtpChannel, normalized: string): string {
  if (channel === OtpChannel.Sms) return `••••• •${normalized.slice(-4)}`;

  const [local = '', domain = ''] = normalized.split('@');
  const dot = domain.lastIndexOf('.');
  const name = dot === -1 ? domain : domain.slice(0, dot);
  const tld = dot === -1 ? '' : domain.slice(dot);
  // `arjun@gmail.com` → `a••••@g••••.com`
  return (
    `${local.slice(0, 1)}${'•'.repeat(Math.max(1, local.length - 1))}` +
    `@${name.slice(0, 1)}${'•'.repeat(Math.max(1, name.length - 1))}${tld}`
  );
}
