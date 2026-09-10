import type { Notification } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Notification Repository
//
// Notifications are NOT encrypted. They are deliberately written to contain no
// PHI — "Appointment requested" plus a date, never a diagnosis or a reason for
// visit. The detail lives behind `actionUrl`, which requires an authenticated
// session to open. Keeping them plaintext is what allows an unread-count query
// to stay a cheap indexed COUNT.
// ─────────────────────────────────────────────────────────────────────────────

/** Cap on a single page. Prevents an unbounded query as history accumulates. */
export const MAX_PAGE_SIZE = 50;

export const notificationRepository = {
  async listForUser(userId: string, limit: number): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, MAX_PAGE_SIZE),
    });
  },

  /** Uses the [userId, readAt] index — this runs on every page load. */
  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },

  /**
   * Scoped by userId, so an id belonging to someone else simply matches nothing.
   * Returns the affected count; 0 means "not yours, or already read".
   */
  async markRead(id: string, userId: string): Promise<number> {
    const { count } = await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  },

  async markAllRead(userId: string): Promise<number> {
    const { count } = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  },

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    actionUrl?: string | null;
  }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        actionUrl: data.actionUrl ?? null,
      },
    });
  },
};
