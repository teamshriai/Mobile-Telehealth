import { Check, Loader2, SkipForward, Undo2, UserRound } from 'lucide-react'
import { formatDoseTime, type DoseState, type Medicine, type TodayDose } from '../../services/portal.service'
import { PART_OF_DAY, PARTS_OF_DAY } from './medicineVisuals'

/**
 * Today's doses, by part of the day, with "Taken" and "Skip" beside each.
 *
 * ⚠️ THE PATIENT'S OWN RECORD. Tapping writes to their dose log — it never
 * touches the prescription. The times are conventional defaults for the
 * prescribed frequency (India time); the doctor's written directions, shown
 * under each dose, always win over them.
 *
 * A dose can be marked from an hour before it is due until two days after,
 * which is what the server enforces too; a later dose shows its time instead
 * of buttons.
 */

const STATE_CHIP: Record<DoseState, { label: string; className: string } | null> = {
  taken: { label: 'Taken', className: 'bg-success-bg text-success-fg' },
  skipped: { label: 'Skipped', className: 'bg-surface-3 text-ink-muted' },
  due: { label: 'Due now', className: 'bg-info-bg text-info-fg' },
  missed: { label: 'Not marked', className: 'bg-warning-bg text-warning-fg' },
  upcoming: null,
}

const DATE_LABEL = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })

interface Props {
  doses: TodayDose[]
  asNeeded: Medicine[]
  busyKey: string | null
  onLog: (dose: TodayDose, status: 'Taken' | 'Skipped') => void
  onUndo: (dose: TodayDose) => void
}

function DoseRow({ dose, busy, onLog, onUndo }: { dose: TodayDose; busy: boolean; onLog: Props['onLog']; onUndo: Props['onUndo'] }) {
  const chip = STATE_CHIP[dose.state]
  const logged = dose.state === 'taken' || dose.state === 'skipped'
  const label = `${dose.name} ${dose.dose} ${dose.doseUnit} at ${formatDoseTime(dose.at)}`

  return (
    <li className="flex items-start gap-3 py-3.5" data-testid="dose-row" data-state={dose.state}>
      <time dateTime={dose.at} className="w-[4.5rem] flex-shrink-0 pt-0.5 text-sm font-semibold text-ink tabular-nums">
        {formatDoseTime(dose.at)}
      </time>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`text-sm font-semibold ${dose.state === 'skipped' ? 'text-ink-muted' : 'text-ink'}`}>
            {dose.name} <span className="font-medium text-ink-muted">{dose.dose} {dose.doseUnit}</span>
          </p>
          {chip !== null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${chip.className}`}>
              {dose.state === 'taken' && <Check size={12} aria-hidden="true" />}
              {chip.label}
            </span>
          )}
        </div>
        {dose.instructions && <p className="mt-0.5 text-xs leading-relaxed text-ink-subtle">{dose.instructions}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {logged ? (
            <button
              type="button"
              onClick={() => onUndo(dose)}
              disabled={busy}
              aria-label={`Undo — ${label}`}
              className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Undo2 size={14} aria-hidden="true" />}
              Undo
            </button>
          ) : dose.canLog ? (
            <>
              <button
                type="button"
                onClick={() => onLog(dose, 'Taken')}
                disabled={busy}
                aria-label={`Mark taken — ${label}`}
                className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                Taken
              </button>
              <button
                type="button"
                onClick={() => onLog(dose, 'Skipped')}
                disabled={busy}
                aria-label={`Mark skipped — ${label}`}
                className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-soft bg-surface-1 px-3 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60"
              >
                <SkipForward size={15} aria-hidden="true" />
                Skip
              </button>
            </>
          ) : (
            <span className="text-xs text-ink-subtle">You can mark this from an hour before.</span>
          )}
        </div>
      </div>
    </li>
  )
}

export default function TodaySchedule({ doses, asNeeded, busyKey, onLog, onUndo }: Props) {
  const taken = doses.filter((d) => d.state === 'taken').length

  return (
    <section
      id="today"
      aria-labelledby="today-heading"
      className="scroll-mt-24 rounded-2xl border border-border-soft bg-surface-1 shadow-card"
    >
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-border-soft px-4 py-4 sm:px-5">
        <div>
          <h2 id="today-heading" className="text-lg font-semibold tracking-tight text-ink">Today</h2>
          <p className="text-xs text-ink-subtle">{DATE_LABEL.format(new Date())}</p>
        </div>
        {doses.length > 0 && (
          <p className="text-sm font-medium text-ink-muted tabular-nums" aria-live="polite">
            {taken} of {doses.length} taken
          </p>
        )}
      </header>

      <div className="px-4 pb-2 sm:px-5">
        {doses.length === 0 ? (
          <p className="py-5 text-sm text-ink-muted">No scheduled doses today.</p>
        ) : (
          PARTS_OF_DAY.map((part) => {
            const group = doses.filter((d) => d.partOfDay === part)
            if (group.length === 0) return null
            const { icon: Icon, label } = PART_OF_DAY[part]
            return (
              <div key={part} className="border-b border-border-soft last:border-b-0">
                <h3 className="flex items-center gap-2 pt-4 text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
                  <Icon size={14} aria-hidden="true" /> {label}
                </h3>
                <ul className="divide-y divide-border-soft">
                  {group.map((d) => (
                    <DoseRow key={d.key} dose={d} busy={busyKey === d.key} onLog={onLog} onUndo={onUndo} />
                  ))}
                </ul>
              </div>
            )
          })
        )}

        {asNeeded.length > 0 && (
          <div className="border-t border-border-soft py-4">
            <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">Only when needed</h3>
            <ul className="mt-2 space-y-1.5">
              {asNeeded.map((m) => (
                <li key={m.id} className="text-sm text-ink">
                  {m.name} <span className="text-ink-muted">{m.dose} {m.doseUnit}</span>
                  <span className="text-ink-subtle"> · {m.frequencyInWords.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 border-t border-border-soft px-4 py-3 text-xs leading-relaxed text-ink-subtle sm:px-5">
        <UserRound size={14} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
        Your own record, to help you keep track. It does not change your prescription. Times are the usual ones for how often
        each medicine is taken — follow your doctor&rsquo;s directions if they differ.
      </p>
    </section>
  )
}
