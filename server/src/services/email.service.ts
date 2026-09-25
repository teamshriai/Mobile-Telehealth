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

/**
 * The invitation a newly provisioned staff member receives. Same layout as the
 * reset email; different words, because "reset your password" is alarming to
 * someone who never had one. Carries no role, hospital or patient detail.
 */
function passwordSetupHtml(setupLink: string): string {
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
                <p style="margin:0;font-size:15px;font-weight:bold;color:#1a2e3b;">Indostates Health</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#0f172a;">Set your password</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
                  An account has been created for you by your administrator. Choose a
                  password to finish setting it up. This link expires in
                  <strong>72 hours</strong> and can only be used once.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;" align="center">
                <a href="${setupLink}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:8px;">
                  Set password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  If you were not expecting this, you can ignore this email. If the link has
                  expired, use "Forgot password" on the sign-in page.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">
                  This is an automated message. Please do not reply to this email.
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

function passwordSetupText(setupLink: string): string {
  return [
    'Set your Indostates Health password',
    '',
    'An account has been created for you by your administrator.',
    'Open the link below to choose a password. This link expires in 72 hours',
    'and can only be used once.',
    '',
    setupLink,
    '',
    'If the link has expired, use "Forgot password" on the sign-in page.',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification email
//
// Deliberately carries NO PHI. The body says what kind of thing happened and
// nothing about the clinical content — "Your appointment has been cancelled",
// never the reason for visit, never a diagnosis, never a result value. Email is
// an unencrypted transport that lands in inboxes shared with family members on
// devices we do not control, so it is treated purely as a pointer back into the
// authenticated app. The detail lives behind the sign-in.
//
// The caller (notification.service) is responsible for passing a PHI-free
// subject and body; `notificationHtml` additionally never renders anything it
// was not given.
// ─────────────────────────────────────────────────────────────────────────────

/** Escapes text for safe interpolation into the HTML template. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Turns an in-app path (`/appointments`) into an absolute URL. Anything that is
 * not a same-origin relative path is discarded rather than trusted — this value
 * ends up in an email link, so an absolute URL sneaking through would be an
 * open-redirect handed to a phisher.
 */
function toAbsoluteAppUrl(actionPath: string | null): string {
  const base = env.CLIENT_URL.replace(/\/$/, '');
  if (actionPath === null || !actionPath.startsWith('/') || actionPath.startsWith('//')) {
    return base;
  }
  return `${base}${actionPath}`;
}

function notificationHtml(subject: string, body: string | null, link: string): string {
  const safeSubject = escapeHtml(subject);
  const safeBody = body === null ? '' : escapeHtml(body);

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
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#0f172a;">${safeSubject}</h1>
                ${safeBody === '' ? '' : `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">${safeBody}</p>`}
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
                  Sign in to Stroke AI to see the details.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;" align="center">
                <a href="${link}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:8px;">
                  Open Stroke AI
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">
                  This is an automated message from Stroke AI. Please do not reply to this email.
                  You can change which notifications you receive in Settings.
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

function notificationText(subject: string, body: string | null, link: string): string {
  return [
    subject,
    '',
    ...(body === null ? [] : [body, '']),
    'Sign in to Stroke AI to see the details:',
    link,
    '',
    'You can change which notifications you receive in Settings.',
  ].join('\n');
}

/**
 * The OTP email.
 *
 * ⚠️ NO LINK, ANYWHERE IN IT. `toAbsoluteAppUrl` is deliberately unused here:
 * a login email that contains a clickable link is a phishing template with our
 * branding on it, and it trains people to click exactly the thing an attacker
 * will imitate. The message carries the code and nothing else actionable.
 *
 * ⚠️ NO PHI AND NO NAME. The header comment above is explicit that email is an
 * unencrypted transport landing in inboxes shared with family on devices we do
 * not control. An OTP email says only that somebody asked to sign in.
 */
function otpHtml(code: string, minutes: number): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:480px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
<tr><td style="height:4px;background-color:#6366f1;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px 32px 0 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#1a2e3b;">Stroke AI</td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:Arial,sans-serif;">
  <h1 style="margin:0;font-size:20px;color:#0f172a;">Your sign-in code</h1>
  <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#334155;">Enter this code to finish signing in. It expires in ${escapeHtml(String(minutes))} minutes.</p>
</td></tr>
<tr><td align="center" style="padding:24px 32px;">
  <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f172a;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 8px;">${escapeHtml(code)}</div>
</td></tr>
<tr><td style="padding:0 32px 24px 32px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
  If you did not ask to sign in, you can ignore this email. Nobody can use this code without it.
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;">
  This is an automated message from Stroke AI. Please do not reply to this email.
</td></tr>
</table></td></tr></table></body></html>`;
}

function otpText(code: string, minutes: number): string {
  return [
    'Your Stroke AI sign-in code',
    '',
    code,
    '',
    `This code expires in ${minutes} minutes.`,
    'If you did not ask to sign in, you can ignore this email.',
    '',
    'This is an automated message. Please do not reply.',
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
  /**
   * ⚠️ Same contract as every other sender here: early return when the
   * transport is unconfigured, never throws, always `{ sent }`. The caller
   * must not behave differently on failure — saying "we could not email that
   * address" would confirm the address is registered.
   */
  async sendOtpEmail(input: {
    to: string;
    code: string;
    expiresAt: Date;
  }): Promise<{ sent: boolean }> {
    if (!isConfigured) {
      return { sent: false };
    }

    const minutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60_000));

    try {
      await getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: input.to,
        // ⚠️ The code is NOT in the subject line. Subjects show on lock
        // screens and in notification previews, where a shoulder is enough.
        subject: 'Your Stroke AI sign-in code',
        text: otpText(input.code, minutes),
        html: otpHtml(input.code, minutes),
      });
      return { sent: true };
    } catch (err) {
      // ⚠️ Never logs the code or the recipient.
      console.error('[EmailService] OTP email delivery failed:', {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return { sent: false };
    }
  },

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

  /** The staff invitation. Same never-throws contract as the reset email. */
  async sendPasswordSetupEmail(to: string, setupLink: string): Promise<{ sent: boolean }> {
    if (!isConfigured) {
      return { sent: false };
    }

    try {
      await getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Set your Indostates Health password',
        text: passwordSetupText(setupLink),
        html: passwordSetupHtml(setupLink),
      });
      return { sent: true };
    } catch (err) {
      console.error('[EmailService] Password setup email delivery failed:', {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return { sent: false };
    }
  },

  /**
   * Send a generic notification email. Same never-throws contract as the reset
   * email: a delivery failure is logged safely and reported as `sent: false`.
   * The triggering action (requesting an appointment, say) must never fail
   * because SMTP is down.
   *
   * `subject` and `body` must already be free of PHI — see the note above.
   * `actionPath` is an in-app path such as `/appointments`, not a full URL.
   */
  async sendNotificationEmail(input: {
    to: string;
    subject: string;
    body?: string | null;
    actionPath?: string | null;
  }): Promise<{ sent: boolean }> {
    if (!isConfigured) {
      return { sent: false };
    }

    const body = input.body ?? null;
    const link = toAbsoluteAppUrl(input.actionPath ?? null);

    try {
      await getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: notificationText(input.subject, body, link),
        html: notificationHtml(input.subject, body, link),
      });
      return { sent: true };
    } catch (err) {
      console.error('[EmailService] Notification email delivery failed:', {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return { sent: false };
    }
  },
};
