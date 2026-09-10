import type { Notification } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { notificationRepository, MAX_PAGE_SIZE } from './notification.repository';

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
   */
  notify(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    actionUrl?: string | null;
  }): void {
    void notificationRepository.create(input).catch((err: unknown) => {
      // Log and swallow — see the header note on fire-and-forget.
      console.error('[notification] failed to create:', (err as Error).message);
    });
  },
};

export { NotificationType };
