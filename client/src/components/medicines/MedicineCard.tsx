import { Link } from 'react-router-dom'
import { MessageCircleQuestion, Stethoscope, UserRound } from 'lucide-react'
import IconTile from '../common/IconTile'
import { formatDay, formatDoseTime, type Medicine } from '../../services/portal.service'
import RefillButton from './RefillButton'
import { askAboutUrl, formVisual, prescriberLine } from './medicineVisuals'

/**
 * One current prescription, with everything a patient asks about it.
 *
 * ⚠️ PRESCRIBED vs LOGGED, VISIBLY APART. The card body is the signed
 * prescription (clinician-authored). The one line that comes from the
 * patient's own taps — the 30-day count — carries the patient-source icon
 * and says "you logged", so it is never read as a clinical record.
 *
 * "For" comes from the diagnosis the doctor linked to the line; when none was
 * linked the line is absent rather than guessed.
 */
function SupplyMeter({ m }: { m: Medicine }) {
  if (m.supplyDaysLeft === null || m.durationDays === null || m.durationDays <= 0) return null
  const left = m.supplyDaysLeft
  const pct = Math.max(4, Math.min(100, Math.round(((left + 1) / m.durationDays) * 100)))
  const tone = left <= 2 ? 'bg-critical-fg' : left <= 7 ? 'bg-warning-fg' : 'bg-primary-600'
  const words = left === 0 ? 'Last day of this prescription' : left === 1 ? '1 day left' : `${left} days left`
  return (
    <div data-testid="supply">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={`font-semibold ${left <= 7 ? 'text-warning-fg' : 'text-ink-muted'}`}>{words}</span>
        {m.endsAt !== null && <span className="text-ink-subtle">until {formatDay(m.endsAt)}</span>}
      </div>
      <div
        role="meter"
        aria-label="Prescription supply remaining"
        aria-valuemin={0}
        aria-valuemax={m.durationDays}
        aria-valuenow={left + 1}
        aria-valuetext={words}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function MedicineCard({
  medicine: m,
  times,
  onChanged,
}: {
  medicine: Medicine
  /** Today's dose times for this line, from the schedule. */
  times: string[]
  onChanged: () => void
}) {
  const { icon, tone } = formVisual(m.form)
  const a = m.adherence30

  return (
    <article
      id={`medicine-${m.id}`}
      aria-labelledby={`medicine-${m.id}-name`}
      className="@container scroll-mt-24 rounded-2xl border border-border-soft bg-surface-1 p-4 shadow-card sm:p-5"
      data-testid="medicine-card"
    >
      <div className="flex items-start gap-3.5">
        <IconTile icon={icon} tone={tone} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 id={`medicine-${m.id}-name`} className="text-lg font-semibold leading-snug tracking-tight text-ink">
            {m.name} <span className="font-medium text-ink-muted">{m.dose} {m.doseUnit}</span>
          </h3>
          <p className="text-xs text-ink-subtle">
            {m.form}
            {m.drugClass !== null && <> · {m.drugClass}</>}
          </p>
          {m.indication !== null && (
            <p className="mt-1.5 text-sm text-ink">
              <span className="text-ink-subtle">For </span>
              {m.indication.title}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm @lg:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs text-ink-subtle">How often</dt>
          <dd className="text-ink">
            {m.frequencyInWords} <span className="text-ink-subtle">({m.frequency})</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-subtle">Usual time</dt>
          <dd className="text-ink tabular-nums">
            {times.length > 0 ? times.map(formatDoseTime).join(', ') : m.schedule === 'as_needed' ? 'When needed' : '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-subtle">How</dt>
          <dd className="text-ink">{m.routeInWords}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-subtle">Started</dt>
          <dd className="text-ink">{formatDay(m.startedAt)}</dd>
        </div>
      </dl>

      {m.endsAt === null ? (
        <p className="mt-4 text-xs text-ink-subtle">No end date set — continue until your doctor says otherwise.</p>
      ) : (
        <div className="mt-4"><SupplyMeter m={m} /></div>
      )}

      {m.instructions && (
        <div className="mt-4 rounded-xl bg-surface-2 px-3.5 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">Doctor&rsquo;s directions</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{m.instructions}</p>
        </div>
      )}

      <div className="mt-4 space-y-2 text-xs">
        <p className="flex items-start gap-2 text-ink-muted">
          <Stethoscope size={14} aria-hidden="true" className="mt-px flex-shrink-0" />
          <span className="min-w-0">
            Prescribed by <span className="font-semibold text-ink">{prescriberLine(m.prescriber)}</span>
            {m.prescriber.hospital !== null && <> · {m.prescriber.hospital}</>}
            <span className="text-ink-subtle"> · {m.rxNumber}</span>
          </span>
        </p>
        {a !== null && a.due > 0 && (
          <p className="flex items-start gap-2 text-accent-sand-fg" data-testid="adherence-line">
            <UserRound size={14} aria-hidden="true" className="mt-px flex-shrink-0" />
            <span>
              You logged <span className="font-semibold tabular-nums">{a.taken} of {a.due}</span> doses as taken in the 30 days before today
              {a.percent !== null && <span className="tabular-nums"> ({a.percent}%)</span>}
            </span>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4">
        <RefillButton medicine={m} onChanged={onChanged} />
        <Link
          to={askAboutUrl(`What is ${m.name} for, and how should I take it?`)}
          className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary-700 hover:bg-surface-2"
        >
          <MessageCircleQuestion size={15} aria-hidden="true" /> Ask about this medicine
        </Link>
      </div>
    </article>
  )
}
