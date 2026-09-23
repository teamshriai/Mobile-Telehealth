import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCheck2 } from 'lucide-react'
import { usePatientContext } from '../../app/usePatientContext'
import { useAuth } from '../../app/useAuth'
import { useToast } from '../../components/common/useToast'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import * as clinicalNoteService from '../../services/clinicalNote.service'
import type { ClinicalNote, CosignQueueItem } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * S-06-09 · Co-Sign & Amendment Queue (ARC-08 list+detail, Compact).
 *
 * ⚠️ A counter-signature is an attestation, not an inbox action. Three things
 * follow from that and none of them are negotiable:
 *
 *  1. **The queue list carries no note content** — only triage metadata. The
 *     content is fetched per note through the same row-level gate as any other
 *     read, so opening the queue does not grant bulk access to other people's
 *     documentation.
 *  2. **Approving requires having opened it.** The approve control does not
 *     exist until the note's text is on screen. Attesting to something you
 *     have not read is the failure mode this screen exists to prevent, and a
 *     select-all-and-approve affordance would industrialise it — there is
 *     deliberately no bulk action here.
 *  3. **Returning requires a reason**, and the author is notified. A note
 *     that comes back with no explanation gets resubmitted unchanged.
 *
 * Keys: `a` approves the open note, `r` returns it.
 */

