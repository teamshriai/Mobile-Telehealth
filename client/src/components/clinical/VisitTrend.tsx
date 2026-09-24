import { useMemo } from 'react'
import type { DayLoad } from './ClinicCalendar'

/**
 * Patients seen per day over the last week.
 *
 * ⚠️ Hand-rolled SVG rather than a charting library. `recharts` was removed
 * from this project as an unused dependency, and re-adding ~100KB gzipped to
 * draw seven bars would be a poor trade on a screen whose whole design premise
 * is information density.
 *
 * ⚠️ IT PLOTS TWO SERIES, NOT ONE. "Booked" and "seen" differ — the gap
 * between them is did-not-attends and cancellations, which is the number a
 * consultant actually wants from a week view. A single-series chart of
 * "appointments" would look tidier and say less.
 *
 * Colour is not the only carrier: the seen portion is a solid fill against a
 * near-transparent track of the same hue, so the two are separable by value
 * alone, and the figures are stated in words in the header. The table beneath
 * `sr-only` is the non-visual equivalent — a chart no screen-reader user can
 * read is not an accessible chart.
 *
 * ⚠️ One green family, matching `ClinicCalendar`, so the two panes read as a
 * single analytical region rather than two widgets that happen to be stacked.
 * The earlier version outlined the booked bar, filled the seen bar and then
 * printed a two-swatch legend — three encodings of one fact, in 0.55rem type.
 */

interface VisitTrendProps {
  load: readonly DayLoad[]
  /** How many days back to plot. Seven reads as "this week". */
  days?: number
}

export default function VisitTrend({ load, days = 7 }: VisitTrendProps) {
  const series = useMemo(() => {
    // The window ends today; anything after is a booking, not a visit.
    const todayKey = (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })()

    const upToToday = load.filter((d) => d.date <= todayKey)
    return upToToday.slice(-days).map((d) => {
      const [y, m, day] = d.date.split('-').map(Number)
      const date = new Date(y, (m ?? 1) - 1, day ?? 1)
      return {
        ...d,
        date,
        short: date.toLocaleDateString('en-IN', { weekday: 'narrow' }),
        full: date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
      }
    })
  }, [load, days])

  const peak = useMemo(() => Math.max(1, ...series.map((d) => d.total)), [series])
  const totalSeen = series.reduce((n, d) => n + d.completed, 0)
  const totalBooked = series.reduce((n, d) => n + d.total, 0)

  if (series.length === 0) {
    return (
      <p className="text-2xs text-ink-subtle">
        No clinic activity recorded in the last {days} days.
      </p>
    )
  }

  return (
    <section aria-labelledby="visit-trend-heading" className="w-full">
      <h3
        id="visit-trend-heading"
        className="text-2xs font-medium uppercase tracking-wide text-ink-subtle"
      >
        Patients this week
      </h3>
      <p className="mb-3 mt-1.5 text-xs tabular-nums text-ink-muted">
        <span className="text-sm font-semibold text-ink">{totalSeen}</span> seen of {totalBooked}{' '}
        booked
      </p>

      {/* ⚠️ The outer row must NOT be `items-end`. With align-items:end the
          columns size to their content instead of stretching, so the bar
          area's `flex-1` has no height to grow into and every bar collapses
          to a hairline. Stretch the columns; end-align inside each one. */}
      <div aria-hidden="true">
        {/* ⚠️ One continuous baseline under the whole row, rather than a border
            on each bar. Seven outlined bars is seven times the ink for the same
            information, and it was the main reason this pane read as busy. */}
        <div className="flex h-20 items-stretch gap-1.5 border-b border-border-soft sm:h-28 xl:h-20">
          {series.map((d) => {
            const bookedH = d.total === 0 ? 0 : Math.max(4, Math.round((d.total / peak) * 100))
            const seenH = d.total === 0 ? 0 : Math.round((d.completed / peak) * 100)
            return (
              <div key={d.date.toISOString()} className="relative flex-1">
                {/* A day with no clinic draws nothing; a day where patients
                    were booked but none were seen draws an empty track. The
                    two must not look alike — "closed" and "nobody came" are
                    very different facts about a Tuesday. */}
                {d.total > 0 && (
                  <>
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm bg-clinic-accent/15"
                      style={{ height: `${bookedH}%` }}
                    />
                    {/* ⚠️ `clinic-accent` at full strength is correct HERE and
                        wrong for text — it is 3.3:1 on white. A bar is a large
                        shape with no letters in it; the axis label below uses
                        `-accent-strong` for exactly this reason. */}
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm bg-clinic-accent"
                      style={{ height: `${seenH}%` }}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-1.5 flex gap-1.5">
          {series.map((d) => {
            const isToday = d.date.toDateString() === new Date().toDateString()
            return (
              <span
                key={d.date.toISOString()}
                className={`flex-1 text-center text-2xs leading-none tabular-nums ${
                  isToday ? 'font-semibold text-clinic-accent-strong' : 'text-ink-subtle'
                }`}
              >
                {d.short}
              </span>
            )
          })}
        </div>
      </div>

      {/* The chart, as data.

          ⚠️ The `sr-only` goes on a WRAPPER, not on the <table>.
          Tailwind's `sr-only` clips via `position:absolute; width:1px;
          overflow:hidden` — but `display:table` resolves its width from
          content regardless, and `white-space:nowrap` stops it shrinking. Put
          on the table itself it does not clip: this one measured 414px inside
          a 375px viewport and pushed 71px of horizontal scroll onto the whole
          page, which the breakpoint sweep caught. An absolutely-positioned
          wrapper with `overflow:hidden` does clip it. */}
      <div className="sr-only">
      <table>
        <caption>Patients booked and seen, by day, over the last {days} days</caption>
        <thead>
          <tr><th scope="col">Day</th><th scope="col">Booked</th><th scope="col">Seen</th></tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date.toISOString()}>
              <th scope="row">{d.full}</th>
              <td>{d.total}</td>
              <td>{d.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  )
}
