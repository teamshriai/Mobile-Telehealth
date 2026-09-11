import type { Notification } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { notificationRepository, MAX_PAGE_SIZE } from './notification.repository';
import { emailService } from '../services/email.service';

// ─────────────────────────────────────────────────────────────────────────────
// Notification Service
//
// Two roles:
//  1. Read side for the patient's bell/list.
//  2. A `notify()` helper other domains call when something real happens.
//
// `notify()` is deliberately fire-and-forget, matching auditService: a failed
// notification insert must never fail the action that triggered it. Cancelling
// an appointment must succeed even if we cannot tell the patient about it.
//
// Nothing in this service invents clinical content. Every notification is
// caused by an action the patient or their care team actually took.
// ─────────────────────────────────────────────────────────────────────────────

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  /**
   * Set for notifications the recipient must not be able to switch off —
   * account security and credential recovery. A patient may reasonably decline
   * appointment reminders; they may not decline being told their password was
   * changed. Discretionary notifications (the default) honour preferences.
   */
  alwaysSend?: boolean;
}

/**
 * Maps a notification type to the preference key that governs it, matching the
 * `notifications` category in profile.validator.ts's `preferencesSchema`.
 *
 * `null` means "no toggle governs this type" — it is always delivered. That is
 * the honest default for types the Settings UI does not expose a switch for,
 * rather than inventing a key the patient can never actually see or change.
 */
const PREFERENCE_KEY_BY_TYPE: Record<NotificationType, string | null> = {
  [NotificationType.Appointment]: 'apptReminders',
  [NotificationType.Report]: 'reportReviews',
  [NotificationType.Medication]: null,
  [NotificationType.CareTeam]: null,
  [NotificationType.General]: null,
};

/** Reads one boolean out of the preferences JSON blob, defaulting to enabled. */
function isChannelEnabled(preferences: unknown, key: string): boolean {
  if (preferences === null || typeof preferences !== 'object') return true;

  const notifications = (preferences as Record<string, unknown>).notifications;
  if (notifications === null || typeof notifications !== 'object') return true;

  const value = (notifications as Record<string, unknown>)[key];

  // Opt-out model: absent or non-boolean means the patient has never expressed
  // a preference, so they still receive it. Only an explicit `false` suppresses.
  return value === false ? false : true;
}

/**
 * The real body of notify(). Separated so notify() stays a thin, never-throwing
 * wrapper and this can be async without changing any caller.
 */
async function dispatch(input: NotifyInput): Promise<void> {
  const recipient = await notificationRepository.findRecipientDeliveryContext(input.userId);

  // Deleted or unknown recipient: nothing to deliver to, and writing a row for
  // a user who cannot sign in to read it would just be litter.
  if (!recipient?.isActive) return;

  const preferenceKey = input.alwaysSend ? null : PREFERENCE_KEY_BY_TYPE[input.type];
  const inAppEnabled =
    preferenceKey === null || isChannelEnabled(recipient.preferences, preferenceKey);

  if (inAppEnabled) {
    await notificationRepository.create(input);
  }

  // ── Email channel ────────────────────────────────────────────────────────
  // Only when the patient has opted in AND SMTP is actually configured. A
  // security notification ignores the toggle but still needs a working
  // transport. Failure here must never surface to the triggering action, so it
  // is caught separately from the in-app write above.
  const emailEnabled = input.alwaysSend || isChannelEnabled(recipient.preferences, 'emailNotifs');

  if (emailEnabled && emailService.isConfigured) {
    await emailService
      .sendNotificationEmail({
        to: recipient.email,
        subject: input.title,
        body: input.body ?? null,
        actionPath: input.actionUrl ?? null,
      })
      .catch((err: unknown) => {
        console.error('[notification] email send failed:', (err as Error).message);
      });
  }
}

function toResponseShape(n: Notification) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    isRead: n.readAt !== null,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

export type NotificationResponse = ReturnType<typeof toResponseShape>;

export const notificationService = {
  async list(userId: string, limit = MAX_PAGE_SIZE): Promise<NotificationResponse[]> {
    const rows = await notificationRepository.listForUser(userId, limit);
    return rows.map(toResponseShape);
  },

  async unreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  },

  /**
   * Idempotent by design: marking an already-read notification returns success
   * rather than 404. The user's intent ("this is read") is satisfied either
   * way, and surfacing an error for a double-tap would be noise.
   */
  async markRead(id: string, userId: string): Promise<void> {
    await notificationRepository.markRead(id, userId);
  },

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const updated = await notificationRepository.markAllRead(userId);
    return { updated };
  },

  /**
   * Emit a notification. Never awaited by callers, never throws outward.
   *
   * Respects the patient's own notification preferences (see
   * PREFERENCE_KEY_BY_TYPE). Before this, the nine toggles in Settings →
   * Notifications validated and persisted but were read by nothing — a
   * setting that silently does nothing is the same class of defect as
   * fabricated data, so it is gated here at the single choke point every
   * notification already passes through.
   *
   * `alwaysSend` bypasses the preference check for security-critical
   * notifications a user must not be able to opt out of (see the type's own
   * doc). Discretionary notifications are opt-out.
   */
  notify(input: NotifyInput): void {
    void dispatch(input).catch((err: unknown) => {
      // Log and swallow — see the header note on fire-and-forget.
      console.error('[notification] failed to dispatch:', (err as Error).message);
    });
  },
};

export { NotificationType };
