import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Check, Lock, X } from 'lucide-react'
import { useEncounter } from './useEncounterRoute'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import DataTable, { type Column } from '../../components/common/DataTable'
import DiagnosisCodePicker from '../../components/clinical/DiagnosisCodePicker'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate } from '../../components/clinic/format'
import { useToast } from '../../components/common/useToast'
import { ProblemStatusChip } from './PatientChart'
import * as problemService from '../../services/problem.service'
import * as clinicalNoteService from '../../services/clinicalNote.service'
import type { DiagnosisCode, Problem } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * S-06-05 · Problem List & Coding (ARC-15, Compact).
 *
 * Three rules, each of which exists because breaking it corrupts downstream
 * data that nobody notices until it is reported:
 *
 *  1. **A parent-only code is never selectable.** `J18` is a category, not a
 *     diagnosis. Coding it produces a problem list that cannot be analysed
 *     and a claim that will be rejected. Parents are shown (so the clinician
 *     can see where they are in the tree) but cannot be chosen.
 *  2. **The list is deduplicated against ACTIVE problems**, not against all
 *     of them. Re-coding a resolved problem is a legitimate recurrence.
 *  3. **Nothing is deleted.** A problem that turns out to be wrong is
 *     resolved or ruled out; the fact that it was once believed is part of
 *     the record. The server has no delete verb for this at all.
 */

