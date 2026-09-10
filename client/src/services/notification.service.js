import apiClient from '../lib/apiClient'

export async function listNotifications(limit) {
  const { notifications } = await apiClient.get('/notifications', { params: limit ? { limit } : undefined })
  return notifications
}

export async function getUnreadCount() {
  const { unreadCount } = await apiClient.get('/notifications/unread-count')
  return unreadCount
}

export async function markNotificationRead(id) {
  return apiClient.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  return apiClient.patch('/notifications/read-all')
}
