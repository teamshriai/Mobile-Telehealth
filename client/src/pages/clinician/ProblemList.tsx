import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Check, X } from 'lucide-react'
import { useEncounter } from './useEncounterRoute'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Combobox from '../../components/common/Combobox'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import DataTable, { type Column } from '../../components/common/DataTable'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate } from '../../components/clinic/format'
import { useToast } from '../../components/common/useToast'
import { ProblemStatusChip } from './PatientChart'
import * as problemService from '../../services/problem.service'
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
  const [codes, setCodes] = useState<DiagnosisCode[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<DiagnosisCode | null>(null)
  const [note, setNote] = useState('')
  const [onsetDate, setOnsetDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [toResolve, setToResolve] = useState<Problem | null>(null)

  const load = useCallback(() => {
    setLoadError(null)
    problemService.listProblems(patient.id).then(setProblems).catch(setLoadError)
  }, [patient.id])
  useEffect(load, [load])

  const activeCodes = useMemo(
    () => new Set((problems ?? []).filter((p) => p.status === 'Active').map((p) => p.code)),
    [problems],
  )

  // Debounced typeahead. The input is never disabled while a query is in
  // flight — ARC-17 forbids it, and a clinician typing a code should never
  // have characters swallowed by a network round-trip.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setCodes([]); return undefined }
    const t = window.setTimeout(() => {
      setSearching(true)
      problemService
        .searchDiagnosisCodes(q)
        .then(setCodes)
        .catch(() => setCodes([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => window.clearTimeout(t)
  }, [query])

  const selectCode = (c: DiagnosisCode) => {
    if (!c.isLeaf) {
      setAddError(`${c.code} is a category, not a diagnosis. Choose one of the codes beneath it.`)
      return
    }
    if (activeCodes.has(c.code)) {
      setAddError(`${c.code} is already on the active problem list.`)
      return
    }
    setAddError('')
    setPicked(c)
    setQuery(`${c.code} — ${c.title}`)
  }

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
    if (toResolve === null) return
    try {
      await problemService.resolveProblem(toResolve.id)
      toast.notify(`${toResolve.codeTitle} marked resolved.`, 'success')
      setToResolve(null)
      load()
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not resolve this problem.', 'error')
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
      <Card padding="md">
        <h2 className="mb-3 text-sm font-semibold text-ink">Add a problem</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
          <Combobox<DiagnosisCode>
            label="ICD-10 code or diagnosis"
            value={query}
            onValueChange={(v) => { setQuery(v); setPicked(null); setAddError('') }}
            options={codes}
            optionKey={(c) => c.code}
            loading={searching}
            placeholder="Start typing, e.g. pneumonia or J18"
            hint="Only specific codes can be selected. Categories are shown for context but cannot be coded."
            emptyMessage={query.trim().length < 2 ? 'Type at least two characters.' : 'No matching codes.'}
            onSelect={selectCode}
            renderOption={(c) => (
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xs text-ink-muted">{c.code}</span>
                <span className={c.isLeaf ? 'text-ink' : 'text-ink-subtle'}>{c.title}</span>
                {!c.isLeaf && (
                  <span className="ml-auto rounded bg-surface-2 px-1 text-2xs text-ink-subtle">
                    Category — not codable
                  </span>
                )}
                {c.isLeaf && activeCodes.has(c.code) && (
                  <span className="ml-auto rounded bg-warning-bg px-1 text-2xs text-warning-fg">
                    Already active
                  </span>
                )}
              </div>
            )}
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
