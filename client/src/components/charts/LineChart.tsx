import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { clinicalDayMonth } from '../../lib/clinicalTime'

/**
 * A small, honest line chart — hand-written SVG (no chart library: recharts
 * was removed from this project on purpose).
 *
 * WHAT MAKES IT HONEST
 *  - Time is REAL time. Readings a week apart sit a week apart; nothing is
 *    spaced by index.
 *  - A long silence is shown as one. Where more than `gapDays` pass without a
 *    reading, the line BREAKS and the axis carries a break mark, instead of a
 *    straight line inventing readings nobody took. The empty weeks are drawn
 *    narrow so the readings either side are not crushed together.
 *  - The y axis never exaggerates. It spans at least `minSpan` (per metric),
 *    so HbA1c 5.8 → 5.7 is a small step, not a cliff.
 *  - No bands, no colours of judgement. It draws values; it never says they
 *    are good or bad. (Any range belongs to the lab and is shown as the lab's
 *    words in the tooltip and table — see HealthTrends.)
 *
 * HOW IT IS READ
 *  - Pointer: a crosshair snaps to the nearest reading; a tap pins it.
 *  - Keyboard: the chart is one focusable group; ← → move reading by
 *    reading, Home / End jump, Esc clears. Each reading is announced.
 *  - Everything it shows is also in the table view beside it (its accessible
 *    twin), so nothing depends on hovering.
 */

const DAY = 86_400_000

export interface ChartPoint {
  /** Epoch milliseconds. */
  t: number
  v: number
  /** Drawn as a hollow marker — e.g. a home reading beside clinic readings. */
  hollow?: boolean
}

export interface ChartSeries {
  id: string
  label: string
  /** A CSS colour, normally `var(--color-chart-1)` / `-2`. */
  color: string
  points: ChartPoint[]
}

interface LineChartProps {
  series: ChartSeries[]
  /** The smallest y span to show, in the metric's units. */
  minSpan: number
  /** A fixed y domain instead (e.g. 0–100 for a percentage). */
  fixedDomain?: [number, number]
  formatValue: (v: number) => string
  /** Tooltip / announcement for the reading at `t`. */
  describe: (t: number) => { title: string; lines: string[] }
  ariaLabel: string
  /** A gap longer than this breaks the line. */
  gapDays?: number
  height?: number
}

interface Layout {
  xOf: (t: number) => number
  clusters: Array<{ from: number; to: number; x0: number; x1: number }>
  gaps: Array<{ x0: number; x1: number; fromT: number; toT: number }>
  ticks: Array<{ t: number; x: number }>
}

function niceStep(span: number, target: number): number {
  const raw = span / Math.max(target, 1)
  const pow = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * pow) return m * pow
  return 10 * pow
}

function yDomain(values: number[], minSpan: number, fixed?: [number, number]): { lo: number; hi: number; ticks: number[] } {
  if (fixed) {
    const step = niceStep(fixed[1] - fixed[0], 4)
    const ticks: number[] = []
    for (let v = fixed[0]; v <= fixed[1] + 1e-9; v += step) ticks.push(Number(v.toFixed(6)))
    return { lo: fixed[0], hi: fixed[1], ticks }
  }
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2
    lo = mid - minSpan / 2
    hi = mid + minSpan / 2
  }
  const step = niceStep(hi - lo, 3)
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)))
  return { lo, hi, ticks }
}

/** Piecewise time scale: real time inside each run of readings, a short fixed
 *  stretch for each long silence between runs. */
function timeLayout(xs: number[], left: number, width: number, gapMs: number, labelPx: number): Layout {
  const runs: number[][] = []
  for (const t of xs) {
    const run = runs[runs.length - 1]
    if (run !== undefined && t - run[run.length - 1] <= gapMs) run.push(t)
    else runs.push([t])
  }
  const gapCount = runs.length - 1
  const gapW = gapCount > 0 ? Math.min(44, width * 0.1) : 0
  const avail = Math.max(width - gapCount * gapW, 1)
  const spans = runs.map((r) => Math.max(r[r.length - 1] - r[0], DAY))
  const total = spans.reduce((a, b) => a + b, 0)
  const minW = Math.min(56, avail / runs.length)
  let widths = spans.map((s) => Math.max(minW, (avail * s) / total))
  const sum = widths.reduce((a, b) => a + b, 0)
  widths = widths.map((w) => (w * avail) / sum)

  const clusters: Layout['clusters'] = []
  const gaps: Layout['gaps'] = []
  let x = left
  runs.forEach((r, i) => {
    clusters.push({ from: r[0], to: r[r.length - 1], x0: x, x1: x + widths[i] })
    x += widths[i]
    if (i < runs.length - 1) {
      gaps.push({ x0: x, x1: x + gapW, fromT: r[r.length - 1], toT: runs[i + 1][0] })
      x += gapW
    }
  })

  const xOf = (t: number): number => {
    const c = clusters.find((k) => t >= k.from && t <= k.to) ?? clusters[0]
    const pad = Math.min(14, (c.x1 - c.x0) * 0.12)
    if (c.to === c.from) return (c.x0 + c.x1) / 2
    return c.x0 + pad + ((t - c.from) / (c.to - c.from)) * (c.x1 - c.x0 - 2 * pad)
  }

  // Date ticks: each run's first (and last, if there is room), plus weekly
  // ticks inside a long run — never closer than one label's width.
  const ticks: Layout['ticks'] = []
  const push = (t: number) => {
    const px = xOf(t)
    if (ticks.every((k) => Math.abs(k.x - px) >= labelPx)) ticks.push({ t, x: px })
  }
  for (const c of clusters) {
    push(c.from)
    if (c.to - c.from >= 10 * DAY) for (let t = c.from + 7 * DAY; t < c.to - 3 * DAY; t += 7 * DAY) push(t)
    if (c.to !== c.from) push(c.to)
  }
  ticks.sort((a, b) => a.x - b.x)
  return { xOf, clusters, gaps, ticks }
}

