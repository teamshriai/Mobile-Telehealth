import { Stethoscope, UserRound } from 'lucide-react'

/**
 * Who wrote this — on every clinical item the patient portal shows.
 *
 * ⚠️ THE DISTINCTION IS THE FEATURE. A health note the patient spoke and a
 * diagnosis their consultant signed can sit on the same screen, and they must
 * never be mistaken for one another. So the two kinds differ in THREE ways at
 * once — icon, wording, and colour — and colour is never the only carrier:
 *
 *  - clinician: Stethoscope, "Recorded by Dr X", neutral ink.
 *  - patient:   UserRound, "You wrote this · not reviewed by your care team",
 *               the warm sand accent reserved for patient-generated content.
 */
type Props =
  | { kind: 'clinician'; by: string | null; detail?: string }
  | { kind: 'patient'; detail?: string }

export default function SourceBadge(props: Props) {
  if (props.kind === 'clinician') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-border-soft bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
        <Stethoscope size={12} aria-hidden="true" />
        {props.by === null ? 'Recorded by your doctors' : `Recorded by ${props.by}`}
        {props.detail !== undefined && <span className="text-ink-subtle">· {props.detail}</span>}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-accent-sand-fg/30 bg-accent-sand px-2 py-0.5 text-xs font-medium text-accent-sand-fg">
      <UserRound size={12} aria-hidden="true" />
      You wrote this
      <span className="font-normal">· {props.detail ?? 'not reviewed by your doctors'}</span>
    </span>
  )
}
