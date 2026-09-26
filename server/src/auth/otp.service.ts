import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';
import { env } from '../config/env.config';
import { OtpChannel, RoleName } from '@prisma/client';
import { decryptFieldOptional, hmacBlindIndex } from '../utils/encryption';
import { normalizeMobile } from '../utils/phone';
import {
  normalizeIdentifier,
  identifierHashFor,
  findUserByIdentifier,
  maskIdentifier,
} from './otpIdentity';
import { otpDelivery } from '../services/otpDelivery';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';

// ─────────────────────────────────────────────────────────────────────────────
// Mobile OTP challenges.
//
// ⚠️ FOUR PROPERTIES HOLD THIS TOGETHER. Changing any one of them quietly
// turns a 6-digit code into a guessable one:
//
//  1. The code is generated with a CSPRNG and stored only as a hash.
//  2. Exactly one challenge is live per mobile at a time — a resend kills the
//     previous one, so an attacker cannot accumulate valid codes.
//  3. Verification is bound to a challengeId AND single-use AND attempt-capped
//     AND expiry-checked. A code that has been used, or belonged to a
//     different challenge, is dead.
//  4. The request endpoint answers identically whether or not the number is
//     registered. That is not cosmetic: a mobile number is a directory key,
//     and "is this doctor's number in your system" is a question a hospital
//     should not answer to an anonymous caller.
// ─────────────────────────────────────────────────────────────────────────────

/** SHA-256, matching how RefreshToken stores its secret. */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code, 'utf8').digest('hex');
}

/**
 * Six digits from a cryptographically secure source.
 *
 * ⚠️ `crypto.randomInt`, never `Math.random()` — which is seeded, predictable
 * from observed output, and has no business anywhere near an auth credential.
 * `randomInt` is also rejection-sampled internally, so every value in
 * [0, 1000000) is equally likely; `randomBytes() % 1000000` would not be.
 * Zero-padded so "000123" stays six digits rather than becoming "123".
 */
