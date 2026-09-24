import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertOctagon } from 'lucide-react'
import Button from '../common/Button'
import { Banner } from '../feedback/States'
import { allergenLabel } from './clinicalLabels'
import * as prescriptionService from '../../services/prescription.service'
import type { HardStop, SafetyEvaluation } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * AIP-09 · the deterministic hard-stop gate.
 *
 * ⚠️ THIS DIALOG CANNOT BE DISMISSED WITHOUT A DISPOSITION. No Escape, no
 * backdrop click, no close button. That is deliberate and it is the whole
 * point: the clinician must either remove the item or formally override it,
 * and both outcomes are recorded. A dialog you can wave away is a dialog that
 * gets waved away, and this one stands between a documented anaphylaxis and a
 * dispensed beta-lactam.
 *
 * It is `role="alertdialog"`, not `dialog` — assistive technology announces it
 * as an alert requiring a response rather than as a panel that happened to
 * open. It is not a toast for the same reason: a toast can be missed.
 *
 * ⚠️ Nothing here is AI. The stop is a stored allergen-class rule; the three
 * alternatives come from the formulary's therapeutic classes. With every AI
 * feature off, this dialog behaves identically.
 *
 * The G4 override needs a reason AND a second consultant's live
 * authentication. Both identities are recorded and the server emits
 * `AI.SAF.HARD_STOP_OVERRIDDEN`, the one audit event the atlas says must
 * alert and be reviewed within 24 hours.
 */

interface HardStopDialogProps {
  stop: HardStop
  prescriptionId: string
  documentedAllergens: string[]
  onRemoveItem: () => void | Promise<void>
  onOverridden: (safety: SafetyEvaluation) => void
  /**
   * ⚠️ `rx:override:hard-stop`, which is a DIFFERENT capability from
   * prescribing and is withheld from residents. Offering the override path to
   * someone who cannot take it meant the 403 arrived only after a second
   * consultant had come over and typed their password — which teaches people
   * that the safety control is unreliable rather than deliberate, and burns
   * the goodwill you need the next time it fires for real.
   */
  canOverride: boolean
}

