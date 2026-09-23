import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import Button from '../common/Button'
import * as breakGlassService from '../../services/breakGlass.service'
import { BREAK_GLASS_REASONS } from '../../services/breakGlass.service'
import type { BreakGlassIdentity, BreakGlassReason } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * The `BREAKGLASS` state (§1.5) and the `GP-11` gate.
 *
 * ⚠️ REASON BEFORE CONTENT. This renders INSTEAD of the screen, not over it.
 * The only patient data shown before a reason is given is a name and a UHID
 * — enough to confirm the clinician is about to open the right record, and
 * nothing more. Rendering the chart behind a dismissible modal would make
 * the reason optional in practice.
 *
 * ⚠️ Not a refusal. UI_ATLAS §3.2: "an authorization model that can block
 * resuscitation is the wrong model." The primary action here is to proceed.
 */

const MIN_REASON = 10

interface BreakGlassGateProps {
  shriPatientId: string
  /** Called once access is granted, so the caller can retry its load. */
  onGranted: () => void
}

export default function BreakGlassGate({ shriPatientId, onGranted }: BreakGlassGateProps) {
  const [identity, setIdentity] = useState<BreakGlassIdentity | null>(null)
  const [category, setCategory] = useState<BreakGlassReason | ''>('')
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    breakGlassService
      .getIdentity(shriPatientId)
      .then((i) => { if (!cancelled) setIdentity(i) })
      .catch(() => { if (!cancelled) setIdentity(null) })
    return () => { cancelled = true }
  }, [shriPatientId])

  const reasonTooShort = reason.trim().length < MIN_REASON
  const canProceed = category !== '' && !reasonTooShort && acknowledged && !submitting

  const proceed = async (): Promise<void> => {
    if (category === '') return
    setSubmitting(true)
    setError('')
    try {
      await breakGlassService.requestGrant(shriPatientId, {
        reasonCategory: category,
        reason: reason.trim(),
        acknowledged: true,
      })
      onGranted()
    } catch (err) {
      setError((err as ApiError).message || 'Could not record emergency access. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-warning-fg/40 bg-warning-bg p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-warning-fg" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-warning-fg">
              You have no care relationship with this patient
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-warning-fg">
              You can still open this record in an emergency. State why, and continue.
              <strong className="font-semibold"> This access is logged and reviewed within 24 hours.</strong>
            </p>
          </div>
        </div>

        {/* ⚠️ Name and UHID only. Nothing clinical until a reason exists. */}
        <div className="mt-4 rounded-lg border border-warning-fg/30 bg-surface-1 px-3.5 py-2.5">
          {identity === null ? (
            <p className="text-sm text-ink-subtle">Confirming patient identity…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">{identity.fullName}</p>
              <p className="font-mono text-xs text-ink-subtle">{identity.shriPatientId}</p>
            </>
          )}
          <p className="mt-1.5 text-2xs text-ink-subtle">
            Identity only. No clinical information is shown until you continue.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4 rounded-xl border border-border-soft bg-surface-1 p-5">
        <div>
          <label htmlFor="bg-category" className="mb-1.5 block text-sm font-medium text-ink-muted">
            Reason for access <span aria-hidden="true" className="text-critical-fg">*</span>
          </label>
          <select
            id="bg-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as BreakGlassReason | '')}
            className="focus-ring w-full min-h-11 rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink"
          >
            <option value="">Choose a reason…</option>
            {BREAK_GLASS_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bg-reason" className="mb-1.5 block text-sm font-medium text-ink-muted">
            Describe the clinical need{' '}
            <span aria-hidden="true" className="text-critical-fg">*</span>
          </label>
          <textarea
            id="bg-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-describedby="bg-reason-hint"
            placeholder="e.g. Covering the medical take overnight; patient deteriorating and the responsible consultant is unavailable."
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
          />
          <p id="bg-reason-hint" className="mt-1 text-xs text-ink-subtle">
            A named reviewer reads this. At least {MIN_REASON} characters.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--color-primary-600)]"
          />
          <span className="text-sm leading-relaxed text-ink-muted">
            I understand this access is recorded against my name and reviewed.
          </span>
        </label>

        {error !== '' && (
          <p role="alert" className="rounded-lg bg-critical-bg px-3 py-2 text-sm text-critical-fg">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void proceed()}
            disabled={!canProceed}
            loading={submitting}
          >
            Break glass and open record
          </Button>
        </div>
      </div>
    </div>
  )
}