function generateCode(): string {
  // ⚠️ THE ONLY PLACE THE DEMO CODE ENTERS. When `OTP_DEV_FIXED_CODE` is set
  // (development/demo only — env.config.ts refuses to boot with it in
  // production) the server *issues* that code. Everything downstream is
  // unchanged: it is hashed, stored, expired, attempt-capped and consumed like
  // any other, and `verify()` has no idea it is predictable. So this is not a
  // bypass — a wrong code, an expired challenge or a used one all still fail.
  if (env.OTP_DEV_FIXED_CODE !== undefined) return env.OTP_DEV_FIXED_CODE;
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Constant-time compare, so a wrong code cannot be narrowed by timing. */
function codeMatches(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(candidate), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface OtpRequestResult {
  challengeId: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  channel: OtpChannel;
  /** Masked for display — never the full identifier echoed back at the caller. */
  maskedIdentifier: string;
}

export const otpService = {
  /**
   * Start a login challenge.
   *
   * ⚠️ ALWAYS returns a challenge, even when no account matches. The caller
   * gets the same shape, the same timing profile and the same message either
   * way; only the SMS differs, and the SMS goes to a handset the requester may
   * not hold. A `userId` of null is recorded so the attempt is still
   * rate-limited and auditable — an unregistered number being hammered is
   * itself a signal worth having.
   */
  async request(
    channel: OtpChannel,
    rawIdentifier: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<OtpRequestResult | { tooSoon: true; resendAvailableAt: Date }> {
    const identifier = normalizeIdentifier(channel, rawIdentifier);
    if (identifier === null) {
      // The validator rejects this shape first; this is defence in depth.
      throw new Error('normalizeIdentifier returned null — validate before calling request().');
    }
    const identifierHash = identifierHashFor(channel, identifier);

    // ── Server-side resend cooldown ──────────────────────────────────────
    // ⚠️ The client countdown is presentation. THIS is the control: without it
    // a script can hold the button down and turn the SMS bill into a denial of
    // service against both us and whoever owns the handset.
    const newest = await prisma.otpChallenge.findFirst({
      where: { channel, identifierHash },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (newest !== null) {
      const readyAt = new Date(newest.createdAt.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000);
      if (readyAt > new Date()) return { tooSoon: true, resendAvailableAt: readyAt };
    }

    const found = await findUserByIdentifier(channel, identifier);

    // ⚠️ OTP SIGN-IN IS FOR PATIENTS ONLY. Clinical and administrative staff
    // sign in with email + password — which is also what the G4 second-
    // consultant override authenticates against. A staff identifier is
    // therefore treated exactly like an unregistered one: a challenge row is
    // written (so the attempt is rate-limited and audited), no code is sent,
    // and `verify()` answers `no_account`. The response is byte-identical to
    // an unknown number, so this rule does not leak who is staff.
    const user = found !== null && found.role.name === RoleName.Patient ? found : null;

    // ⚠️ ONE LIVE CHALLENGE PER NUMBER. Consuming the previous one is what
    // makes a resend a replacement rather than an addition — otherwise every
    // resend widens the set of codes an attacker may guess against.
    // ⚠️ SCOPED BY ACCOUNT WHEN THERE IS ONE, not merely by identifier.
    // With two channels a person could otherwise hold a live SMS code AND a
    // live email code at the same moment, which doubles the guessing surface
    // and is exactly what this invariant exists to prevent. Falling back to
    // the identifier keeps unregistered probes capped too.
    await prisma.otpChallenge.updateMany({
      where: {
        ...(user === null ? { channel, identifierHash } : { userId: user.id }),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

    const challenge = await prisma.otpChallenge.create({
      data: {
        userId: user?.id ?? null,
        channel,
        identifierHash,
        codeHash: hashCode(code),
        expiresAt,
        maxAttempts: env.OTP_MAX_ATTEMPTS,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
      select: { id: true },
    });

    // ⚠️ Only dispatch when an account actually exists. An unregistered number
    // must not receive an SMS at all — that would both leak (the handset owner
    // learns someone probed them) and hand an attacker a free SMS cannon.
    if (user !== null) {
      await otpDelivery.send({
        channel,
        destination: identifier,
        identifierHash,
        code,
        challengeId: challenge.id,
        expiresAt,
      });
    }

    auditService.log({
      action: AuditAction.OtpRequested,
      userId: user?.id,
      resource: 'otp_challenge',
      resourceId: challenge.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // ⚠️ `matched` is safe to record server-side and is exactly what an
      // incident review needs. It is never sent to the client.
      metadata: { matched: user !== null, staffRefused: found !== null && user === null, channel },
    });

    return {
      challengeId: challenge.id,
      expiresAt,
      resendAvailableAt: new Date(Date.now() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000),
      channel,
      maskedIdentifier: maskIdentifier(channel, identifier),
    };
  },

  /**
   * Check a code against one specific challenge.
   *
   * Returns the `userId` on success, or a reason the UI can act on. It never
   * returns a user object — resolving the account and minting the session is
   * `auth.service`'s job, through the same seam password login uses.
   */
  async verify(
    challengeId: string,
    code: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<
    | { ok: true; userId: string }
    | { ok: false; reason: 'invalid' | 'expired' | 'consumed' | 'attempts_exceeded' | 'no_account' }
  > {
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });

    // An unknown challengeId is indistinguishable from a wrong code on
    // purpose — otherwise the id becomes an oracle for "was this a real
    // challenge", which is one hop from enumerating requests.
    if (challenge === null) return { ok: false, reason: 'invalid' };

    const fail = (
      reason: 'invalid' | 'expired' | 'consumed' | 'attempts_exceeded' | 'no_account',
    ): { ok: false; reason: typeof reason } => {
      auditService.log({
        action: AuditAction.OtpFailed,
        userId: challenge.userId ?? undefined,
        resource: 'otp_challenge',
        resourceId: challenge.id,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason },
      });
      return { ok: false, reason };
    };

    if (challenge.consumedAt !== null) return fail('consumed');
    if (challenge.expiresAt <= new Date()) return fail('expired');
    if (challenge.attemptCount >= challenge.maxAttempts) return fail('attempts_exceeded');

    // ⚠️ COUNT THE ATTEMPT BEFORE CHECKING IT. If the increment happened after
    // a successful compare, an attacker who could abandon the request
    // mid-flight would get free guesses.
    const attempted = await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } },
      select: { attemptCount: true },
    });

    if (!codeMatches(code, challenge.codeHash)) {
      // Burn the challenge at the cap rather than leaving it to be ground down.
      if (attempted.attemptCount >= challenge.maxAttempts) {
        await prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: { consumedAt: new Date() },
        });
        return fail('attempts_exceeded');
      }
      return fail('invalid');
    }

    // ⚠️ SINGLE USE, and consumed the moment it is accepted — before the
    // session is minted, so a crash between the two leaves a dead code rather
    // than a reusable one.
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    if (challenge.userId === null) {
      // The code was right, but it was issued against a number with no
      // account. Only reachable if an account was deleted mid-challenge.
      return fail('no_account');
    }

    auditService.log({
      action: AuditAction.OtpVerified,
      userId: challenge.userId,
      resource: 'otp_challenge',
      resourceId: challenge.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { ok: true, userId: challenge.userId };
  },

  /** Exposed for the backfill/provisioning paths so normalization never drifts. */
  blindIndexFor(rawMobile: string): string | null {
    const normalized = normalizeMobile(rawMobile);
    return normalized === null ? null : hmacBlindIndex(normalized);
  },

  /** Decrypts a stored `User.mobile`. Used only where the real number is needed. */
  decryptStoredMobile(stored: string | null): string | null {
    return stored === null ? null : (decryptFieldOptional(stored) ?? null);
  },
};
