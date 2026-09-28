import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, LineChart as LineChartIcon, Table2 } from 'lucide-react'
import LineChart, { type ChartSeries } from '../charts/LineChart'
import { Banner, Skeleton } from '../feedback/States'
import { clinicalDate, clinicalDateTime } from '../../lib/clinicalTime'
import { getTrends, type DayDoses, type LabPoint, type Trends, type TrendSource, type VitalPoint } from '../../services/trends.service'
import SectionHeading from './SectionHeading'

/**
 * "Your readings over time" — Home's line chart.
 *
 * ⚠️ IT SHOWS, IT DOES NOT JUDGE. The product cannot know how anyone is doing
 * (PatientHome.tsx), so nothing here says better, worse, improving, normal or
 * on target. It draws the recorded values over real time and says where each
 * came from: a clinic reading and a home-monitor reading are drawn differently,
 * lab results carry the LAB's own range and flag as issued (in the lab's
 * words, never as a coloured band), and doses are "as you marked them".
 *
 * Only metrics with at least two points are offered; the order is fixed and
 * the last choice is remembered on this device (the key only, never a value).
 */

type MetricKey = 'bp' | 'pulse' | 'weight' | 'ldl' | 'hba1c' | 'doses'

interface Metric {
  key: MetricKey
  label: string
  caption: string
  unit: string
  minSpan: number
  fixedDomain?: [number, number]
  series: ChartSeries[]
  format: (v: number) => string
  describe: (t: number) => { title: string; lines: string[] }
  rows: Array<{ key: string; cells: string[] }>
  columns: string[]
  more: { to: string; label: string }
}

const STORE_KEY = 'shri-health.trend-metric'
const ORDER: MetricKey[] = ['bp', 'pulse', 'weight', 'ldl', 'hba1c', 'doses']

function sourceLine(p: VitalPoint): string {
  if (p.source === 'HomeDevice') return p.place ? `Home reading · ${p.place}` : 'Home reading'
  if (p.source === 'PatientReported') return 'You entered this reading'
  return p.place ? `Clinic reading · ${p.place}` : 'Clinic reading'
}

const SOURCE_SHORT: Record<TrendSource, string> = {
  Facility: 'Clinic',
  HomeDevice: 'Home',
  PatientReported: 'You',
}

const FLAG_WORDS: Record<string, string> = {
  High: 'Marked high by the lab',
  Low: 'Marked low by the lab',
  CriticalHigh: 'Marked critically high by the lab',
  CriticalLow: 'Marked critically low by the lab',
  Abnormal: 'Marked abnormal by the lab',
}

const oneDecimal = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
const whole = (v: number) => String(Math.round(v))

function vitalMetric(key: MetricKey, label: string, points: VitalPoint[], unit: string, minSpan: number, format: (v: number) => string): Metric | null {
  if (points.length < 2) return null
  const byT = new Map(points.map((p) => [Date.parse(p.at), p]))
  return {
    key,
    label,
    caption: `${label} (${unit}). Clinic readings are filled dots; home readings are hollow.`,
    unit,
    minSpan,
    series: [{
      id: key,
      label,
      color: 'var(--color-chart-1)',
      points: points.map((p) => ({ t: Date.parse(p.at), v: p.value, hollow: p.source !== 'Facility' })),
    }],
    format,
    describe: (t) => {
      const p = byT.get(t)!
      return { title: clinicalDateTime(p.at), lines: [`${format(p.value)} ${unit}`, sourceLine(p)] }
    },
    columns: ['Date', `${label} (${unit})`, 'Where'],
    rows: [...points].reverse().map((p) => ({
      key: p.at,
      cells: [clinicalDateTime(p.at), format(p.value), `${SOURCE_SHORT[p.source]}${p.place ? ` · ${p.place}` : ''}`],
    })),
    more: { to: '/app/reports?tab=vitals', label: 'All your readings' },
  }
}