export default function CosignQueue() {
  const { setPatient } = usePatientContext()
  const { can } = useAuth()
  const toast = useToast()

  const [queue, setQueue] = useState<CosignQueueItem[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState<ClinicalNote | null>(null)
  const [noteError, setNoteError] = useState<ApiError | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [returning, setReturning] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const canCosign = can('note:cosign:assigned')

  useEffect(() => { setPatient(null) }, [setPatient])

  const load = useCallback(() => {
    setError(null)
    clinicalNoteService.listCosignQueue().then(setQueue).catch(setError)
  }, [])
  useEffect(load, [load])

  useEffect(() => {
    if (selectedId === null) { setNote(null); return }
    setNote(null); setNoteError(null)
    clinicalNoteService.getNote(selectedId).then(setNote).catch(setNoteError)
  }, [selectedId])

  const state = useRef({ note, canCosign })
  state.current = { note, canCosign }

  const approve = async () => {
    if (note === null) return
    setBusy(true)
    try {
      await clinicalNoteService.cosignNote(note.id)
      toast.notify('Note counter-signed. It is now part of the record.', 'success')
      setConfirmApprove(false)
      setSelectedId(null)
      load()
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not counter-sign this note.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const sendBack = async () => {
    if (note === null || reason.trim().length < 10) return
    setBusy(true)
    try {
      await clinicalNoteService.returnNoteToAuthor(note.id, reason.trim())
      toast.notify('Returned to the author, who has been notified.', 'success')
      setReturning(false); setReason(''); setSelectedId(null)
      load()
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not return this note.', 'error')
    } finally {
      setBusy(false)
    }
  }

  // `a` / `r` act on the OPEN note only — never on a highlighted row. A
  // single keystroke must not be able to attest to something unread.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (state.current.note === null || !state.current.canCosign) return
      if (e.key === 'a') { e.preventDefault(); setConfirmApprove(true) }
      if (e.key === 'r') { e.preventDefault(); setReturning(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (error !== null) {
    return <ErrorState title="Could not load the co-sign queue" description={error} onRetry={load} />
  }
  if (queue === null) return <LoadingState label="Loading the queue…" />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Co-sign queue</h1>
        <p className="mt-0.5 text-xs text-ink-muted">
          Notes written by clinicians who do not hold signing rights. Until you counter-sign one, it
          is not part of the record.
        </p>
      </div>

      {!canCosign && (
        <Banner tone="info">
          You can read these notes but you do not hold counter-signing rights, so the approve and
          return controls are not available to you.
        </Banner>
      )}

      {queue.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Nothing waiting for you"
          description="Notes appear here when a resident or trainee on your team submits one. An empty queue means nobody is waiting."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ul className="space-y-1.5" aria-label="Notes awaiting counter-signature">
            {queue.map((item) => {
              const isOpen = item.id === selectedId
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={isOpen}
                    onClick={() => setSelectedId(isOpen ? null : item.id)}
                    className={`focus-ring w-full rounded-lg border p-2.5 text-left transition-colors ${
                      isOpen
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-border-soft bg-surface-1 hover:bg-surface-2'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{item.patientName}</span>
                      <AgeChip hours={item.ageHours} />
                    </div>
                    <p className="font-mono text-2xs text-ink-muted">{item.shriPatientId}</p>
                    <p className="mt-0.5 text-2xs text-ink-muted">
                      {item.problemText ?? 'Consultation note'}
                    </p>
                    <p className="mt-0.5 text-2xs text-ink-subtle">
                      {item.authoredBy ?? 'Unknown author'}
                      {item.authoredAt !== null &&
                        ` · ${formatDate(item.authoredAt)} ${formatTime(item.authoredAt)}`}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>

          <div>
            {selectedId === null ? (
              <Card padding="lg">
                <p className="text-sm text-ink-muted">
                  Select a note to read it. You can only counter-sign a note you have opened.
                </p>
              </Card>
            ) : noteError !== null ? (
              <ErrorState title="Could not open this note" description={noteError} />
            ) : note === null ? (
              <LoadingState label="Opening the note…" />
            ) : (
              <Card padding="md">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-soft pb-3">
                  <h2 className="text-sm font-semibold text-ink">
                    {note.problemText ?? 'Consultation note'}
                  </h2>
                  <Link
                    to={`/patient/${queue.find((q) => q.id === selectedId)?.shriPatientId ?? ''}/chart`}
                    className="focus-ring rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
                  >
                    Open the chart
                  </Link>
                </div>

                <dl className="space-y-3">
                  <Section label="Subjective" value={note.subjective} />
                  <Section label="Objective" value={note.objective} />
                  <Section label="Assessment" value={note.assessment} />
                  <Section label="Plan" value={note.plan} />
                </dl>

                {canCosign && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
                    <Button onClick={() => setConfirmApprove(true)}>Counter-sign</Button>
                    <Button variant="secondary" onClick={() => setReturning(true)}>
                      Return to author
                    </Button>
                    <span className="text-2xs text-ink-subtle">
                      <Kbd>a</Kbd> counter-sign · <Kbd>r</Kbd> return
                    </span>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {confirmApprove && note !== null && (
        <ConfirmDialog
          open
          title="Counter-sign this note?"
          consequence="Your name and registration number are recorded alongside the author's, permanently. The note becomes part of the legal record and can never be edited — only an addendum can be added. You are attesting that you have read it."
          confirmLabel="Counter-sign"
          confirmDisabled={busy}
          onConfirm={approve}
          onCancel={() => setConfirmApprove(false)}
        />
      )}

      {returning && note !== null && (
        <ConfirmDialog
          open
          title="Return this note to its author?"
          consequence="The note goes back to draft and the author is notified with your reason. It leaves your queue until they resubmit it."
          confirmLabel="Return to author"
          confirmDisabled={busy || reason.trim().length < 10}
          onConfirm={sendBack}
          onCancel={() => { setReturning(false); setReason('') }}
        >
          <div className="mt-3">
            <label htmlFor="return-reason" className="mb-1 block text-sm font-medium text-ink">
              What needs to change?
            </label>
            <textarea
              id="return-reason" rows={4} value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Be specific — a note returned without a reason comes back unchanged."
              className="focus-ring w-full resize-y rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
            />
            <p className="mt-1 text-2xs text-ink-subtle">
              {reason.trim().length}/10 characters minimum. The author sees this.
            </p>
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}

function Section({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-ink">
        {value === null || value.trim() === '' ? (
          <span className="text-ink-subtle">Nothing recorded in this section.</span>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function AgeChip({ hours }: { hours: number }) {
  // Words, not a colour. "Overdue" has to survive a greyscale print and a
  // clinician with a colour-vision deficiency (§5.3).
  const overdue = hours >= 24
  const label = hours < 1 ? 'Just now' : hours < 24 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold ${
        overdue ? 'bg-warning-bg text-warning-fg' : 'bg-surface-2 text-ink-muted'
      }`}
    >
      {label}{overdue && ' · overdue'}
    </span>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border-soft bg-surface-2 px-1 font-mono text-2xs text-ink-muted">
      {children}
    </kbd>
  )
}
