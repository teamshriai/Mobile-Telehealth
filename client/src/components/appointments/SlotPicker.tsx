import { useEffect, useState } from 'react'
import { CalendarX } from 'lucide-react'
import * as doctorService from '../../services/doctor.service'
import type { SlotDay } from '../../services/doctor.service'
import { EmptyState, ErrorState, LoadingState } from '../feedback/States'
import type { ApiError } from '../../types/api'

/**
 * Pick one of a clinician's free, published slots — for booking and for
 * moving an appointment.
 *
 * ⚠️ Only real slots are offered: the list comes from the clinician's
 * published availability minus leave and existing bookings, exactly what the
 * server re-checks on submit. A slot taken in the meantime is refused by the
 * server with a sentence, not silently double-booked.
 */
const DAYS_AHEAD = 14

export default function SlotPicker({
  doctorId,
  value,
  onChange,
  excludeInstant,
}: {
  doctorId: string
  value: string | null
  onChange: (startsAt: string) => void
  /** The appointment's current time, when moving it — never offered as "new". */
  excludeInstant?: string
}) {
  const [days, setDays] = useState<SlotDay[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setDays(null)
    setError(null)
    const from = new Date()
    const to = new Date(from.getTime() + DAYS_AHEAD * 86_400_000)
    doctorService.listSlots(doctorId, from, to)
      .then((d) => {
        if (cancelled) return
        const withSlots = d
          .map((day) => ({ ...day, slots: day.slots.filter((s) => s.startsAt !== excludeInstant) }))
          .filter((day) => day.slots.length > 0)
        setDays(withSlots)
        setActiveDate(withSlots[0]?.date ?? null)
      })
      .catch((err: ApiError) => { if (!cancelled) setError(err) })
    return () => { cancelled = true }
  }, [doctorId, excludeInstant, attempt])

  if (error !== null) return <ErrorState description={error} onRetry={() => setAttempt((a) => a + 1)} />
  if (days === null) return <LoadingState label="Finding free times…" />
  if (days.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No free times in the next two weeks"
        description="This clinician has no open slots right now. Try another clinician, or choose “No preference” and the hospital will find a time."
      />
    )
  }

  const active = days.find((d) => d.date === activeDate) ?? days[0]
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
      .format(new Date(`${iso}T12:00:00+05:30`))

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Day" className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            role="radio"
            aria-checked={d.date === active.date}
            onClick={() => setActiveDate(d.date)}
            className={`focus-ring flex min-h-14 min-w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border px-3 text-xs ${
              d.date === active.date ? 'border-primary-600 bg-primary-50/40 text-primary-700' : 'border-border-soft bg-surface-1 text-ink-muted hover:border-border'
            }`}
          >
            <span className="font-semibold">{dayLabel(d.date)}</span>
            <span className="text-ink-subtle">{d.slots.length} free</span>
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label={`Times on ${dayLabel(active.date)}`} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {active.slots.map((s) => (
          <button
            key={s.startsAt}
            type="button"
            role="radio"
            aria-checked={value === s.startsAt}
            onClick={() => onChange(s.startsAt)}
            className={`focus-ring min-h-11 rounded-lg border text-sm font-medium tabular-nums ${
              value === s.startsAt ? 'border-primary-600 bg-primary-600 text-on-primary' : 'border-border-soft bg-surface-1 text-ink hover:border-primary-600/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
