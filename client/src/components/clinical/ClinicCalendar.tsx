import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * The clinic month, shaded by how busy each day is.
 *
 * ⚠️ NOT A DECORATIVE WIDGET. It answers the two questions a consultant
 * actually asks a calendar — *what does today look like* and *what am I
 * walking into tomorrow* — by shading each day with its real appointment
 * count. A calendar that only shows dates is a wall ornament; this one shows
 * workload, which is why it earns rail space on a dense clinical screen.
 *
 * ⚠️ COLOUR IS NEVER THE ONLY CARRIER (§5.3). Load is encoded three ways: the
 * shade of the cell, a count printed in the cell, and the accessible name
 * ("Mon 22 September, 16 appointments"). Roughly 8% of male clinicians have a
 * colour-vision deficiency, and a rota nobody can read is worse than no rota.
 *
 * The palette is a single-hue ramp of the brand tone rather than a
 * green→amber→red scale. Busy is not *bad* — a full clinic is a normal
 * Tuesday — and borrowing the clinical severity palette for workload would
 * make an ordinary day look like an alert.
 */

export interface DayLoad {
  /** `YYYY-MM-DD`, local. */
  date: string
  total: number
  completed: number
}

interface ClinicCalendarProps {
  load: readonly DayLoad[]
  /** `YYYY-MM-DD` of the day currently being shown on the screen. */
  selected: string
  onSelect: (date: string) => void
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Local `YYYY-MM-DD`. ⚠️ Not `toISOString()`, which shifts by timezone. */
function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Monday-first offset, because an Indian clinic week starts on Monday. */
function mondayOffset(d: Date): number {
  return (d.getDay() + 6) % 7
}

export default function ClinicCalendar({ load, selected, onSelect }: ClinicCalendarProps) {
  const selectedDate = useMemo(() => parseKey(selected), [selected])
  const [cursor, setCursor] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )

  const byDate = useMemo(() => new Map(load.map((d) => [d.date, d])), [load])
  const busiest = useMemo(() => Math.max(1, ...load.map((d) => d.total)), [load])

  const todayKey = key(new Date())

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const lead = mondayOffset(first)
    const out: Array<{ date: Date; k: string } | null> = []
    for (let i = 0; i < lead; i++) out.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day)
      out.push({ date, k: key(date) })
    }
    return out
  }, [cursor])

  const monthLabel = cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  /** Four steps, so a glance distinguishes them. 0 stays unshaded. */
  function intensity(total: number): string {
    if (total === 0) return 'bg-transparent text-ink-subtle'
    const ratio = total / busiest
    if (ratio > 0.66) return 'bg-primary-600 text-on-primary font-semibold'
    if (ratio > 0.33) return 'bg-primary-300 text-ink font-medium'
    return 'bg-primary-100 text-ink'
  }

  return (
    <section aria-labelledby="clinic-cal-heading" className="select-none">
      {/* ⚠️ Heading and month-nav on separate rows.
          Both on one row with a fixed-width month label overflowed the 19rem
          rail by 22px at 1440 and by 71px at 375 — the sweep caught it as
          horizontal page scroll, which on a ward tablet is the difference
          between a usable screen and an unusable one. Nothing here may have a
          hard minimum width. */}
      <h3 id="clinic-cal-heading" className="mb-1.5 text-xs font-semibold text-ink">
        Clinic calendar
      </h3>
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="focus-ring flex-shrink-0 rounded p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        <span className="min-w-0 truncate text-center text-2xs font-medium text-ink-muted">
          {monthLabel}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="focus-ring flex-shrink-0 rounded p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label="Clinic days by workload">
        {WEEKDAYS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            aria-hidden="true"
            className="pb-1 text-center text-2xs font-medium text-ink-subtle"
          >
            {d}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (cell === null) return <div key={`pad-${i}`} aria-hidden="true" />

          const day = byDate.get(cell.k)
          const total = day?.total ?? 0
          const isSelected = cell.k === selected
          const isToday = cell.k === todayKey

          const label = cell.date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })

          return (
            <button
              key={cell.k}
              type="button"
              role="gridcell"
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              // ⚠️ The count is IN the accessible name — a screen-reader user
              // must get the workload, which is the entire point of the shading.
              aria-label={
                total === 0
                  ? `${label}, no appointments`
                  : `${label}, ${total} appointment${total === 1 ? '' : 's'}`
              }
              onClick={() => onSelect(cell.k)}
              className={`focus-ring relative flex aspect-square items-center justify-center rounded text-2xs tabular-nums transition-colors ${intensity(total)} ${
                isSelected ? 'ring-2 ring-primary-600 ring-offset-1 ring-offset-surface-1' : ''
              } ${isToday && !isSelected ? 'outline outline-1 outline-border' : ''}`}
            >
              {cell.date.getDate()}
              {/* The count, so load is legible without relying on shade. */}
              {total > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0.5 text-[0.5rem] leading-none opacity-80"
                >
                  {total}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-2xs text-ink-subtle">
        <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-primary-100" />
        <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-primary-300" />
        <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-primary-600" />
        Quieter to busier · the number in each day is its appointment count
      </p>
    </section>
  )
}
