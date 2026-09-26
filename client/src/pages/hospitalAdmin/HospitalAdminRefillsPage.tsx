import { useCallback, useEffect, useId, useState } from 'react'
import { RefreshCcw, Send, XCircle } from 'lucide-react'
import Card from '../../components/common/Card'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import StatusBadge, { type StatusBadgeVariant } from '../../components/common/StatusBadge'
import { Banner } from '../../components/feedback/States'
import * as hospitalAdmin from '../../services/hospitalAdmin.service'
import type { RefillDoctor, RefillQueueRow, RefillQueueStatus } from '../../services/hospitalAdmin.service'
import type { ApiError } from '../../types/api'

/**
 * Refill requests from patients — routed here, decided by a doctor.
 *
 * ⚠️ THE ADMINISTRATOR ROUTES; A DOCTOR PRESCRIBES. "Send to doctor" passes
 * the request to the prescriber (or a doctor chosen here) and tells the
 * patient who has it. "Decline" needs a reason, which the patient reads. The
 * request closes itself as "Prescribed" when the doctor signs a newer
 * prescription for the same medicine — nothing on this page dispenses.
 */

const STATUS: Record<RefillQueueStatus, { label: string; variant: StatusBadgeVariant }> = {
  Requested: { label: 'Waiting', variant: 'warning' },
  Forwarded: { label: 'With doctor', variant: 'info' },
  Fulfilled: { label: 'Prescribed', variant: 'success' },
  Declined: { label: 'Declined', variant: 'danger' },
  Cancelled: { label: 'Withdrawn by patient', variant: 'muted' },
}

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso))
}

function supplyWords(days: number | null): { text: string; urgent: boolean } | null {
  if (days === null) return null
  if (days < 0) return { text: `Ran out ${-days === 1 ? 'yesterday' : `${-days} days ago`}`, urgent: true }
  if (days === 0) return { text: 'Last day of supply', urgent: true }
  return { text: `${days} day${days === 1 ? '' : 's'} of supply left`, urgent: days <= 3 }
}

function RequestSummary({ r }: { r: RefillQueueRow }) {
  const supply = supplyWords(r.supplyDaysLeft)
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-sm font-semibold text-ink">
        {r.patientName} <span className="font-normal text-ink-subtle">· {r.shriPatientId}</span>
      </p>
      <p className="text-sm text-ink">
        {r.medicine} <span className="text-ink-muted">· {r.form} · {r.frequency.toLowerCase()}</span>
      </p>
      <p className="text-xs text-ink-muted">
        Prescribed by {r.prescribedBy ?? 'unknown'} · requested {when(r.requestedAt)}
        {supply !== null && (
          <span className={supply.urgent ? 'font-semibold text-critical-fg' : ''}> · {supply.text}</span>
        )}
      </p>
      {r.note !== null && (
        <p className="mt-1 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink">
          <span className="text-xs font-medium text-ink-subtle">Patient&rsquo;s note: </span>
          {r.note}
        </p>
      )}
    </div>
  )
}