export default function LineChart({
  series,
  minSpan,
  fixedDomain,
  formatValue,
  describe,
  ariaLabel,
  gapDays = 21,
  height = 220,
}: LineChartProps) {
  const liveId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(0)
  const [labelW, setLabelW] = useState({ y: 40, end: 56, x: 64, line: 20 })
  const [active, setActive] = useState<number | null>(null)
  const [pinned, setPinned] = useState(false)

  const xs = useMemo(
    () => [...new Set(series.flatMap((s) => s.points.map((p) => p.t)))].sort((a, b) => a - b),
    [series],
  )
  const values = useMemo(() => series.flatMap((s) => s.points.map((p) => p.v)), [series])
  const dom = useMemo(() => yDomain(values, minSpan, fixedDomain), [values, minSpan, fixedDomain])

  useEffect(() => {
    const el = wrapRef.current
    if (el === null) return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Measure real label widths (they grow in large-text mode) so margins fit.
  useLayoutEffect(() => {
    const m = measureRef.current
    if (m === null) return
    const w = (s: string) => { m.textContent = s; return m.getBoundingClientRect().width }
    const lastVals = series.map((s) => (s.points.length ? formatValue(s.points[s.points.length - 1].v) : ''))
    setLabelW({
      y: Math.max(...dom.ticks.map((t) => w(formatValue(t)))),
      end: Math.max(0, ...lastVals.map(w)),
      x: w('26-Jun') + 12,
      line: m.getBoundingClientRect().height || 20,
    })
  }, [series, dom.ticks, formatValue])

  const top = 12
  const axisH = Math.ceil(labelW.line) + 12
  const left = Math.ceil(labelW.y) + 10
  const right = Math.ceil(labelW.end) + 14
  const plotW = Math.max(width - left - right, 40)
  const plotH = height
  const svgH = top + plotH + axisH

  const layout = useMemo(
    () => (xs.length ? timeLayout(xs, left, plotW, gapDays * DAY, labelW.x) : null),
    [xs, left, plotW, gapDays, labelW.x],
  )
  const yOf = useCallback(
    (v: number) => top + plotH - ((v - dom.lo) / (dom.hi - dom.lo || 1)) * plotH,
    [dom.lo, dom.hi, plotH],
  )

  // Markers are hidden only on a DENSE series (many points closer than a
  // marker) — never on a few readings, where each dot, and whether it is
  // filled or hollow, carries meaning. The latest and the one being read
  // always show.
  const crowded = useMemo(() => {
    if (!layout || xs.length <= 12) return false
    let min = Infinity
    for (let i = 1; i < xs.length; i++) {
      const d = layout.xOf(xs[i]) - layout.xOf(xs[i - 1])
      if (d > 0 && d < min) min = d
    }
    return min < 10
  }, [layout, xs])

  const nearest = (px: number): number => {
    if (!layout) return 0
    let best = 0
    let bestD = Infinity
    xs.forEach((t, i) => {
      const d = Math.abs(layout.xOf(t) - px)
      if (d < bestD) { bestD = d; best = i }
    })
    return best
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (pinned || e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    setActive(nearest(e.clientX - rect.left))
  }
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = nearest(e.clientX - rect.left)
    if (pinned && active === i) { setPinned(false); setActive(null); return }
    setActive(i)
    setPinned(true)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = xs.length - 1
    let next: number | null = null
    if (e.key === 'ArrowRight') next = active === null ? 0 : Math.min(active + 1, last)
    else if (e.key === 'ArrowLeft') next = active === null ? last : Math.max(active - 1, 0)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    else if (e.key === 'Escape') { setActive(null); setPinned(false); return }
    if (next === null) return
    e.preventDefault()
    setActive(next)
    setPinned(true)
  }

  const activeT = active !== null ? xs[active] : null
  const info = activeT !== null ? describe(activeT) : null
  const activeX = activeT !== null && layout ? layout.xOf(activeT) : 0
  const tipW = Math.min(240, Math.max(width - 8, 120))
  const tipLeft = Math.min(Math.max(activeX - tipW / 2, 0), Math.max(width - tipW, 0))

  return (
    <div
      ref={wrapRef}
      role="group"
      aria-label={ariaLabel}
      aria-describedby={liveId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => { setActive(null); setPinned(false) }}
      className="focus-ring relative w-full rounded-lg"
      style={{ minHeight: svgH }}
    >
      <span ref={measureRef} aria-hidden="true" className="invisible absolute left-0 top-0 whitespace-nowrap text-sm tabular-nums" />
      <p id={liveId} className="sr-only" aria-live="polite">
        {info ? `${info.title}. ${info.lines.join('. ')}` : 'Use the left and right arrow keys to read each reading.'}
      </p>

      {width > 0 && layout && (
        <svg
          width={width}
          height={svgH}
          aria-hidden="true"
          onPointerMove={onPointerMove}
          onPointerLeave={() => { if (!pinned) setActive(null) }}
          onPointerDown={onPointerDown}
          style={{ touchAction: 'pan-y', display: 'block' }}
        >
          {/* Grid: hairlines, one step off the surface. */}
          {dom.ticks.map((v) => (
            <g key={v}>
              <line x1={left} x2={left + plotW} y1={yOf(v)} y2={yOf(v)} stroke="var(--color-border-soft)" strokeWidth={1} />
              <text x={left - 8} y={yOf(v)} dy="0.35em" textAnchor="end" className="fill-ink-subtle text-sm tabular-nums">
                {formatValue(v)}
              </text>
            </g>
          ))}

          {/* Silences: a quiet band over the plot and a break mark on the axis. */}
          {layout.gaps.map((g) => (
            <g key={g.x0}>
              <rect x={g.x0} y={top} width={g.x1 - g.x0} height={plotH} fill="var(--color-surface-2)" />
              <path
                d={`M${(g.x0 + g.x1) / 2 - 5},${top + plotH + 5} l4,-10 M${(g.x0 + g.x1) / 2 + 1},${top + plotH + 5} l4,-10`}
                stroke="var(--color-ink-subtle)"
                strokeWidth={1.5}
                fill="none"
              />
            </g>
          ))}

          {/* X axis */}
          <line x1={left} x2={left + plotW} y1={top + plotH} y2={top + plotH} stroke="var(--color-border)" strokeWidth={1} />
          {layout.ticks.map((k) => (
            <text key={k.t} x={k.x} y={top + plotH + axisH - 4} textAnchor="middle" className="fill-ink-subtle text-sm">
              {clinicalDayMonth(new Date(k.t))}
            </text>
          ))}

          {/* Crosshair */}
          {activeT !== null && (
            <line x1={activeX} x2={activeX} y1={top} y2={top + plotH} stroke="var(--color-border-strong)" strokeWidth={1} />
          )}

          {series.map((s) => {
            const runs = layout.clusters.map((c) => s.points.filter((p) => p.t >= c.from && p.t <= c.to))
            const last = s.points[s.points.length - 1]
            // The value is written at the end of each run — so a reading on
            // the far side of a silence is readable without hovering.
            const labelled = runs.map((run) => run[run.length - 1]).filter((p): p is ChartPoint => p !== undefined)
            return (
              <g key={s.id}>
                {runs.map((run, i) =>
                  run.length > 1 ? (
                    <path
                      key={i}
                      d={run.map((p, j) => `${j === 0 ? 'M' : 'L'}${layout.xOf(p.t).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null,
                )}
                {s.points.map((p) => {
                  const isActive = p.t === activeT
                  if (crowded && !isActive && p !== last) return null
                  return (
                    <circle
                      key={p.t}
                      cx={layout.xOf(p.t)}
                      cy={yOf(p.v)}
                      r={isActive ? 6 : 4.5}
                      fill={p.hollow ? 'var(--color-surface-1)' : s.color}
                      stroke={p.hollow ? s.color : 'var(--color-surface-1)'}
                      strokeWidth={2}
                    />
                  )
                })}
                {labelled.map((p) => (
                  <text
                    key={`label-${p.t}`}
                    x={layout.xOf(p.t) + 9}
                    y={yOf(p.v)}
                    dy="0.35em"
                    className="fill-ink-muted text-sm font-semibold tabular-nums"
                  >
                    {formatValue(p.v)}
                  </text>
                ))}
              </g>
            )
          })}
        </svg>
      )}

      {info && activeT !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm shadow-card-lg"
          style={{ left: tipLeft, top: 0, width: tipW }}
        >
          <p className="font-semibold text-ink">{info.title}</p>
          {info.lines.map((l, i) => (
            <p key={i} className={i === 0 ? 'mt-0.5 font-medium text-ink' : 'mt-0.5 text-ink-muted'}>{l}</p>
          ))}
        </div>
      )}
    </div>
  )
}