export default function ProblemList() {
  const { patient, encounter } = useEncounter()
  const toast = useToast()

  const [problems, setProblems] = useState<Problem[] | null>(null)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<DiagnosisCode | null>(null)
  const [note, setNote] = useState('')
  const [onsetDate, setOnsetDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [toResolve, setToResolve] = useState<Problem | null>(null)
  const [resolving, setResolving] = useState(false)
  const [noteSigned, setNoteSigned] = useState(false)

  const load = useCallback(() => {
    setLoadError(null)
    problemService.listProblems(patient.id).then(setProblems).catch(setLoadError)
  }, [patient.id])
  useEffect(load, [load])

  /**
   * `LOCKED` — coding closes when this visit's note is signed.
   *
   * ⚠️ THE PROBLEM LIST IS PATIENT-LEVEL, NOT ENCOUNTER-LEVEL, so "locked" here
   * means something narrower than on the note: the list itself is never frozen
   * — the patient will be coded again at the next visit — but a problem can no
   * longer be attributed to THIS encounter once its note is signed. Adding one
   * afterwards would stamp `onsetEncounterId` on a visit whose record is closed,
   * which is the same thing `CMP-NABH-10` forbids on the note, arriving by a
   * side door.
   *
   * The screen says where to go instead rather than just refusing.
   */
  useEffect(() => {
    let live = true
    clinicalNoteService
      .listNotes(patient.id)
      .then((notes) => {
        if (!live) return
        const forThis = notes.filter((n) => n.encounterId === encounter.id)
        setNoteSigned(forThis.length > 0 && forThis.every((n) => n.status !== 'Draft'))
      })
      .catch(() => {
        // ⚠️ Fails OPEN, deliberately. If the note's status cannot be read we
        // do not know that it is signed, and locking a clinician out of coding
        // on a guess is worse than the narrow risk of a late attribution — the
        // server remains free to refuse.
        if (live) setNoteSigned(false)
      })
    return () => { live = false }
  }, [patient.id, encounter.id])

  const activeCodes = useMemo(
    () => new Set((problems ?? []).filter((p) => p.status === 'Active').map((p) => p.code)),
    [problems],
  )

  // The typeahead, its debounce and the leaf/duplicate rules live in
  // DiagnosisCodePicker — one implementation, shared with the consultation
  // note. See that file's header for why it is not duplicated.

  const add = async () => {
    if (picked === null) return
    setAdding(true)
    setAddError('')
    try {
      await problemService.addProblem({
        patientId: patient.id,
        code: picked.code,
        encounterId: encounter.id,
        onsetDate: onsetDate === '' ? null : onsetDate,
        note: note.trim() === '' ? null : note.trim(),
      })
      setPicked(null); setQuery(''); setNote(''); setOnsetDate('')
      toast.notify(`${picked.code} added to the problem list.`, 'success')
      load()
    } catch (err) {
      setAddError((err as ApiError).message || 'Could not add this problem.')
    } finally {
      setAdding(false)
    }
  }

  const resolve = async () => {
    // ⚠️ Guarded and reset in `finally`. The confirm dialog does not disable
    // itself while the request is in flight, so a double-tap on a slow
    // connection fired two resolves and the second came back 409 "already
    // resolved" — an error the clinician did nothing wrong to earn.
    if (toResolve === null || resolving) return
    setResolving(true)
    try {
      await problemService.resolveProblem(toResolve.id)
      toast.notify(`${toResolve.codeTitle} marked resolved.`, 'success')
      setToResolve(null)
      load()
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not resolve this problem.', 'error')
    } finally {
      setResolving(false)
    }
  }

  const columns = useMemo<Array<Column<Problem>>>(
    () => [
      {
        key: 'code', header: 'Code', card: 'subtitle',
        sortValue: (r) => r.code,
        render: (r) => <span className="font-mono text-2xs text-ink-muted">{r.code}</span>,
      },
      {
        key: 'title', header: 'Problem', card: 'title',
        sortValue: (r) => r.codeTitle,
        render: (r) => (
          <div>
            <span className="font-medium text-ink">{r.codeTitle}</span>
            {r.note !== null && r.note !== '' && (
              <p className="text-2xs text-ink-subtle">{r.note}</p>
            )}
          </div>
        ),
      },
      {
        key: 'status', header: 'Status', card: 'meta',
        sortValue: (r) => r.status,
        render: (r) => <ProblemStatusChip status={r.status} />,
      },
      {
        key: 'onset', header: 'Onset', card: 'meta', hideBelow: 'lg',
        sortValue: (r) => r.onsetDate ?? '',
        render: (r) => (
          <span className="tabular-nums text-ink-muted">
            {r.onsetDate === null ? '—' : formatDate(r.onsetDate)}
          </span>
        ),
      },
      {
        key: 'actions', header: '', card: 'hidden',
        render: (r) =>
          r.status === 'Active' ? (
            <Button size="xs" variant="ghost" onClick={() => setToResolve(r)}>
              Resolve
            </Button>
          ) : (
            <span className="text-2xs text-ink-subtle">
              {r.resolvedAt === null ? '' : formatDate(r.resolvedAt)}
            </span>
          ),
      },
    ],
    [],
  )

  if (loadError !== null) {
    return <ErrorState title="Could not load the problem list" description={loadError} onRetry={load} />
  }
  if (problems === null) return <LoadingState label="Loading problems…" />

  const active = problems.filter((p) => p.status === 'Active')
  const rest = problems.filter((p) => p.status !== 'Active')

  return (
    <div className="space-y-4">
      {noteSigned ? (
        // ⚠️ LOCKED. Stated with the reason and the legitimate next action —
        // §1.5 asks for "read-only naming who holds it and since when, plus the
        // legitimate next action", and a bare disabled form names none of those.
        <Card padding="md">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Lock size={14} aria-hidden="true" className="text-ink-muted" />
            Coding for this visit is closed
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            This visit&rsquo;s note has been signed, so a problem can no longer be attributed to
            it. The problem list below is still the patient&rsquo;s live list and is unchanged.
          </p>
          <p className="mt-1.5 text-xs text-ink-subtle">
            To record something you have since realised, add an addendum to the signed note. To
            code a new problem, do it at the next visit.
          </p>
        </Card>
      ) : (
      <Card padding="md">
        <h2 className="mb-3 text-sm font-semibold text-ink">Add a problem</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
          <DiagnosisCodePicker
            value={query}
            onValueChange={(v) => { setQuery(v); setPicked(null); setAddError('') }}
            onPick={(c) => { setAddError(''); setPicked(c); setQuery(`${c.code} — ${c.title}`) }}
            onReject={setAddError}
            activeCodes={activeCodes}
          />
          <div>
            <label htmlFor="onset" className="mb-1.5 block text-sm font-medium text-ink-muted">
              Onset date <span className="text-ink-subtle">(optional)</span>
            </label>
            <input
              id="onset"
              type="date"
              value={onsetDate}
              onChange={(e) => setOnsetDate(e.target.value)}
              className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
            />
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="pnote" className="mb-1.5 block text-sm font-medium text-ink-muted">
            Note <span className="text-ink-subtle">(optional)</span>
          </label>
          <input
            id="pnote"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything that qualifies this problem"
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
          />
        </div>

        {addError !== '' && (
          <div className="mt-3">
            <Banner tone="error">{addError}</Banner>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => void add()} loading={adding} disabled={picked === null} icon={<Check size={14} />}>
            Add to problem list
          </Button>
          {picked !== null && (
            <Button variant="ghost" size="sm" onClick={() => { setPicked(null); setQuery('') }} icon={<X size={14} />}>
              Clear
            </Button>
          )}
        </div>
      </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Active problems ({active.length})</h2>
        <DataTable
          caption="Active problems"
          rows={active}
          columns={columns}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No active problems"
              description="Code the reason for this consultation above so it carries forward to the next clinician who sees this patient."
            />
          }
        />
      </section>

      {rest.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Resolved and ruled out ({rest.length})
          </h2>
          <DataTable caption="Resolved problems" rows={rest} columns={columns} rowKey={(r) => r.id} />
        </section>
      )}

      {toResolve !== null && (
        <ConfirmDialog
          open
          title={`Mark "${toResolve.codeTitle}" resolved?`}
          consequence="The problem stays on the record and on the timeline — it moves out of the active list and stops appearing as a current problem. It is not deleted, and you can code it again if it recurs."
          confirmLabel="Mark resolved"
          onConfirm={resolve}
          onCancel={() => setToResolve(null)}
        />
      )}
    </div>
  )
}
