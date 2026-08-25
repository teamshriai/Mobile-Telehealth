import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// Email Service
//
// Single interface for outbound transactional email. Callers (auth.controller)
// never touch nodemailer or SMTP directly — if the provider ever changes,
// only this file needs to change.
//
// Configuration comes entirely from EMAIL_* env vars (see env.config.ts).
// When they're unset (local development only — required in production),
// email is not sent; the caller's fallback (console-logging the link) takes
// over instead. This service NEVER logs the reset link, a password, or SMTP
// credentials — only safe, non-sensitive status information.
// ─────────────────────────────────────────────────────────────────────────────

const isConfigured = Boolean(
  env.EMAIL_HOST && env.EMAIL_PORT && env.EMAIL_USER && env.EMAIL_PASSWORD && env.EMAIL_FROM,
);

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter === null) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE, // true = implicit TLS (port 465), false = STARTTLS (port 587)
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
    });
  }
  return transporter;
}

function passwordResetHtml(resetLink: string): string {
  // Table-based layout, inline styles only — matches broad email-client
  // compatibility requirements (Outlook, Gmail, mobile clients).
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="height:4px;background-color:#6366f1;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:15px;font-weight:bold;color:#1a2e3b;">Stroke AI</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#0f172a;">Reset your password</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
                  We received a request to reset the password for your Stroke AI account.
                  Click the button below to choose a new password. This link expires in
                  <strong>15 minutes</strong> and can only be used once.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;" align="center">
                <a href="${resetLink}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:8px;">
                  Reset password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  If you didn't request a password reset, you can safely ignore this email —
                  your password will not be changed. If you're concerned about your account's
                  security, please contact support.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">
                  This is an automated message from Stroke AI. Please do not reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function passwordResetText(resetLink: string): string {
  return [
    'Reset your Stroke AI password',
    '',
    'We received a request to reset the password for your Stroke AI account.',
    'Open the link below to choose a new password. This link expires in 15 minutes',
    'and can only be used once.',
    '',
    resetLink,
    '',
    "If you didn't request a password reset, you can safely ignore this email —",
    'your password will not be changed.',
  ].join('\n');
}

export const emailService = {
  /** Whether real SMTP delivery is configured (false in local dev by default). */
  isConfigured,

  /**
   * Send the password-reset email. Never throws — a delivery failure is
   * logged (safely, no token/credentials) and reported back as `sent: false`
   * so the caller can decide what, if anything, to do about it. The public
   * HTTP response must stay identical either way (anti-enumeration).
   */
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<{ sent: boolean }> {
    if (!isConfigured) {
      return { sent: false };
    }

    try {
      await getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Reset your Stroke AI password',
        text: passwordResetText(resetLink),
        html: passwordResetHtml(resetLink),
      });
      return { sent: true };
    } catch (err) {
      console.error('[EmailService] Password reset email delivery failed:', {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return { sent: false };
    }
  },
};
