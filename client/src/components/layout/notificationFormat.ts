import { Bell, Calendar, FileText, Pill, Users } from 'lucide-react'
import type { NotificationType } from '../../types/domain'

/**
 * Shared by the bell dropdown and the full notifications page, so one
 * notification never looks like two different things in two places.
 * (A separate module because Fast Refresh cannot hot-swap a file that mixes
 * components with other exports.)
 */
export const NOTIFICATION_ICON: Record<NotificationType, typeof Calendar> = {
  Appointment: Calendar,
  General: Bell,
  Report: FileText,
  Medication: Pill,
  CareTeam: Users,
}

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  Appointment: 'Appointments',
  General: 'General',
  Report: 'Reports',
  Medication: 'Medicines',
  CareTeam: 'My doctors',
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}
