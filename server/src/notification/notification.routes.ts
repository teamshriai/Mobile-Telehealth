import { Router } from 'express';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './notification.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Notification Router
//
// NotificationReadOwn covers marking as read too: every role that can see its
// own notifications can dismiss them. A separate write permission would be
// scaffolding for a distinction that does not exist.
//
// /unread-count is declared before /:id so it is never captured as an id.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get('/', authenticate, requirePermission(Permission.NotificationReadOwn), listNotifications);
router.get(
  '/unread-count',
  authenticate,
  requirePermission(Permission.NotificationReadOwn),
  getUnreadCount,
);
router.patch(
  '/read-all',
  authenticate,
  requirePermission(Permission.NotificationReadOwn),
  markAllNotificationsRead,
);
router.patch(
  '/:id/read',
  authenticate,
  requirePermission(Permission.NotificationReadOwn),
  markNotificationRead,
);

export { router as notificationRouter };
