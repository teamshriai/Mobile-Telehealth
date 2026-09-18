import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Calendar, Info } from 'lucide-react'
import * as notificationService from '../../services/notification.service'
import { EmptyState, ErrorState, LoadingState } from '../feedback/States.jsx'

/**
 * Notification bell — real data from the Phase 3 notification API.
 *
 * Phase 1 found the old bell rendered 4 hardcoded fake notifications. Phase 2
 * removed it outright rather than leave a fabricated or perpetually-empty
 * bell in place. This is the "something real generates notifications" moment
 * the Phase 2 comment was waiting for — appointment request/cancel now write
 * genuine rows.
 *
 * The unread count polls on an interval rather than a websocket: the traffic
 * is one small COUNT query, and a socket for a single badge would be
 * infrastructure the product does not otherwise need.
 */

const POLL_MS = 60_000

const TYPE_ICON = { Appointment: Calendar, General: Info, Report: Info, Medication: Info, CareTeam: Info }

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const triggerRef = useRef(null)

  const refreshUnread = useCallback(() => {
    notificationService.getUnreadCount().then(setUnread).catch(() => {})
  }, [])

  useEffect(() => {
    refreshUnread()
    const id = window.setInterval(refreshUnread, POLL_MS)
    return () => window.clearInterval(id)
  }, [refreshUnread])

  const loadList = useCallback(() => {
    setLoading(true)
    setError(null)
    notificationService
      .listNotifications(10)
      .then(setItems)
      // Keep the error object so ErrorState can show its support reference.
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [])

  const togglePanel = () => {
    setOpen((v) => {
      const next = !v
      if (next) loadList()
      return next
    })
  }

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    const onPointerDown = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const handleItemClick = async (item) => {
    if (!item.isRead) {
      notificationService.markNotificationRead(item.id).catch(() => {})
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
      setUnread((n) => Math.max(0, n - 1))
    }
    setOpen(false)
    if (item.actionUrl) navigate(item.actionUrl)
  }

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
    } catch {
      // Silent — the user can retry; nothing destructive happened.
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePanel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="focus-ring tap-target relative rounded-lg text-ink-muted hover:bg-surface-2"
      >
        <Bell size={19} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-on-primary"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-border-soft bg-surface-1 shadow-[0_4px_16px_0_rgba(15,23,42,0.08)]"
        >
          <div className="flex items-center justify-between border-b border-border-soft px-3.5 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {items && items.some((n) => !n.isRead) && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="focus-ring rounded px-1.5 py-1 text-xs font-medium text-primary-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <LoadingState label="Loading…" className="py-8" />
            ) : error ? (
              <ErrorState description={error} onRetry={loadList} className="py-8" />
            ) : !items || items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="We will let you know here when something needs your attention."
                className="py-8"
              />
            ) : (
              <ul>
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Info
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className={`focus-ring flex w-full items-start gap-2.5 border-b border-border-soft px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-2 ${
                          !n.isRead ? 'bg-primary-50/40' : ''
                        }`}
                      >
                        <Icon size={15} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-ink-subtle" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-ink">{n.title}</span>
                            {/* Unread is never colour-only — the word "New" carries it too. */}
                            {!n.isRead && (
                              <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700">
                                New
                              </span>
                            )}
                          </span>
                          {n.body && (
                            <span className="mt-0.5 block text-sm leading-snug text-ink-muted">{n.body}</span>
                          )}
                          <span className="mt-1 block text-xs text-ink-subtle">{timeAgo(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
