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
 * SIZE of the load dot, its opacity, and the accessible name ("Mon 22
 * September, 16 appointments"). Size is the primary carrier precisely because
 * it survives a colour-vision deficiency, which roughly 8% of male clinicians
 * have — a rota nobody can read is worse than no rota.
 *
 * ⚠️ The load dot replaced a filled cell. Shading all ~25 clinic days turned
 * the grid into a wall of saturated chips that fought the worklist beside it
 * for attention and made *today* — the one cell that matters — the hardest to
 * find. The dot carries the same information and lets the date numerals be the
 * loudest thing in the component, which is what a calendar is for.
 *
 * ⚠️ The accent is the scoped `clinic-accent` family, used by this component
 * and `VisitTrend`. The portal theme is `primary-*` blue; these two panes read
 * as one analytical region against it. Busy is not *bad* — a full clinic is a
 * normal Tuesday — so the severity palette (amber/red) is never borrowed for
 * workload, and the ramp is one green at three opacities rather than a march
 * across hues.
 *
 * ⚠️ `clinic-accent` for marks, `clinic-accent-strong` for anything with
 * letters in it. The bright tone is 3.3:1 on white: fine for a dot, below AA
 * for a date numeral. See the token block in `index.css`.
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

  /**
   * The load dot. Three steps, differentiated by size *and* opacity so the
   * ordering survives greyscale. A day with no clinic gets no dot at all —
   * absence is the clearest possible "nothing booked".
   */
  function loadDot(total: number): string | null {
    if (total === 0) return null
    const ratio = total / busiest
    if (ratio > 0.66) return 'h-1.5 w-1.5 bg-clinic-accent'
    if (ratio > 0.33) return 'h-1 w-1 bg-clinic-accent/60'
    return 'h-1 w-1 bg-clinic-accent/30'
  }

  return (
    // ⚠️ Capped width. The cells are `aspect-square`, so in a container wider
    // than the Z6 rail — which is exactly what happens below 1280, where the
    // rail drops under the worklist at full page width — each day grows into a
    // 139px block and the month becomes a wall. The cap is the rail's own
    // width, so this looks identical in the rail and sane everywhere else.
    <section aria-labelledby="clinic-cal-heading" className="w-full max-w-[22rem] select-none">
      {/* ⚠️ Heading and month-nav on separate rows.
          Both on one row with a fixed-width month label overflowed the 19rem
          rail by 22px at 1440 and by 71px at 375 — the sweep caught it as
          horizontal page scroll, which on a ward tablet is the difference
          between a usable screen and an unusable one. Nothing here may have a
          hard minimum width. */}
      <h3
        id="clinic-cal-heading"
        className="text-2xs font-medium uppercase tracking-wide text-ink-subtle"
      >
        Clinic calendar
      </h3>
      <div className="mb-3 mt-1.5 flex items-center justify-between gap-1">
        {/* The month is the dominant label here, not the section heading —
            the heading says what the pane is, the month says where you are. */}
        <span className="min-w-0 truncate text-xs font-semibold text-ink">{monthLabel}</span>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="focus-ring tap-reach rounded p-1 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="focus-ring tap-reach rounded p-1 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Clinic days by workload">
        {WEEKDAYS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            aria-hidden="true"
            className="pb-1.5 text-center text-2xs font-medium text-ink-subtle"
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
          const dot = loadDot(total)

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
              // ⚠️ Selection is a ring and nothing else. Giving it a fill as
              // well hid today's disc underneath it on the commonest case of
              // all — today selected — which is the one cell that must stay
              // identifiable.
              className={`focus-ring tap-reach flex aspect-square flex-col items-center justify-center gap-1 rounded-md transition-colors hover:bg-surface-2 ${
                isSelected ? 'ring-1 ring-clinic-accent/50' : ''
              }`}
            >
              {/* ⚠️ Today is a soft green disc, not a badge or a heavy outline.
                  It has to be the first thing the eye lands on, and it is the
                  only cell that gets a fill — which is what makes it findable
                  at a glance without shouting. */}
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums leading-none ${
                  isToday
                    ? 'bg-clinic-accent-soft font-semibold text-clinic-accent-strong'
                    : total === 0
                      ? 'text-ink-subtle'
                      : 'text-ink'
                }`}
              >
                {cell.date.getDate()}
              </span>
              {/* Workload, quietly. Size is the carrier; see the header note. */}
              <span
                aria-hidden="true"
                className={`rounded-full ${dot ?? 'h-1 w-1 bg-transparent'}`}
              />
            </button>
          )
        })}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-2xs text-ink-subtle">
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-clinic-accent/30" />
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-clinic-accent/60" />
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-clinic-accent" />
        <span>Quieter to busier</span>
      </p>
    </section>
  )
}