function labMetric(key: MetricKey, label: string, points: LabPoint[], minSpan: number, format: (v: number) => string): Metric | null {
  if (points.length < 2) return null
  const unit = points[points.length - 1].unit ?? ''
  const byT = new Map(points.map((p) => [Date.parse(p.at), p]))
  return {
    key,
    label,
    caption: `${label}${unit ? ` (${unit})` : ''}, as reported by the lab. The lab's own range and flag are in the details.`,
    unit,
    minSpan,
    series: [{ id: key, label, color: 'var(--color-chart-1)', points: points.map((p) => ({ t: Date.parse(p.at), v: p.value })) }],
    format,
    describe: (t) => {
      const p = byT.get(t)!
      const lines = [`${p.display} ${unit}`.trim()]
      if (p.range) lines.push(`Lab's range: ${p.range}`)
      if (p.flag) lines.push(FLAG_WORDS[p.flag] ?? `Flag from the lab: ${p.flag}`)
      return { title: `Sample taken ${clinicalDate(p.at)}`, lines }
    },
    columns: ['Sample taken', `${label}${unit ? ` (${unit})` : ''}`, "Lab's range", 'Flag from the lab'],
    rows: [...points].reverse().map((p) => ({
      key: p.at,
      cells: [clinicalDate(p.at), p.display, p.range ?? '—', p.flag ? (FLAG_WORDS[p.flag] ?? p.flag) : '—'],
    })),
    more: { to: '/app/reports?tab=labs', label: 'All your lab results' },
  }
}

/** India-time noon of a YYYY-MM-DD day, as an instant. */
const noonIst = (date: string) => `${date}T12:00:00+05:30`

/** Days grouped into weeks that END on the latest day (yesterday), newest
 *  last. A first week with fewer than four days of doses is left out rather
 *  than drawn as if it were a whole week. */
function weeklyDoses(days: DayDoses[]): Array<{ t: number; fromIso: string; toIso: string; due: number; taken: number; skipped: number; notMarked: number }> {
  const withDoses = days.filter((x) => x.due > 0)
  if (withDoses.length === 0) return []
  const DAY = 86_400_000
  const lastT = Date.parse(noonIst(withDoses[withDoses.length - 1].date))
  const buckets = new Map<number, { days: DayDoses[] }>()
  for (const x of withDoses) {
    const back = Math.round((lastT - Date.parse(noonIst(x.date))) / DAY)
    const week = Math.floor(back / 7)
    const b = buckets.get(week) ?? { days: [] }
    b.days.push(x)
    buckets.set(week, b)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b - a)
    .filter(([, b]) => b.days.length >= 4)
    .map(([, b]) => {
      const sorted = [...b.days].sort((p, q) => p.date.localeCompare(q.date))
      const sum = (k: 'due' | 'taken' | 'skipped' | 'notMarked') => sorted.reduce((n, x) => n + x[k], 0)
      const toIso = noonIst(sorted[sorted.length - 1].date)
      return { t: Date.parse(toIso), fromIso: noonIst(sorted[0].date), toIso, due: sum('due'), taken: sum('taken'), skipped: sum('skipped'), notMarked: sum('notMarked') }
    })
}