export default function HospitalAdminRefillsPage() {
  const reasonId = useId()
  const [rows, setRows] = useState<RefillQueueRow[] | null>(null)
  const [doctors, setDoctors] = useState<RefillDoctor[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [toDecline, setToDecline] = useState<RefillQueueRow | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(() => {
    hospitalAdmin
      .listRefills()
      .then((r) => { setRows(r.refills); setDoctors(r.doctors); setError('') })
      .catch((err: ApiError) => setError(err.message || 'Could not load refill requests.'))
  }, [])

  useEffect(() => { load() }, [load])

  const waiting = (rows ?? []).filter((r) => r.status === 'Requested')
  const withDoctor = (rows ?? []).filter((r) => r.status === 'Forwarded')
  const closed = (rows ?? []).filter((r) => r.status !== 'Requested' && r.status !== 'Forwarded').slice(0, 30)

  const prescriberHere = (r: RefillQueueRow): RefillDoctor | undefined =>
    doctors.find((d) => d.userId === r.prescriberUserId)

  const forward = async (r: RefillQueueRow): Promise<void> => {
    // No choice made = the prescriber (the server's default).
    const picked = choice[r.id] || undefined
    setBusyId(r.id)
    setRowError((e) => ({ ...e, [r.id]: '' }))
    try {
      const res = await hospitalAdmin.forwardRefill(r.id, picked)
      setNotice(`Sent to ${res.forwardedToName}: ${r.medicine} for ${r.patientName}. The doctor and the patient have been notified.`)
      load()
    } catch (err) {
      setRowError((e) => ({ ...e, [r.id]: (err as ApiError).message }))
    } finally {
      setBusyId(null)
    }
  }

  const decline = async (): Promise<void> => {
    if (toDecline === null) return
    try {
      await hospitalAdmin.declineRefill(toDecline.id, reason.trim())
      setNotice(`Declined: ${toDecline.medicine} for ${toDecline.patientName}. The patient can see your reason.`)
      setToDecline(null)
      setReason('')
      load()
    } catch (err) {
      setRowError((e) => ({ ...e, [toDecline.id]: (err as ApiError).message }))
      setToDecline(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Refill requests</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Patients ask here when a medicine is running out. Send each request to a doctor, who decides whether to prescribe
          more, or decline it with a reason the patient will see.
        </p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {notice !== null && <Banner tone="success">{notice}</Banner>}

      <section aria-labelledby="refills-waiting" className="space-y-3">
        <h2 id="refills-waiting" className="flex items-center gap-2 text-base font-semibold text-ink">
          <RefreshCcw size={18} aria-hidden="true" className="text-warning-fg" />
          Waiting for you {rows !== null && <span className="font-normal text-ink-subtle">({waiting.length})</span>}
        </h2>
        <Card padding="none">
          {rows === null && !error ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : waiting.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No requests waiting. New refill requests will appear here.</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {waiting.map((r) => {
                const here = prescriberHere(r)
                const needsChoice = here === undefined
                return (
                  <li key={r.id} className="space-y-3 px-4 py-4 sm:px-5" data-testid="refill-row">
                    <RequestSummary r={r} />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-ink sm:max-w-md sm:flex-row sm:items-center sm:gap-2">
                        <span className="flex-shrink-0 text-xs font-medium text-ink-muted sm:text-sm sm:font-normal sm:text-ink">Send to</span>
                        <select
                          value={choice[r.id] ?? ''}
                          onChange={(e) => setChoice((c) => ({ ...c, [r.id]: e.target.value }))}
                          className="focus-ring min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink"
                        >
                          {here !== undefined
                            ? <option value="">{here.name} (prescribed it)</option>
                            : <option value="">Choose a doctor…</option>}
                          {doctors
                            .filter((d) => d.id !== here?.id)
                            .map((d) => <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>)}
                        </select>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setToDecline(r); setReason('') }}
                          disabled={busyId === r.id}
                          className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-soft px-4 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:opacity-60 sm:flex-none"
                        >
                          <XCircle size={15} aria-hidden="true" /> Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => void forward(r)}
                          disabled={busyId === r.id || (needsChoice && !choice[r.id])}
                          className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary hover:bg-primary-700 disabled:opacity-60 sm:flex-none"
                        >
                          <Send size={15} aria-hidden="true" /> {busyId === r.id ? 'Sending…' : 'Send to doctor'}
                        </button>
                      </div>
                    </div>
                    {needsChoice && (
                      <p className="text-xs text-ink-subtle">The prescribing doctor is not at your hospital — choose who should review it.</p>
                    )}
                    {rowError[r.id] && <p role="alert" className="text-sm text-critical-fg">{rowError[r.id]}</p>}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>

      {withDoctor.length > 0 && (
        <section aria-labelledby="refills-doctor" className="space-y-3">
          <h2 id="refills-doctor" className="text-base font-semibold text-ink">
            With a doctor <span className="font-normal text-ink-subtle">({withDoctor.length})</span>
          </h2>
          <Card padding="none">
            <ul className="divide-y divide-border-soft">
              {withDoctor.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <RequestSummary r={r} />
                  <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge variant="info">Sent to {r.forwardedToName ?? 'a doctor'}</StatusBadge>
                    <button
                      type="button"
                      onClick={() => { setToDecline(r); setReason('') }}
                      className="focus-ring inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-2"
                    >
                      Decline
                    </button>
                  </div>
                  {rowError[r.id] && <p role="alert" className="text-sm text-critical-fg">{rowError[r.id]}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="refills-closed" className="space-y-3">
          <h2 id="refills-closed" className="text-base font-semibold text-ink">Recently closed</h2>
          <Card padding="none">
            <ul className="divide-y divide-border-soft">
              {closed.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {r.patientName} <span className="text-ink-subtle">·</span> {r.medicine}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      Requested {when(r.requestedAt)}
                      {r.resolvedAt !== null && <> · closed {when(r.resolvedAt)}</>}
                      {r.declineReason !== null && <> · “{r.declineReason}”</>}
                    </p>
                  </div>
                  <StatusBadge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</StatusBadge>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <ConfirmDialog
        open={toDecline !== null}
        title="Decline this refill request?"
        consequence={toDecline !== null ? `${toDecline.patientName} will see that their request for ${toDecline.medicine} was not approved, with your reason.` : ''}
        confirmLabel="Decline request"
        destructive
        confirmDisabled={reason.trim().length < 3}
        onCancel={() => setToDecline(null)}
        onConfirm={decline}
      >
        <label htmlFor={reasonId} className="block text-sm font-medium text-ink">Reason for the patient</label>
        <textarea
          id={reasonId}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 300))}
          rows={3}
          maxLength={300}
          placeholder="For example: Please book a review visit — your doctor needs to see you before continuing this."
          className="focus-ring mt-1.5 w-full resize-y rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle"
        />
      </ConfirmDialog>
    </div>
  )
}
