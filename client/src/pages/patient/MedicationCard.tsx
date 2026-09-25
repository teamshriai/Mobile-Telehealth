import { Pill } from 'lucide-react'
import SourceBadge from '../../components/common/SourceBadge'
import { formatDay, type Medication } from '../../services/portal.service'

/**
 * One signed prescription item, in words a patient reads.
 *
 * ⚠️ "Prescribed until", never "you are taking": there is no dispensing or
 * adherence record, so the portal can only say what was PRESCRIBED. The
 * clinician's shorthand (OD, SC) is shown in brackets after the words, so a
 * patient comparing against their paper prescription still recognises it.
 */
export default function MedicationCard({ m }: { m: Medication }) {
  return (
    <article className="rounded-xl border border-border-soft bg-surface-1 p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600/10 text-primary-700">
          <Pill size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink">
            {m.name} <span className="font-normal text-ink-muted">{m.dose} {m.doseUnit}</span>
          </h3>
          <p className="text-xs text-ink-subtle">{m.form} · {m.strength}</p>

          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-subtle">How often</dt>
              <dd className="text-ink">{m.frequencyInWords} <span className="text-ink-subtle">({m.frequency})</span></dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">How</dt>
              <dd className="text-ink">{m.routeInWords}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Prescribed</dt>
              <dd className="text-ink">{formatDay(m.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">{m.status === 'current' ? 'Prescribed until' : 'Course ended'}</dt>
              <dd className="text-ink">{m.endsAt === null ? 'No end date set' : formatDay(m.endsAt)}</dd>
            </div>
          </dl>

          {m.instructions !== null && m.instructions !== '' && (
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink">{m.instructions}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SourceBadge kind="clinician" by={m.prescribedBy} detail={m.rxNumber} />
          </div>
        </div>
      </div>
    </article>
  )
}