export default function HardStopDialog({
  stop, prescriptionId, documentedAllergens, onRemoveItem, onOverridden, canOverride,
}: HardStopDialogProps) {
  const [mode, setMode] = useState<'choose' | 'override'>('choose')
  const [removing, setRemoving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const headingId = 'hardstop-title'

  // Focus trap. No Escape handler on purpose — see the header.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const { body } = document
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Swallowed, not ignored: without this it would bubble to whatever
        // ancestor dialog or drawer is listening and close THAT instead,
        // leaving this one floating over a changed screen.
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusables === undefined || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      body.style.overflow = prevOverflow
      previous?.focus()
    }
  }, [])

  const remove = async () => {
    setRemoving(true)
    try { await onRemoveItem() } finally { setRemoving(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        // ⚠️ `bg-surface-1`, and it must stay a real surface token. This read
        // `bg-surface-0` until 23-Sep-2026 — and `--color-surface-0` is not
        // defined anywhere in index.css, which only declares `surface-1` and
        // `surface-2`. Tailwind emitted nothing, so the panel had NO background:
        // the one dialog in the product that exists to stop a prescriber was
        // rendering see-through, with the page text it was blocking legible
        // straight through the middle of it.
        className="focus-ring flex max-h-[100dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-critical-fg/40 bg-surface-1 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-border-soft bg-critical-bg p-4">
          <AlertOctagon size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-critical-fg" />
          <div>
            <h2 id={headingId} className="text-base font-semibold text-critical-fg">
              Prescribing blocked — documented {allergenLabel(stop.allergenKey)} allergy
            </h2>
            <p className="mt-1 text-sm text-critical-fg">
              {stop.drugName} belongs to the {stop.blocksClass} class, which this patient is
              documented as allergic to.
            </p>
          </div>
        </div>

        {/* min-h-0 is load-bearing: without it a flex child refuses to shrink
            below its content and the scroll never engages, which is how the
            footer ends up off-screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Why this is blocked</h3>
              <p className="mt-1 text-sm text-ink-muted">{stop.rationale}</p>
              <p className="mt-2 text-xs text-ink-subtle">
                This is a stored rule checked against this patient&rsquo;s recorded allergies. It is
                not a suggestion and it is not generated — it produces the same result every time,
                for every clinician.
              </p>
            </div>

            {documentedAllergens.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-ink">Recorded allergies</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {documentedAllergens.map((a) => (
                    <span key={a} className="rounded bg-critical-bg px-2 py-0.5 text-xs font-semibold text-critical-fg">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-ink">
                Alternatives {stop.alternatives.length > 0 && `(${stop.alternatives.length})`}
              </h3>
              {stop.alternatives.length === 0 ? (
                <p className="mt-1 text-sm text-ink-muted">
                  No alternative in the same therapeutic class is free of this allergen. Choose a
                  different class, or override with a second consultant.
                </p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {stop.alternatives.map((alt) => (
                    <li key={alt.id} className="rounded-lg border border-border-soft bg-surface-1 p-2">
                      <p className="text-sm font-medium text-ink">
                        {alt.genericName} {alt.strength}
                      </p>
                      <p className="text-2xs text-ink-muted">
                        {alt.form} · {alt.route}
                        {alt.isNlem && ' · NLEM'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-2xs text-ink-subtle">
                Remove the blocked item and prescribe one of these from the search panel. This
                dialog does not prescribe for you.
              </p>
            </div>

            {mode === 'override' && (
              <OverrideForm
                stop={stop}
                prescriptionId={prescriptionId}
                onCancel={() => setMode('choose')}
                onDone={onOverridden}
              />
            )}
          </div>
        </div>

        {mode === 'choose' && (
          <div className="flex shrink-0 flex-col gap-2 border-t border-border-soft bg-surface-1 p-4 sm:flex-row sm:justify-end">
            {/* The safe action is primary and first in the tab order. */}
            <Button onClick={() => void remove()} loading={removing}>
              Remove {stop.drugName}
            </Button>
            {canOverride ? (
              <Button variant="secondary" onClick={() => setMode('override')}>
                Override with a second consultant
              </Button>
            ) : (
              // ⚠️ Says who can, rather than showing a dead control. §4.8's rule
              // — hidden, not greyed — plus the reason, because a prescriber who
              // cannot proceed still has to know what the next step is.
              <p className="self-center text-2xs text-ink-subtle sm:max-w-xs sm:text-right">
                You do not hold override rights. A consultant who does can record a formal
                override with a second consultant.
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ── G4 dual signature ───────────────────────────────────────────────────── */

const MIN_REASON = 20

function OverrideForm({
  stop, prescriptionId, onCancel, onDone,
}: {
  stop: HardStop
  prescriptionId: string
  onCancel: () => void
  onDone: (safety: SafetyEvaluation) => void
}) {
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reasonOk = reason.trim().length >= MIN_REASON
  const ready = reasonOk && email.trim() !== '' && password !== '' && acknowledged

  const submit = async () => {
    if (!ready) return
    setBusy(true)
    setError('')
    try {
      const res = await prescriptionService.overrideHardStop(prescriptionId, {
        itemId: stop.itemId,
        reason: reason.trim(),
        secondConsultantEmail: email.trim(),
        secondConsultantPassword: password,
        acknowledged: true,
      })
      // Cleared immediately. It was only ever held to be sent.
      setPassword('')
      onDone(res.safety)
    } catch (err) {
      setPassword('')
      setError((err as ApiError).message || 'The override was refused.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-warning-fg/30 bg-warning-bg p-3">
      <h3 className="text-sm font-semibold text-warning-fg">Formal override</h3>
      <p className="mt-1 text-xs text-warning-fg">
        This requires a written clinical justification and a second consultant&rsquo;s own
        credentials, entered by them. Both names are recorded permanently against this
        prescription, and the override raises an alert that is reviewed within 24 hours.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="ov-reason" className="mb-1 block text-xs font-medium text-warning-fg">
            Clinical justification
          </label>
          <textarea
            id="ov-reason" rows={3} value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this medicine is necessary despite the documented allergy, and what precautions are in place."
            className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
          />
          <p className="mt-1 text-2xs text-warning-fg">
            {reason.trim().length}/{MIN_REASON} characters minimum.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ov-email" className="mb-1 block text-xs font-medium text-warning-fg">
              Second consultant&rsquo;s email
            </label>
            <input
              id="ov-email" type="email" autoComplete="off" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="ov-pw" className="mb-1 block text-xs font-medium text-warning-fg">
              Their password
            </label>
            <input
              id="ov-pw" type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
            />
          </div>
        </div>
        <p className="text-2xs text-warning-fg">
          The second consultant must type this themselves. It is verified against their account and
          never stored.
        </p>

        <label className="flex items-start gap-2 text-xs text-warning-fg">
          <input
            type="checkbox" checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded border-border-soft"
          />
          We both accept clinical responsibility for prescribing {stop.drugName} to a patient with a
          documented {allergenLabel(stop.allergenKey)} allergy.
        </label>

        {error !== '' && <Banner tone="error">{error}</Banner>}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel}>Back</Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!ready} variant="danger">
            Record override and proceed
          </Button>
        </div>
      </div>
    </div>
  )
}
