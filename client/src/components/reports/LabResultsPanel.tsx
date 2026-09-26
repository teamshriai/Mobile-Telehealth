import { useMemo } from 'react'
import type { LabFlag, LabReport, LabResult } from '../../services/reports.service'
import { clinicalDate, clinicalDateTime, clinicalDayMonth } from '../../lib/clinicalTime'
import Sparkline from './Sparkline'

/**
 * Lab reports, as the laboratory issued them.
 *
 * ⚠️ THE FLAG IS THE LAB'S. "↑ High" appears only where the laboratory printed
 * it, beside the lab's own reference range; nothing here decides what is high
 * or low, or what a result means. Colour is never the only carrier: every
 * flag is also a word and an arrow.
 *
 * Tests measured more than once show a small trend and the previous value,
 * computed from the reports themselves.
 */

const FLAG: Record<LabFlag, { text: string; cls: string }> = {
  High: { text: '↑ High', cls: 'bg-warning-bg text-warning-fg' },
  Low: { text: '↓ Low', cls: 'bg-info-bg text-info-fg' },
  CriticalHigh: { text: '↑↑ Critical', cls: 'bg-critical-bg text-critical-fg' },
  CriticalLow: { text: '↓↓ Critical', cls: 'bg-critical-bg text-critical-fg' },
  Abnormal: { text: 'Abnormal', cls: 'bg-warning-bg text-warning-fg' },
}

