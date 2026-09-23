import apiClient from '../lib/apiClient'
import type { Notification } from '../types/domain'

export async function listNotifications(limit?: number): Promise<Notification[]> {
  const { notifications } = await apiClient.get<{ notifications: Notification[] }>(
    '/notifications',
    { params: limit ? { limit } : undefined },
  )
  return notifications
}

export async function getUnreadCount(): Promise<number> {
  const { unreadCount } = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count')
  return unreadCount
}

export async function markNotificationRead(id: string): Promise<void> {
  return apiClient.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiClient.patch('/notifications/read-all')
}
