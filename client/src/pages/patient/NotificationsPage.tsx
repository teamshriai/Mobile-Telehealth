import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import * as notificationService from '../../services/notification.service'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { NOTIFICATION_ICON, NOTIFICATION_TYPE_LABEL, timeAgo } from '../../components/layout/notificationFormat'
import type { Notification } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * All notifications, with an unread filter — the full view behind the bell.
 *
 * Opening one marks it read and follows its link, exactly as the bell does,
 * so the two surfaces never disagree about what "read" means.
 */
type Filter = 'all' | 'unread'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    notificationService.listNotifications()
      .then(setItems)
      .catch((err: ApiError) => setError(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const open = async (n: Notification) => {
    if (!n.isRead) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) ?? prev)
      notificationService.markNotificationRead(n.id).catch(() => {})
    }
    if (n.actionUrl) navigate(n.actionUrl)
  }

  const markAll = async () => {
    setBusy(true)
    try {
      await notificationService.markAllNotificationsRead()
      setItems((prev) => prev?.map((x) => ({ ...x, isRead: true })) ?? prev)
    } finally {
      setBusy(false)
    }
  }

  const unreadCount = items?.filter((n) => !n.isRead).length ?? 0
  const shown = (items ?? []).filter((n) => filter === 'all' || !n.isRead)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Notifications</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {unreadCount === 0 ? 'You are all caught up.' : `${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={busy}
            className="focus-ring tap-target inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:opacity-60"
          >
            <CheckCheck size={15} aria-hidden="true" /> Mark all read
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Show" className="inline-flex gap-1 rounded-xl border border-border-soft bg-surface-2 p-1">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={`focus-ring min-h-10 rounded-lg px-4 text-sm font-medium ${
              filter === f ? 'bg-surface-1 text-ink shadow-card-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error !== null ? (
        <ErrorState description={error} onRetry={load} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="Appointment updates and messages from your doctors will appear here."
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border-soft bg-surface-1">
          {shown.map((n) => {
            const Icon = NOTIFICATION_ICON[n.type] ?? Bell
            return (
              <li key={n.id} className="border-b border-border-soft last:border-b-0">
                <button
                  type="button"
                  onClick={() => void open(n)}
                  className={`focus-ring flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 ${
                    n.isRead ? '' : 'bg-primary-50/40'
                  }`}
                >
                  <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-ink">{n.title}</span>
                      {/* Unread is never colour-only — the word carries it. */}
                      {!n.isRead && (
                        <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-2xs font-semibold text-primary-700">New</span>
                      )}
                    </span>
                    {n.body && <span className="mt-0.5 block text-sm leading-snug text-ink-muted">{n.body}</span>}
                    <span className="mt-1 block text-xs text-ink-subtle">
                      {NOTIFICATION_TYPE_LABEL[n.type]} · {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
