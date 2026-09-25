import { env } from '../config/env.config';
import { emailService } from './email.service';
import { writeToOutbox } from './otpOutbox';

// ─────────────────────────────────────────────────────────────────────────────
// Delivery of password-reset and set-password links.
//
// ⚠️ WHY THIS EXISTS. The forgot-password controller used to choose between
// "send an email" and "log the link" on `emailService.isConfigured` alone. That
// is the wrong question: EMAIL_* can be present and still not work (a revoked
// or wrong app password), and then the send failed fire-and-forget and the link
// went nowhere — the user was told instructions had been sent, and nothing
// existed anywhere. The question is whether the email was actually SENT.
//
// So: try the real transport; if it did not send and this is not production,
// put the link in the gitignored development outbox. In production a failure is
// logged (without the link) and nothing else happens — the public response must
// stay identical either way (anti-enumeration).
//
// ⚠️ The link is never printed to the console. A terminal is shared, scrolled
// back, pasted into chats and captured by log collectors; a reset link in it is
// a password for whoever reads it first.
//
// NEVER THROWS.
// ─────────────────────────────────────────────────────────────────────────────

export type PasswordLinkKind = 'password-reset' | 'password-setup';

export function passwordLinkFor(kind: PasswordLinkKind, rawToken: string): string {
  const base = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  return kind === 'password-setup' ? `${base}&setup=1` : base;
}

export const passwordLinkDelivery = {
  async send(args: {
    kind: PasswordLinkKind;
    to: string;
    rawToken: string;
    expiresAt: Date;
  }): Promise<{ sent: boolean }> {
    const link = passwordLinkFor(args.kind, args.rawToken);
    try {
      const { sent } =
        args.kind === 'password-setup'
          ? await emailService.sendPasswordSetupEmail(args.to, link)
          : await emailService.sendPasswordResetEmail(args.to, link);
      if (sent) return { sent: true };

      if (env.NODE_ENV === 'production') {
        console.error(
          `[auth] ${args.kind} email was not delivered (transport failed or unconfigured).`,
        );
        return { sent: false };
      }

      const written = writeToOutbox({
        kind: args.kind,
        email: args.to,
        link,
        createdAt: new Date().toISOString(),
        expiresAt: args.expiresAt.toISOString(),
      });
      console.warn(
        written
          ? `[auth] DEV MODE — ${args.kind} email not delivered; the link is in server/.otp-outbox.json.`
          : `[auth] DEV MODE — ${args.kind} email not delivered and the outbox could not be written.`,
      );
      return { sent: false };
    } catch (err) {
      console.error(`[auth] ${args.kind} delivery threw:`, (err as Error).message);
      return { sent: false };
    }
  },
};
