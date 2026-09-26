import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dayKey } from './calendarDays'

/**
 * A small month calendar with the patient's appointments marked on it.
 *
 * Minimal on purpose: a month grid, a dot under each day that has a visit,
 * today ringed. Two dot styles, told apart by SHAPE as well as colour so the
 * difference survives colour-blindness and greyscale printing:
 *   ● filled  — confirmed by the hospital
 *   ○ ring    — requested, awaiting confirmation
 *
 * Days are keyed in India time (Asia/Kolkata), the same zone every
 * appointment time in the portal is shown in, so a 23:30 visit never lands
 * on the wrong square for a browser set to another zone.
 */

export interface CalendarMark {
  at: string
  confirmed: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function keyOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface Props {
  marks: CalendarMark[]
  /** Month to open on; defaults to the current month. */
  initialMonth?: string
  selected?: string | null
  onSelect?: (day: string | null) => void
  compact?: boolean
  label?: string
}

export default function MiniCalendar({ marks, initialMonth, selected = null, onSelect, compact = false, label = 'Appointment calendar' }: Props) {
  const today = dayKey(new Date())
  const start = initialMonth ?? today
  const [cursor, setCursor] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }))

  const byDay = useMemo(() => {
    const map = new Map<string, { confirmed: number; pending: number }>()
    for (const mk of marks) {
      const k = dayKey(mk.at)
      const cur = map.get(k) ?? { confirmed: 0, pending: 0 }
      if (mk.confirmed) cur.confirmed += 1
      else cur.pending += 1
      map.set(k, cur)
    }
    return map
  }, [marks])

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1))
    const lead = (first.getUTCDay() + 6) % 7 // Monday-first
    const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate()
    const out: Array<number | null> = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= daysInMonth; d++) out.push(d)
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [cursor])

  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(cursor.y, cursor.m, 1)))
  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const n = new Date(Date.UTC(y, m + delta, 1))
      return { y: n.getUTCFullYear(), m: n.getUTCMonth() }
    })

  const size = compact ? 'h-8 text-xs' : 'h-10 text-sm'

  return (
    <div className="select-none" aria-label={label} role="group">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink" aria-live="polite">{monthName}</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2">
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-2xs font-medium uppercase tracking-wide text-ink-subtle" aria-hidden="true">
            {compact ? w.slice(0, 1) : w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`x${i}`} aria-hidden="true" />
          const k = keyOf(cursor.y, cursor.m, d)
          const info = byDay.get(k)
          const count = (info?.confirmed ?? 0) + (info?.pending ?? 0)
          const isToday = k === today
          const isSelected = k === selected
          const dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
            .format(new Date(Date.UTC(cursor.y, cursor.m, d)))
          const aria = `${dateLabel}${isToday ? ', today' : ''}${count > 0 ? `, ${count} appointment${count === 1 ? '' : 's'}` : ''}`
          const content = (
            <>
              <span className={isToday ? 'font-bold text-primary-700' : ''}>{d}</span>
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                {info !== undefined && info.confirmed > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                {info !== undefined && info.pending > 0 && <span className="h-1.5 w-1.5 rounded-full border border-warning-fg" />}
              </span>
            </>
          )
          const cls = `flex ${size} flex-col items-center justify-center gap-0.5 rounded-lg tabular-nums ${
            isSelected ? 'bg-primary-600 text-on-primary [&_span]:!text-on-primary'
              : isToday ? 'ring-1 ring-primary-600/50 text-ink'
              : count > 0 ? 'bg-surface-2 text-ink' : 'text-ink-muted'
          }`
          return onSelect !== undefined ? (
            <button
              key={k}
              type="button"
              aria-label={aria}
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : k)}
              className={`focus-ring ${cls} ${count > 0 || isSelected ? '' : 'hover:bg-surface-2'}`}
            >
              {content}
            </button>
          ) : (
            <span key={k} aria-label={aria} role="img" className={cls}>{content}</span>
          )
        })}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-subtle">
        <span className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary-600" /> Confirmed</span>
        <span className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-warning-fg" /> Awaiting confirmation</span>
      </p>
    </div>
  )
}
