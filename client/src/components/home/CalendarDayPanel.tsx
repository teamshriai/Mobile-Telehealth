import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Phone, Video } from 'lucide-react'
import type { Appointment } from '../../types/domain'
import { dayKey } from '../appointments/calendarDays'

/**
 * What is booked on the day picked in the Home calendar — the same question
 * the Appointments calendar answers, without leaving Home.
 *
 * Times are India time, like every appointment time in the portal. The panel
 * links through to the Appointments page opened on that day, where visits can
 * be moved or cancelled.
 */

const DAY_LABEL = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const TIME = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })

function labelForKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return DAY_LABEL.format(new Date(Date.UTC(y, m - 1, d)))
}

export default function CalendarDayPanel({
  day,
  appointments,
  onClear,
}: {
  day: string
  appointments: Appointment[]
  onClear: () => void
}) {
  const onDay = appointments
    .filter((a) => a.status !== 'Cancelled' && dayKey(a.scheduledAt) === day)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const isPast = day < dayKey(new Date())

  return (
    <div className="mt-3 rounded-lg border border-border-soft bg-surface-2 p-3" aria-live="polite" data-testid="calendar-day-panel">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{labelForKey(day)}</p>
        <button
          type="button"
          onClick={onClear}
          className="focus-ring -mr-1 -mt-1 rounded px-1.5 py-1 text-xs font-medium text-ink-subtle hover:text-ink"
        >
          Clear
        </button>
      </div>

      {onDay.length === 0 ? (
        <>
          <p className="mt-1 text-xs text-ink-muted">
            {isPast ? 'No upcoming visits on this day.' : 'Nothing booked on this day.'}
          </p>
          <Link
            to={isPast ? `/app/appointments?day=${day}` : '/app/appointments?new=1'}
            className="focus-ring mt-2 inline-flex min-h-9 items-center gap-1 rounded text-xs font-semibold text-primary-700 hover:underline"
          >
            {isPast ? 'See past appointments' : 'Request an appointment'} <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </>
      ) : (
        <>
          <ul className="mt-2 space-y-2">
            {onDay.map((a) => {
              const Icon = a.isVideo === true ? Video : a.mode === 'Phone' ? Phone : MapPin
              const confirmed = a.status === 'Confirmed' || a.status === 'Completed'
              return (
                <li key={a.id} className="flex items-start gap-2 text-xs">
                  <span className="w-14 flex-shrink-0 pt-px font-semibold text-ink tabular-nums">{TIME.format(new Date(a.scheduledAt))}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{a.doctor?.name ?? 'Your clinician'}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-ink-subtle">
                      <Icon size={12} aria-hidden="true" className="flex-shrink-0" />
                      <span className="truncate">{a.isVideo === true ? 'Video' : a.mode === 'Phone' ? 'Phone' : (a.locationName ?? 'In person')}</span>
                    </span>
                  </span>
                  <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-semibold ${confirmed ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                    {confirmed ? 'Confirmed' : 'Requested'}
                  </span>
                </li>
              )
            })}
          </ul>
          <Link
            to={`/app/appointments?day=${day}`}
            className="focus-ring mt-2 inline-flex min-h-9 items-center gap-1 rounded text-xs font-semibold text-primary-700 hover:underline"
          >
            Open in Appointments <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </>
      )}
    </div>
  )
}
