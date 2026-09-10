import type { Request, Response } from 'express';
import { z } from 'zod';
import { notificationService } from './notification.service';
import { MAX_PAGE_SIZE } from './notification.repository';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const idParamSchema = z.object({
  id: z.string().uuid('Invalid notification reference.'),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(MAX_PAGE_SIZE),
});

export const listNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit } = listQuerySchema.parse(req.query);
  const notifications = await notificationService.list(req.user!.id, limit);

  res
    .status(200)
    .json(ApiResponseBuilder.success('Notifications retrieved.', { notifications }));
});

/**
 * Split from the list endpoint on purpose: the bell badge polls this on every
 * page, and it must stay a single indexed COUNT rather than fetching rows.
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const unreadCount = await notificationService.unreadCount(req.user!.id);

  res.status(200).json(ApiResponseBuilder.success('Unread count retrieved.', { unreadCount }));
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  await notificationService.markRead(id, req.user!.id);

  res.status(200).json(ApiResponseBuilder.success('Notification marked as read.'));
});

export const markAllNotificationsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await notificationService.markAllRead(req.user!.id);

    res.status(200).json(ApiResponseBuilder.success('All notifications marked as read.', result));
  },
);
