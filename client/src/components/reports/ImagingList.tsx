import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { MODALITY_LABEL, type ImagingStudySummary } from '../../services/reports.service'
import { MODALITY_CHIP } from './modality'
import { clinicalDate, clinicalTime } from '../../lib/clinicalTime'

/**
 * The patient's scans and X-rays, newest first, grouped by day: what it was,
 * when and where it was taken, who reported it, and the first line of the
 * impression — the answer most people open a report for.
 */

export default function ImagingList({ studies }: { studies: ImagingStudySummary[] }) {
  const byDay = new Map<string, ImagingStudySummary[]>()
  for (const s of studies) {
    const k = clinicalDate(s.performedAt)
    byDay.set(k, [...(byDay.get(k) ?? []), s])
  }
  return (
    <div className="space-y-5" data-testid="imaging-list">
      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} aria-label={day}>
          <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtle tabular-nums">{day}</h3>
          <ul className="divide-y divide-border-soft overflow-hidden rounded-2xl border border-border-soft bg-surface-1 shadow-card">
            {list.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/app/reports/imaging/${s.id}`}
                  className="focus-ring group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-surface-2 sm:gap-4 sm:px-5"
                  data-testid="imaging-row"
                >
                  <span className={`mt-0.5 inline-flex h-7 min-w-12 flex-shrink-0 items-center justify-center rounded-md border px-2 text-xs font-semibold ${MODALITY_CHIP[s.modality]}`}>
                    {MODALITY_LABEL[s.modality]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink sm:text-base">{s.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted sm:text-sm">
                      <span className="tabular-nums">{clinicalTime(s.performedAt)}</span> · {s.performingFacility}
                    </span>
                    <span className="mt-1 block text-xs text-ink-subtle">
                      Reported by {s.report.reportedBy.name}
                      {s.report.status === 'Amended' ? ' · Amended' : ''} · {s.imageCount} {s.imageCount === 1 ? 'image' : 'images'}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-ink">{s.impression.split('\n')[0].replace(/^1\.\s*/, '')}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="mt-1 flex-shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
