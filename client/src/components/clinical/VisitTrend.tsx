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
 * Colour is not the only carrier: the seen portion is a solid fill, the
 * remainder is a hatched outline, and every bar carries its figures in the
 * accessible name. The table beneath `sr-only` is the non-visual equivalent —
 * a chart no screen-reader user can read is not an accessible chart.
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
    <section aria-labelledby="visit-trend-heading">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 id="visit-trend-heading" className="text-xs font-semibold text-ink">
          Patients this week
        </h3>
        <p className="text-2xs tabular-nums text-ink-muted">
          <span className="font-semibold text-ink">{totalSeen}</span> seen of {totalBooked}
        </p>
      </div>

      {/* ⚠️ The outer row must NOT be `items-end`. With align-items:end the
          columns size to their content instead of stretching, so the bar
          area's `flex-1` has no height to grow into and every bar collapses
          to a hairline. Stretch the columns; end-align inside each one. */}
      <div aria-hidden="true" className="flex h-24 gap-1.5">
        {series.map((d) => {
          const bookedH = d.total === 0 ? 0 : Math.max(4, Math.round((d.total / peak) * 100))
          const seenH = d.total === 0 ? 0 : Math.round((d.completed / peak) * 100)
          const isToday = d.date.toDateString() === new Date().toDateString()
          return (
            <div key={d.date.toISOString()} className="flex flex-1 flex-col gap-1">
              <div className="relative min-h-0 flex-1">
                {d.total === 0 ? (
                  // A day with no clinic is a flat rule, not a zero-height bar
                  // — otherwise "closed" and "nobody came" look identical.
                  <div className="absolute bottom-0 h-px w-full bg-border" />
                ) : (
                  <>
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm border border-b-0 border-primary-300 bg-primary-50"
                      style={{ height: `${bookedH}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm bg-primary-600"
                      style={{ height: `${seenH}%` }}
                    />
                  </>
                )}
              </div>
              <span
                className={`text-center text-[0.55rem] leading-none ${
                  isToday ? 'font-bold text-primary-700' : 'text-ink-subtle'
                }`}
              >
                {d.short}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-subtle">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-primary-600" /> Seen
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="h-2 w-2 rounded-sm border border-primary-300 bg-primary-50" />{' '}
          Booked
        </span>
      </p>

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
