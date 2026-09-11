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

  /**
   * The recipient's notification preferences plus the email address a message
   * would be sent to — fetched together because `notify()` needs both and
   * there is no reason to make two round trips for one decision.
   *
   * Returns null when the user does not exist. `preferences` is the raw JSON
   * blob from PatientProfile; the caller interprets it, because the shape is
   * owned by profile.validator.ts's `preferencesSchema`, not by this module.
   *
   * A user with no patient profile (a doctor or admin) has no preferences and
   * gets `preferences: null`, which the caller treats as "no opt-out recorded".
   */
  async findRecipientDeliveryContext(userId: string): Promise<{
    email: string;
    isActive: boolean;
    preferences: unknown;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        isActive: true,
        deletedAt: true,
        patientProfile: { select: { preferences: true } },
      },
    });

    if (user === null || user.deletedAt !== null) return null;

    return {
      email: user.email,
      isActive: user.isActive,
      preferences: user.patientProfile?.preferences ?? null,
    };
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