function buildMetrics(d: Trends): Metric[] {
  const out: Array<Metric | null> = []

  // Blood pressure: two numbers per reading, one mmHg axis, a legend.
  if (d.bloodPressure.length >= 2) {
    const pts = d.bloodPressure.filter((p) => p.value2 !== null)
    const byT = new Map(pts.map((p) => [Date.parse(p.at), p]))
    const bp = (p: VitalPoint) => `${whole(p.value)}/${whole(p.value2 ?? 0)}`
    out.push({
      key: 'bp',
      label: 'Blood pressure',
      caption: 'Blood pressure (mmHg): the top line is systolic, the lower line diastolic. Clinic readings are filled dots; home readings are hollow.',
      unit: 'mmHg',
      minSpan: 60,
      series: [
        { id: 'sys', label: 'Systolic', color: 'var(--color-chart-1)', points: pts.map((p) => ({ t: Date.parse(p.at), v: p.value, hollow: p.source !== 'Facility' })) },
        { id: 'dia', label: 'Diastolic', color: 'var(--color-chart-2)', points: pts.map((p) => ({ t: Date.parse(p.at), v: p.value2 as number, hollow: p.source !== 'Facility' })) },
      ],
      format: whole,
      describe: (t) => {
        const p = byT.get(t)!
        return { title: clinicalDateTime(p.at), lines: [`${bp(p)} mmHg`, sourceLine(p)] }
      },
      columns: ['Date', 'Blood pressure (mmHg)', 'Where'],
      rows: [...pts].reverse().map((p) => ({
        key: p.at,
        cells: [clinicalDateTime(p.at), bp(p), `${SOURCE_SHORT[p.source]}${p.place ? ` · ${p.place}` : ''}`],
      })),
      more: { to: '/app/reports?tab=vitals', label: 'All your readings' },
    })
  }
  out.push(vitalMetric('pulse', 'Pulse', d.pulse, 'beats a minute', 30, whole))
  out.push(vitalMetric('weight', 'Weight', d.weight, 'kg', 6, oneDecimal))
  out.push(labMetric('ldl', 'LDL cholesterol', d.ldl, 60, whole))
  out.push(labMetric('hba1c', 'HbA1c', d.hba1c, 1.5, oneDecimal))

  // Doses: what the patient marked, WEEK BY WEEK (weeks ending yesterday).
  // With one dose a day a daily line can only be 0 or 100 %, which reads as
  // alarm; a week says the same thing plainly — "6 of 7 marked taken".
  const weeks = weeklyDoses(d.doses)
  if (weeks.length >= 2) {
    const byT = new Map(weeks.map((w) => [w.t, w]))
    out.push({
      key: 'doses',
      label: 'Doses marked taken',
      caption: 'Doses you marked as taken each week, as a share of the doses due — as you logged them, up to yesterday.',
      unit: '%',
      minSpan: 100,
      fixedDomain: [0, 100],
      series: [{ id: 'doses', label: 'Doses marked taken', color: 'var(--color-chart-1)', points: weeks.map((w) => ({ t: w.t, v: Math.round((w.taken / w.due) * 100) })) }],
      format: (v) => `${Math.round(v)}%`,
      describe: (tt) => {
        const w = byT.get(tt)!
        const lines = [`${w.taken} of ${w.due} marked taken`]
        if (w.skipped > 0) lines.push(`${w.skipped} marked skipped`)
        if (w.notMarked > 0) lines.push(`${w.notMarked} not marked`)
        return { title: `${clinicalDate(w.fromIso)} – ${clinicalDate(w.toIso)}`, lines }
      },
      columns: ['Week', 'Marked taken', 'Skipped', 'Not marked'],
      rows: [...weeks].reverse().map((w) => ({
        key: w.toIso,
        cells: [`${clinicalDate(w.fromIso)} – ${clinicalDate(w.toIso)}`, `${w.taken} of ${w.due}`, String(w.skipped), String(w.notMarked)],
      })),
      more: { to: '/app/medicines', label: 'Your medicines' },
    })
  }
  return out.filter((m): m is Metric => m !== null)
}

function readStored(): MetricKey | null {
  try {
    const v = window.localStorage.getItem(STORE_KEY)
    return ORDER.includes(v as MetricKey) ? (v as MetricKey) : null
  } catch {
    return null
  }
}

