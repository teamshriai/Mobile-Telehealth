import { OtpChannel } from '@prisma/client';
import { env } from '../config/env.config';
import { smsService } from './sms.service';
import { emailService } from './email.service';
import { writeToOutbox } from './otpOutbox';
import { maskIdentifier } from '../auth/otpIdentity';

// ─────────────────────────────────────────────────────────────────────────────
// One entry point for delivering an OTP, over whichever channel it belongs to.
//
// ⚠️ DELIBERATELY NOT `notification.service.ts`. That dispatcher is
// preference-gated (a user can switch email notifications off — they must not
// be able to switch off their own login), requires a `userId` (an OTP request
// must work for an identifier with no account, or the anti-enumeration
// response becomes a lie), is fire-and-forget (the response's
// `resendAvailableAt` is only honest if the send was actually attempted), and
// writes an in-app notification row (a one-time code must never land in a
// notification list). Four independent reasons; reusing it would have broken
// all four.
//
// ⚠️ NEVER THROWS. Every path resolves to `{ sent }`, matching both underlying
// transports. A gateway having a bad afternoon must not turn into a 500 on the
// login endpoint.
// ─────────────────────────────────────────────────────────────────────────────

export interface OtpDeliveryArgs {
  channel: OtpChannel;
  /** The normalized mobile or email. Never logged in full. */
  destination: string;
  identifierHash: string;
  code: string;
  challengeId: string;
  expiresAt: Date;
}

export const otpDelivery = {
  /** Whether the transport for a channel is actually configured. */
  isConfigured(channel: OtpChannel): boolean {
    return channel === OtpChannel.Sms ? smsService.isConfigured : emailService.isConfigured;
  },

  async send(args: OtpDeliveryArgs): Promise<{ sent: boolean }> {
    const masked = maskIdentifier(args.channel, args.destination);

    // ── Development fallback ────────────────────────────────────────────
    // Only when the real transport is unconfigured, and never in production.
    if (!this.isConfigured(args.channel)) {
      if (env.NODE_ENV === 'production') {
        console.error(
          `[otp] ${args.channel} transport is not configured in production — `
            + `code for ${masked} was NOT delivered.`,
        );
        return { sent: false };
      }
      const written = writeToOutbox({
        channel: args.channel,
        identifierHash: args.identifierHash,
        code: args.code,
        challengeId: args.challengeId,
        createdAt: new Date().toISOString(),
        expiresAt: args.expiresAt.toISOString(),
      });
      // ⚠️ The code is NOT in this line. Only where to find it.
      console.info(`[otp] DEV — ${args.channel} code for ${masked} → .otp-outbox.json`);
      return { sent: written };
    }

    const result =
      args.channel === OtpChannel.Sms
        ? await smsService.sendOtp({
            mobile: args.destination,
            code: args.code,
            expiresAt: args.expiresAt,
          })
        : await emailService.sendOtpEmail({
            to: args.destination,
            code: args.code,
            expiresAt: args.expiresAt,
          });

    // ⚠️ DEV FALLBACK WHEN A CONFIGURED TRANSPORT FAILS — and never in
    // production.
    //
    // `isConfigured` only means the variables are present, not that they work.
    // A wrong SMTP password, an unapproved DLT template or an expired API key
    // all look configured and deliver nothing, and without this the channel
    // becomes completely untestable: the code exists only inside a send that
    // failed. Writing it to the local outbox keeps development and the e2e
    // suite working while the real transport is being fixed.
    //
    // ⚠️ In production this branch is refused outright by `writeToOutbox`, so
    // a live server never writes codes to disk — a failed send stays failed,
    // which is the honest outcome.
    if (!result.sent && env.NODE_ENV !== 'production') {
      const written = writeToOutbox({
        channel: args.channel,
        identifierHash: args.identifierHash,
        code: args.code,
        challengeId: args.challengeId,
        createdAt: new Date().toISOString(),
        expiresAt: args.expiresAt.toISOString(),
      });
      console.warn(
        `[otp] ${args.channel} transport is configured but FAILED for ${masked} — `
          + 'code written to .otp-outbox.json so development still works. '
          + 'Real delivery is NOT happening; fix the provider credentials.',
      );
      return { sent: written };
    }

    return result;
  },
};