export function FlagChip({ flag }: { flag: LabFlag | null }) {
  if (flag === null) return null
  const f = FLAG[flag]
  return (
    <span title="Flag from the lab" className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold ${f.cls}`}>
      {f.text}
    </span>
  )
}

interface History { at: string; value: number }

function ResultRow({ r, history }: { r: LabResult; history: History[] }) {
  const previous = history.length > 1 ? history[history.length - 2] : null
  return (
    <tr className="border-t border-border-soft align-top" data-testid="lab-result">
      <th scope="row" className="py-2.5 pr-3 text-left text-sm font-medium text-ink">
        {r.name}
        {r.method && <span className="block text-2xs font-normal text-ink-subtle">{r.method}</span>}
      </th>
      <td className="py-2.5 pr-3 text-sm font-semibold text-ink tabular-nums">{r.value}</td>
      <td className="py-2.5 pr-3 text-sm text-ink-muted">{r.unit ?? ''}</td>
      <td className="py-2.5 pr-3 text-sm text-ink-muted tabular-nums">{r.referenceRange ?? '—'}</td>
      <td className="py-2.5 pr-3"><FlagChip flag={r.flag} /></td>
      <td className="hidden py-2 lg:table-cell">
        {history.length > 1 && (
          <span className="flex items-center gap-2">
            <Sparkline series={[history.map((h) => h.value)]} band={{ low: r.referenceLow, high: r.referenceHigh }} width={72} height={22} />
            {previous && <span className="text-2xs text-ink-subtle tabular-nums">was {previous.value} on {clinicalDayMonth(previous.at)}</span>}
          </span>
        )}
      </td>
    </tr>
  )
}

function ResultCard({ r, history }: { r: LabResult; history: History[] }) {
  const previous = history.length > 1 ? history[history.length - 2] : null
  return (
    <li className="py-3" data-testid="lab-result">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink">{r.name}</p>
        <FlagChip flag={r.flag} />
      </div>
      <p className="mt-0.5 text-base font-semibold text-ink tabular-nums">
        {r.value} <span className="text-sm font-normal text-ink-muted">{r.unit ?? ''}</span>
      </p>
      <p className="text-xs text-ink-subtle tabular-nums">Reference: {r.referenceRange ?? '—'}</p>
      {previous && <p className="mt-0.5 text-2xs text-ink-subtle tabular-nums">Was {previous.value} on {clinicalDayMonth(previous.at)}</p>}
    </li>
  )
}

export default function LabResultsPanel({ reports }: { reports: LabReport[] }) {
  // Oldest→newest values per analyte, for trends.
  const history = useMemo(() => {
    const map = new Map<string, History[]>()
    for (const rep of [...reports].reverse()) {
      for (const r of rep.results) {
        if (r.valueNumeric === null) continue
        map.set(r.analyteCode, [...(map.get(r.analyteCode) ?? []), { at: rep.collectedAt, value: r.valueNumeric }])
      }
    }
    return map
  }, [reports])

  const historyUpTo = (code: string, at: string): History[] => (history.get(code) ?? []).filter((h) => h.at <= at)

  const byDay = new Map<string, LabReport[]>()
  for (const r of reports) {
    const k = clinicalDate(r.collectedAt)
    byDay.set(k, [...(byDay.get(k) ?? []), r])
  }

  return (
    <div className="space-y-6" data-testid="lab-panel">
      {[...byDay.entries()].map(([day, list], dayIndex) => (
        // The newest collection is open; earlier ones fold to a summary line.
        <details key={day} open={dayIndex === 0} className="group space-y-3" data-testid="lab-day">
          <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1 [&::-webkit-details-marker]:hidden">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle tabular-nums">Collected {day}</span>
            <span className="flex items-center gap-2 text-xs text-ink-subtle">
              {list.length} {list.length === 1 ? 'report' : 'reports'}
              {(() => {
                const n = list.reduce((k, r) => k + r.results.filter((x) => x.flag !== null).length, 0)
                return n > 0 ? <span className="text-warning-fg">· {n} marked by the lab</span> : null
              })()}
              <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
            </span>
          </summary>
          {list.map((rep) => {
            const flagged = rep.results.filter((r) => r.flag !== null).length
            return (
              <article key={rep.id} className="rounded-2xl border border-border-soft bg-surface-1 shadow-card" data-testid="lab-report">
                <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-border-soft px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <h4 className="text-base font-semibold text-ink">{rep.panelName}</h4>
                    <p className="text-xs text-ink-subtle">
                      {rep.specimen}{rep.fasting ? ' · fasting' : ''} · collected {clinicalDateTime(rep.collectedAt)} · reported {clinicalDateTime(rep.reportedAt)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-ink-subtle">
                    <p className="tabular-nums">{rep.reportNumber}</p>
                    {flagged > 0 && <p className="font-medium text-warning-fg">{flagged} marked by the lab</p>}
                  </div>
                </header>

                {/* Desktop: a table, as printed. */}
                <div className="hidden px-5 pb-2 md:block">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[20%]" />
                      <col className="w-[10%]" />
                      <col className="hidden w-[18%] lg:table-column" />
                    </colgroup>
                    <thead>
                      <tr className="text-left text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
                        <th scope="col" className="py-2 pr-3">Test</th>
                        <th scope="col" className="py-2 pr-3">Result</th>
                        <th scope="col" className="py-2 pr-3">Unit</th>
                        <th scope="col" className="py-2 pr-3">Reference range</th>
                        <th scope="col" className="py-2 pr-3">Flag</th>
                        <th scope="col" className="hidden py-2 lg:table-cell"><span className="sr-only">Trend</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rep.results.map((r) => <ResultRow key={r.id} r={r} history={historyUpTo(r.analyteCode, rep.collectedAt)} />)}
                    </tbody>
                  </table>
                </div>
                {/* Phones: one result per row. */}
                <ul className="divide-y divide-border-soft px-4 md:hidden">
                  {rep.results.map((r) => <ResultCard key={r.id} r={r} history={historyUpTo(r.analyteCode, rep.collectedAt)} />)}
                </ul>

                <footer className="space-y-1 border-t border-border-soft px-4 py-3 text-xs text-ink-subtle sm:px-5">
                  {rep.comment && <p className="text-ink-muted"><span className="font-medium text-ink">Lab comment:</span> {rep.comment}</p>}
                  <p>
                    {rep.labName}
                    {rep.validatedBy && <> · validated by {[rep.validatedBy.name, rep.validatedBy.role].filter(Boolean).join(', ')}</>}
                    {rep.orderedBy && <> · ordered by {rep.orderedBy}</>}
                  </p>
                </footer>
              </article>
            )
          })}
        </details>
      ))}
      <p className="text-xs leading-relaxed text-ink-subtle">
        Results are shown exactly as the laboratory issued them, with the lab&rsquo;s own reference ranges and flags. What a result means for
        you is a question for the doctor who ordered it.
      </p>
    </div>
  )
}