export default function HealthTrends() {
  const [data, setData] = useState<Trends | null>(null)
  const [failed, setFailed] = useState(false)
  const [choice, setChoice] = useState<MetricKey | null>(readStored)
  const [asTable, setAsTable] = useState(false)
  const chipRefs = useRef(new Map<MetricKey, HTMLButtonElement | null>())

  const load = useCallback(() => {
    setFailed(false)
    getTrends().then(setData).catch(() => setFailed(true))
  }, [])
  useEffect(() => { load() }, [load])

  const metrics = useMemo(() => (data ? buildMetrics(data) : []), [data])
  const current = metrics.find((m) => m.key === choice) ?? metrics[0] ?? null

  const choose = (key: MetricKey) => {
    setChoice(key)
    try { window.localStorage.setItem(STORE_KEY, key) } catch { /* storage unavailable — not remembered */ }
  }
  const onChipKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (current === null) return
    const keys = metrics.map((m) => m.key)
    const at = keys.indexOf(current.key)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const next = keys[(at + step + keys.length) % keys.length]
    choose(next)
    chipRefs.current.get(next)?.focus()
  }

  return (
    <section aria-labelledby="trends-heading" className="flex h-full flex-col" data-testid="health-trends">
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <SectionHeading id="trends-heading" icon={Activity} tone="indigo">Your readings over time</SectionHeading>
        {current && (
          <Link to={current.more.to} className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-primary-700 hover:underline">
            {current.more.label} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="mt-3.5 flex-1 rounded-xl border border-border bg-surface-1 p-4 shadow-card sm:p-5">
        {failed ? (
          <Banner tone="error" title="We could not load your readings">
            <button type="button" onClick={load} className="focus-ring mt-1 rounded font-semibold underline underline-offset-2">
              Try again
            </button>
          </Banner>
        ) : data === null ? (
          <Skeleton className="h-64 w-full" rounded="rounded-lg" />
        ) : current === null ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            No readings to show yet. When your clinic, your lab or your home monitor records them, they appear here over time.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div
                role="radiogroup"
                aria-label="Which reading to show"
                onKeyDown={onChipKey}
                className="flex flex-wrap gap-1.5"
              >
                {metrics.map((m) => {
                  const on = m.key === current.key
                  return (
                    <button
                      key={m.key}
                      ref={(el) => { chipRefs.current.set(m.key, el) }}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={on ? 0 : -1}
                      onClick={() => choose(m.key)}
                      className={`focus-ring min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                        on ? 'border-primary-600 bg-primary-600 text-on-primary shadow-card' : 'border-border-soft text-ink-muted hover:border-border-strong hover:text-ink'
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setAsTable((v) => !v)}
                aria-pressed={asTable}
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-soft px-3 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                {asTable ? <LineChartIcon size={15} aria-hidden="true" /> : <Table2 size={15} aria-hidden="true" />}
                {asTable ? 'Show chart' : 'Show table'}
              </button>
            </div>

            <p className="mt-3 text-sm text-ink-muted">{current.caption}</p>

            {current.series.length > 1 && !asTable && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted" aria-label="Key">
                {current.series.map((s) => (
                  <li key={s.id} className="inline-flex items-center gap-1.5">
                    <svg width="18" height="8" aria-hidden="true"><line x1="1" y1="4" x2="17" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" /></svg>
                    {s.label}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              {asTable ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[20rem] text-left text-sm">
                    <caption className="sr-only">{current.label} — every recorded value</caption>
                    <thead>
                      <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-ink-subtle">
                        {current.columns.map((c) => <th key={c} scope="col" className="px-2 py-2 font-semibold">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {current.rows.map((r) => (
                        <tr key={r.key} className="border-b border-border-soft last:border-0">
                          {r.cells.map((c, i) => <td key={i} className={`px-2 py-2 ${i === 1 ? 'font-semibold text-ink tabular-nums' : 'text-ink-muted'}`}>{c}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <LineChart
                  key={current.key}
                  series={current.series}
                  minSpan={current.minSpan}
                  fixedDomain={current.fixedDomain}
                  formatValue={current.format}
                  describe={current.describe}
                  ariaLabel={`${current.label} chart. Use the left and right arrow keys to read each value.`}
                />
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
              Where the line breaks, nothing was recorded for more than three weeks. What these numbers mean for you is a question for your doctor.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
