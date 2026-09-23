import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { usePatientContext } from '../../app/usePatientContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import { useToast } from '../../components/common/useToast'
import * as breakGlassService from '../../services/breakGlass.service'
import { BREAK_GLASS_REASONS } from '../../services/breakGlass.service'
import type { BreakGlassReviewRow } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * Emergency-access review queue.
 *
 * Break-glass is only defensible if somebody actually looks. An unreviewed
 * grant queue turns "emergency access is audited" into a claim nobody tests,
 * and then into the path of least resistance for reading records you have no
 * business reading.
 *
 * ⚠️ Reading this queue is itself audited. That is not a deterrent aimed at
 * the reviewer — it is what makes the audit trail complete: otherwise the one
 * role that can see every emergency access leaves no trace of having done so.
 *
 * Note this is NOT a clinician-facing audit screen (DEC-009 K-7 deliberately
 * has none). It is the compliance side, and the clinician's own visibility is
 * the persistent GP-10 banner they cannot dismiss.
 */

export default function BreakGlassReview() {
  const { setPatient } = usePatientContext()
  const toast = useToast()

  const [rows, setRows] = useState<BreakGlassReviewRow[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [includeReviewed, setIncludeReviewed] = useState(false)
  const [decision, setDecision] = useState<{ row: BreakGlassReviewRow; outcome: 'Appropriate' | 'Inappropriate' } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setPatient(null) }, [setPatient])

  const load = useCallback(() => {
    setError(null)
    breakGlassService.listForReview(includeReviewed).then(setRows).catch(setError)
  }, [includeReviewed])
  useEffect(load, [load])

  const submit = async () => {
    if (decision === null) return
    setBusy(true)
    try {
      await breakGlassService.reviewGrant(
        decision.row.id,
        decision.outcome,
        note.trim() === '' ? null : note.trim(),
      )
      toast.notify(`Recorded as ${decision.outcome.toLowerCase()}.`, 'success')
      setDecision(null); setNote('')
      load()
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not record that review.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (error !== null) {
    return <ErrorState title="Could not load emergency access records" description={error} onRetry={load} />
  }
  if (rows === null) return <LoadingState label="Loading emergency access records…" />

  const overdue = rows.filter((r) => r.reviewedAt === null && r.ageHours >= 24).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Emergency access review
        </h1>
        <p className="mt-0.5 text-xs text-ink-muted">
          Every time a clinician read a record they had no care relationship with. Each one needs a
          decision within 24 hours.
        </p>
      </div>

      {overdue > 0 && (
        <Banner tone="warning" title={`${overdue} overdue`}>
          {overdue === 1 ? 'One access has' : `${overdue} accesses have`} been waiting more than 24
          hours for a decision.
        </Banner>
      )}

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox" checked={includeReviewed}
          onChange={(e) => setIncludeReviewed(e.target.checked)}
          className="focus-ring h-4 w-4 rounded border-border-soft"
        />
        Include already reviewed
      </label>

      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={includeReviewed ? 'No emergency access on record' : 'Nothing awaiting review'}
          description="Emergency access appears here the moment it is granted, with the reason the clinician gave."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Card padding="md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {r.actorName} accessed {r.patientName}
                    </p>
                    <p className="font-mono text-2xs text-ink-muted">{r.shriPatientId}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold ${
                      r.reviewedAt !== null
                        ? r.outcome === 'Inappropriate'
                          ? 'bg-critical-bg text-critical-fg'
                          : 'bg-success-bg text-success-fg'
                        : r.ageHours >= 24
                          ? 'bg-warning-bg text-warning-fg'
                          : 'bg-surface-2 text-ink-muted'
                    }`}
                  >
                    {r.reviewedAt !== null
                      ? r.outcome
                      : r.ageHours >= 24
                        ? `Awaiting review · ${Math.floor(r.ageHours / 24)}d overdue`
                        : 'Awaiting review'}
                  </span>
                </div>

                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-ink-muted">Reason given</dt>
                    <dd className="text-ink">
                      {BREAK_GLASS_REASONS.find((x) => x.value === r.reasonCategory)?.label ??
                        r.reasonCategory}
                      {' — '}
                      {r.reason}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-ink-muted">Granted</dt>
                    <dd className="tabular-nums text-ink">
                      {formatDate(r.grantedAt)} {formatTime(r.grantedAt)} · expires{' '}
                      {formatDate(r.expiresAt)} {formatTime(r.expiresAt)}
                      {r.isExpired && ' (expired)'}
                    </dd>
                  </div>
                  {r.reviewNote !== null && r.reviewNote !== '' && (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-ink-muted">Review note</dt>
                      <dd className="text-ink">{r.reviewNote}</dd>
                    </div>
                  )}
                </dl>

                {r.reviewedAt === null && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setDecision({ row: r, outcome: 'Appropriate' })}>
                      Appropriate
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDecision({ row: r, outcome: 'Inappropriate' })}>
                      Inappropriate
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {decision !== null && (
        <ConfirmDialog
          open
          title={`Record this access as ${decision.outcome.toLowerCase()}?`}
          consequence={
            decision.outcome === 'Inappropriate'
              ? `This is a formal finding against ${decision.row.actorName} and is permanent. It does not revoke the access, which has already happened — it records that it should not have.`
              : 'This closes the review. The record of the access itself stays permanently either way.'
          }
          confirmLabel={`Record as ${decision.outcome.toLowerCase()}`}
          destructive={decision.outcome === 'Inappropriate'}
          confirmDisabled={busy || (decision.outcome === 'Inappropriate' && note.trim().length < 10)}
          onConfirm={submit}
          onCancel={() => { setDecision(null); setNote('') }}
        >
          <div className="mt-3">
            <label htmlFor="review-note" className="mb-1 block text-sm font-medium text-ink">
              Review note{decision.outcome === 'Inappropriate' && ' (required)'}
            </label>
            <textarea
              id="review-note" rows={3} value={note}
              onChange={(e) => setNote(e.target.value)}
              className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
            />
            {decision.outcome === 'Inappropriate' && (
              <p className="mt-1 text-2xs text-ink-subtle">
                {note.trim().length}/10 characters minimum — a finding without a stated basis
                cannot be acted on.
              </p>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}
