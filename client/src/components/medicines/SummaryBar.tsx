import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { Activity, ListChecks, Pill, RefreshCcw, ShieldAlert } from 'lucide-react'
import IconTile from '../common/IconTile'
import type { IconTone } from '../common/iconTones'
import { formatDoseTime, type MedicinesSummary } from '../../services/portal.service'

/**
 * The four numbers a patient checks first, and the allergy they reported.
 *
 * ⚠️ EACH FIGURE SAYS WHERE IT COMES FROM. "Current" and "refills" are read
 * from signed prescriptions; "today" and "30 days" from the patient's own
 * taps. The adherence tile says "as you logged them" in words, because a dose
 * taken but never tapped counts as missed and the number must not pass for a
 * clinical measurement.
 */
interface TileProps {
  icon: ComponentType<LucideProps>
  tone: IconTone
  label: string
  value: ReactNode
  sub: ReactNode
  footer?: ReactNode
}

function Tile({ icon, tone, label, value, sub, footer }: TileProps) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-border-soft bg-surface-1 p-4 shadow-card">
      <span className="flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} size="sm" />
        <span className="min-w-0 text-xs font-medium text-ink-muted">{label}</span>
      </span>
      <span className="mt-3 block text-2xl font-semibold leading-tight tracking-tight text-ink tabular-nums">{value}</span>
      <span className="mt-1 block text-xs leading-snug text-ink-subtle">{sub}</span>
      {footer !== undefined && <span className="mt-auto block pt-3">{footer}</span>}
    </div>
  )
}

function Meter({ value, max, tone }: { value: number; max: number; tone: 'green' | 'amber' }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <span
        className={`block h-full rounded-full transition-[width] duration-500 ${tone === 'green' ? 'bg-success-fg' : 'bg-warning-fg'}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}

export default function SummaryBar({ summary }: { summary: MedicinesSummary }) {
  const { today, adherence30: a } = summary
  const doctors =
    summary.doctors.length === 0
      ? 'No current prescriptions'
      : summary.doctors.length === 1
        ? `Prescribed by ${summary.doctors[0]}`
        : `From ${summary.doctors.length} doctors`

  return (
    <section aria-label="Your medicines at a glance" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={Pill}
          tone="blue"
          label="Current medicines"
          value={summary.currentCount}
          sub={doctors}
        />
        <Tile
          icon={ListChecks}
          tone="green"
          label="Today"
          value={
            today.total === 0 ? (
              <span className="text-lg">No doses</span>
            ) : (
              <>
                {today.taken}
                <span className="text-base font-medium text-ink-subtle"> of {today.total} taken</span>
              </>
            )
          }
          sub={
            <>
              {summary.nextDose !== null
                ? <>Next: {summary.nextDose.name} · {formatDoseTime(summary.nextDose.at)}</>
                : today.total === 0
                  ? 'Nothing is scheduled today'
                  : today.notMarked === 0
                    ? 'Nothing else due today'
                    : null}
              {today.notMarked > 0 && (
                <span className="block font-medium text-warning-fg">
                  {today.notMarked} earlier {today.notMarked === 1 ? 'dose' : 'doses'} not marked yet
                </span>
              )}
            </>
          }
          footer={today.total > 0 ? <Meter value={today.taken} max={today.total} tone="green" /> : undefined}
        />
        <Tile
          icon={Activity}
          tone="violet"
          label="Last 30 days"
          value={a.percent === null ? '—' : `${a.percent}%`}
          sub={
            a.percent === null
              ? 'Nothing to count yet'
              : `${a.taken} of ${a.due} doses taken up to yesterday, as you logged them`
          }
        />
        <Tile
          icon={RefreshCcw}
          tone="amber"
          label="Refills"
          value={summary.refillsDueSoon === 0 ? 'None due' : `${summary.refillsDueSoon} due soon`}
          sub={summary.refillsDueSoon === 0 ? 'No supply ends in the next 7 days' : 'Supply ends within 7 days'}
        />
      </div>

      {summary.allergies !== null && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-accent-sand-fg/25 bg-accent-sand px-3.5 py-2.5 text-sm text-accent-sand-fg">
          <ShieldAlert size={16} aria-hidden="true" className="flex-shrink-0" />
          <span className="font-semibold">Allergies you told us about:</span>
          <span className="min-w-0 break-words">{summary.allergies}</span>
          <span className="text-xs opacity-80">· not checked by your doctors</span>
        </p>
      )}
    </section>
  )
}
