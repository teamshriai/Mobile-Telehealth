import { Home, Stethoscope } from 'lucide-react'
import { VITAL_LABEL, vitalValue, type VitalLatest, type VitalReading } from '../../services/reports.service'
import { clinicalDate, clinicalDateTime, clinicalTime } from '../../lib/clinicalTime'
import Sparkline from './Sparkline'

/**
 * Vital signs: the latest of each, where it was measured, and how it has
 * moved. Every reading carries its source — a clinic measurement and a home
 * monitor reading are both shown, never as the same thing. Nothing here says
 * whether a reading is normal.
 */

function SourceLine({ r }: { r: VitalReading }) {
  const home = r.source !== 'Facility'
  const Icon = home ? Home : Stethoscope
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-2xs text-ink-subtle">
      <Icon size={12} aria-hidden="true" className="flex-shrink-0" />
      <span className="truncate">{home ? (r.deviceName ?? 'Recorded at home') : (r.placeName ?? 'Measured in clinic')}</span>
    </span>
  )
}

export default function VitalsPanel({ latest, readings }: { latest: VitalLatest[]; readings: VitalReading[] }) {
  // One group per day AND place: a home reading and a clinic reading on the
  // same morning are different sources and are listed apart.
  const groups = new Map<string, { day: string; readings: VitalReading[] }>()
  for (const r of readings) {
    const day = clinicalDate(r.measuredAt)
    const k = `${day}|${r.source}|${r.placeName ?? r.deviceName ?? ''}`
    const g = groups.get(k) ?? { day, readings: [] }
    g.readings.push(r)
    groups.set(k, g)
  }
  // Within a group, the same order as the tiles (BP, pulse, SpO₂ …).
  const order = latest.map((l) => l.type)
  for (const g of groups.values()) g.readings.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
  return (
    <div className="space-y-6" data-testid="vitals-panel">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {latest.map((l) => (
          <li key={l.type} className="flex min-w-0 flex-col rounded-2xl border border-border-soft bg-surface-1 p-4 shadow-card" data-testid="vital-tile" data-type={l.type}>
            <p className="text-xs font-medium text-ink-muted">{VITAL_LABEL[l.type]}</p>
            {l.reading === null ? (
              <p className="mt-2 text-sm text-ink-subtle">No reading yet</p>
            ) : (
              <>
                <p className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight text-ink tabular-nums">
                  {vitalValue(l.reading)} <span className="text-sm font-normal text-ink-muted">{l.reading.unit}</span>
                </p>
                <p className="mt-0.5 text-2xs text-ink-subtle tabular-nums">
                  {clinicalDateTime(l.reading.measuredAt)}{l.reading.isDerived ? ' · calculated' : ''}
                </p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <SourceLine r={l.reading} />
                  {l.trend.length > 1 && (
                    <Sparkline
                      series={l.type === 'BloodPressure' ? [l.trend.map((t) => t.value), l.trend.map((t) => t.value2 ?? t.value)] : [l.trend.map((t) => t.value)]}
                      width={64}
                      height={22}
                    />
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <section aria-labelledby="vitals-history" className="rounded-2xl border border-border-soft bg-surface-1 shadow-card">
        <h3 id="vitals-history" className="border-b border-border-soft px-4 py-3.5 text-base font-semibold text-ink sm:px-5">All readings</h3>
        <div className="divide-y divide-border-soft">
          {[...groups.entries()].map(([k, { day, readings: list }]) => (
            <div key={k} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle tabular-nums">{day}</p>
                <SourceLine r={list[0]} />
              </div>
              <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((r) => (
                  <li key={r.id} className="flex min-w-0 items-baseline gap-2 text-sm">
                    <span className="w-12 flex-shrink-0 text-xs text-ink-subtle tabular-nums">{clinicalTime(r.measuredAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink-muted">{VITAL_LABEL[r.type]}</span>{' '}
                      <span className="font-semibold text-ink tabular-nums">{vitalValue(r)}</span>{' '}
                      <span className="text-xs text-ink-subtle">{r.unit}</span>
                      {r.qualifier && <span className="block truncate text-2xs text-ink-subtle">{r.qualifier}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
