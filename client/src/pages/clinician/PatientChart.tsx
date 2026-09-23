import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity, ClipboardList, FileText, FlaskConical, Folder, Pill, Stethoscope,
} from 'lucide-react'
import { usePatient } from './usePatientRoute'
import Tabs from '../../components/common/Tabs'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable, { type Column } from '../../components/common/DataTable'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import * as problemService from '../../services/problem.service'
import * as clinicalNoteService from '../../services/clinicalNote.service'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import { useToast } from '../../components/common/useToast'
import { classifyAllergies, formatBloodGroup } from '../../components/clinical/patientDisplay'
import {
  encounterStatusLabel,
  noteStatusLabel,
  prescriptionStatusLabel,
  problemStatusLabel,
} from '../../components/clinical/clinicalLabels'
import { encounterTypeLabel } from '../../components/clinical/encounterLabels'
import type { ClinicalNote, PrescriptionStatus, Problem, ProblemStatus } from '../../types/domain'
import type { EncounterListItem } from '../../services/clinicalPatient.service'
import type { ApiError } from '../../types/api'

/**
 * S-06-02 · Patient Chart Summary (ARC-02 record view, Compact).
 *
 * The chart is where a clinician orients before doing anything. Two rules
 * shape it:
 *
 *  1. **A summary must be visibly a summary.** ARC-02 requires a standing
 *     escape to the unsummarised record, so "Open full timeline" is a
 *     permanent control, not a link buried in a tab.
 *  2. **Nothing here is generated.** Every panel is a direct read of a stored
 *     row. With AI off there is no narrative summary and the screen does not
 *     pretend there is one (§4.8 — the affordance is absent, not greyed).
 *
 * Tabs are the atlas's six, in its order. `1`–`9` jump between them; the
 * active tab is in the query string so a chart can be linked or refreshed
 * without losing the clinician's place.
 */

type TabId = 'summary' | 'problems' | 'medications' | 'results' | 'notes' | 'documents'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'problems', label: 'Problems' },
  { id: 'medications', label: 'Medications' },
  { id: 'results', label: 'Results' },
  { id: 'notes', label: 'Notes' },
  { id: 'documents', label: 'Documents' },
]

function isTabId(v: string | null): v is TabId {
  return TABS.some((t) => t.id === v)
}

export default function PatientChart() {
  const { patient } = usePatient()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabId = isTabId(raw) ? raw : 'summary'

  const setTab = useCallback(
    (id: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', id)
        return next
      }, { replace: true })
    },
    [setParams],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Patient chart
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            A summary of the record. Everything shown here is stored data, not a generated
            narrative.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* ARC-02's standing escape hatch — a summary must always offer the
              unsummarised record, on every tab. */}
          <Link
            to={`/patient/${patient.shriPatientId}/timeline`}
            className="focus-ring inline-flex h-9 items-center rounded-lg border border-border-soft bg-surface-1 px-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            Open full timeline
          </Link>
          <StartConsultationButton shriPatientId={patient.shriPatientId} />
        </div>
      </div>

      <Tabs label="Chart sections" activeId={tab} onChange={setTab} tabs={TABS}>
        {tab === 'summary' && <SummaryTab />}
        {tab === 'problems' && <ProblemsTab />}
        {tab === 'medications' && <MedicationsTab />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'notes' && <NotesTab />}
        {tab === 'documents' && <DocumentsTab />}
      </Tabs>
    </div>
  )
}

function StartConsultationButton({ shriPatientId }: { shriPatientId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setBusy(true)
    try {
      const { visitId } = await clinicalPatientService.createEncounter(shriPatientId, {
        type: 'ClinicVisit',
        chiefComplaint: null,
      })
      navigate(`/encounter/${visitId}/note`)
    } catch (err) {
      toast.notify((err as ApiError).message || 'Could not start a consultation.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button onClick={start} loading={busy} size="sm">
      Start consultation
    </Button>
  )
}

/* ── Summary ─────────────────────────────────────────────────────────────── */

function SummaryTab() {
  const { patient } = usePatient()
  const allergy = classifyAllergies(patient.knownAllergies)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {/* Allergies first and largest. This is the one panel whose absence is
          itself clinically meaningful, so it never collapses to "—". */}
      <Card padding="md" className="lg:col-span-2 2xl:col-span-1">
        <PanelHeading icon={Activity} title="Allergies" />
        {/* Three states, not two — see patientDisplay.ts. The classification is
            shared with the Z3 banner so the two can never disagree about
            whether this patient has an allergy. */}
        {allergy.kind === 'unrecorded' ? (
          <Banner tone="warning">
            <span className="font-medium">Allergies not recorded.</span> This is not the same as
            &ldquo;no known allergies&rdquo; — nobody has asked yet. Ask before prescribing.
          </Banner>
        ) : allergy.kind === 'none' ? (
          <p className="text-sm text-ink">
            {patient.knownAllergies}.{' '}
            <span className="text-ink-subtle">Recorded, not assumed.</span>
          </p>
        ) : (
          <Banner tone="error">
            <span className="whitespace-pre-line font-medium">{allergy.text}</span>
          </Banner>
        )}
      </Card>

      <FreeTextPanel icon={Stethoscope} title="Known conditions" body={patient.existingDiseases} />
      <FreeTextPanel icon={Pill} title="Current medications" body={patient.currentMedications} />
      <FreeTextPanel icon={ClipboardList} title="Past surgery" body={patient.previousSurgeries} />
      <FreeTextPanel icon={ClipboardList} title="Family history" body={patient.familyHistory} />

      <Card padding="md">
        <PanelHeading icon={ClipboardList} title="Social and lifestyle" />
        <dl className="space-y-1.5 text-sm">
          <Row label="Smoking" value={patient.smokingStatus} />
          <Row label="Alcohol" value={patient.alcoholStatus} />
          <Row label="Tobacco" value={patient.tobaccoStatus} />
          <Row label="Physical activity" value={patient.physicalActivity} />
          <Row label="Occupation" value={patient.occupation} />
        </dl>
      </Card>

      <Card padding="md">
        <PanelHeading icon={ClipboardList} title="Identity and contact" />
        <dl className="space-y-1.5 text-sm">
          <Row label="UHID" value={patient.shriPatientId} mono />
          <Row label="ABHA" value={patient.abhaId} mono />
          <Row
            label="Date of birth"
            value={
              patient.dateOfBirth === null
                ? null
                : `${formatDate(patient.dateOfBirth)}${patient.dobIsEstimated ? ' (estimated)' : ''}`
            }
          />
          <Row label="Blood group" value={formatBloodGroup(patient.bloodGroup)} />
          <Row label="Phone" value={patient.phoneNumber} />
          <Row
            label="Emergency contact"
            value={
              patient.emergencyContactName === null
                ? null
                : `${patient.emergencyContactName}${
                    patient.emergencyContactRelation ? ` (${patient.emergencyContactRelation})` : ''
                  }${patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ''}`
            }
          />
        </dl>
        <p className="mt-3 text-2xs text-ink-subtle">
          Record last updated {formatDate(patient.updatedAt)} at {formatTime(patient.updatedAt)}
        </p>
      </Card>
    </div>
  )
}

function PanelHeading({
  icon: Icon,
  title,
}: {
  icon: typeof Activity
  title: string
}) {
  return (
    <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
      <Icon size={15} aria-hidden="true" className="text-ink-muted" />
      {title}
    </h2>
  )
}

function FreeTextPanel({
  icon,
  title,
  body,
}: {
  icon: typeof Activity
  title: string
  body: string | null
}) {
  return (
    <Card padding="md">
      <PanelHeading icon={icon} title={title} />
      {body === null || body.trim() === '' ? (
        <p className="text-sm text-ink-subtle">Not recorded.</p>
      ) : (
        <p className="whitespace-pre-line text-sm text-ink">{body}</p>
      )}
    </Card>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className={`text-right text-ink ${mono ? 'font-mono text-2xs' : ''}`}>
        {value === null || value === '' ? <span className="text-ink-subtle">—</span> : value}
      </dd>
    </div>
  )
}

/* ── Problems ────────────────────────────────────────────────────────────── */

function ProblemsTab() {
  const { patient } = usePatient()
  const [problems, setProblems] = useState<Problem[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    setError(null)
    problemService.listProblems(patient.id).then(setProblems).catch(setError)
  }, [patient.id])
  useEffect(load, [load])

  const columns = useMemo<Array<Column<Problem>>>(
    () => [
      {
        key: 'code',
        header: 'Code',
        card: 'subtitle',
        sortValue: (r) => r.code,
        render: (r) => <span className="font-mono text-2xs text-ink-muted">{r.code}</span>,
      },
      {
        key: 'title',
        header: 'Problem',
        card: 'title',
        sortValue: (r) => r.codeTitle,
        render: (r) => <span className="font-medium text-ink">{r.codeTitle}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        card: 'meta',
        sortValue: (r) => r.status,
        render: (r) => <ProblemStatusChip status={r.status} />,
      },
      {
        key: 'onset',
        header: 'Onset',
        card: 'meta',
        hideBelow: 'lg',
        sortValue: (r) => r.onsetDate ?? '',
        render: (r) => (
          <span className="tabular-nums text-ink-muted">
            {r.onsetDate === null ? '—' : formatDate(r.onsetDate)}
          </span>
        ),
      },
    ],
    [],
  )

  if (error !== null) {
    return <ErrorState title="Could not load the problem list" description={error} onRetry={load} />
  }
  if (problems === null) return <LoadingState label="Loading problems…" />

  const active = problems.filter((p) => p.status === 'Active')
  const inactive = problems.filter((p) => p.status !== 'Active')

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Active ({active.length})</h2>
        <DataTable
          caption="Active problems"
          rows={active}
          columns={columns}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No active problems coded"
              description="Problems are coded during a consultation. Open an encounter and use Problems & coding to add one."
            />
          }
        />
      </section>

      {inactive.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Resolved and inactive ({inactive.length})
          </h2>
          {/* Resolved problems are kept, never deleted — a problem that was
              once true stays part of the history. */}
          <DataTable
            caption="Resolved and inactive problems"
            rows={inactive}
            columns={columns}
            rowKey={(r) => r.id}
          />
        </section>
      )}
    </div>
  )
}

export function ProblemStatusChip({ status }: { status: ProblemStatus }) {
  const tone =
    status === 'Active'
      ? 'bg-warning-bg text-warning-fg'
      : status === 'Resolved'
        ? 'bg-success-bg text-success-fg'
        : 'bg-surface-2 text-ink-muted'
  // Text carries the meaning; colour only reinforces it (§5.3).
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-2xs font-semibold ${tone}`}>
      {problemStatusLabel(status)}
    </span>
  )
}

/* ── Medications ─────────────────────────────────────────────────────────── */

function MedicationsTab() {
  const { patient } = usePatient()

  return (
    <div className="space-y-4">
      <Card padding="md">
        <PanelHeading icon={Pill} title="Recorded by the patient" />
        {patient.currentMedications === null || patient.currentMedications.trim() === '' ? (
          <p className="text-sm text-ink-subtle">Nothing recorded.</p>
        ) : (
          <p className="whitespace-pre-line text-sm text-ink">{patient.currentMedications}</p>
        )}
      </Card>

      <PrescriptionHistory />
    </div>
  )
}

function PrescriptionHistory() {
  const { patient } = usePatient()
  const [rows, setRows] = useState<Array<{ id: string; rxNumber: string; status: PrescriptionStatus; signedAt: string | null; createdAt: string; itemCount: number }> | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    setError(null)
    import('../../services/prescription.service')
      .then((m) => m.listForPatient(patient.id))
      .then((list) =>
        setRows(
          list.map((p) => ({
            id: p.id,
            rxNumber: p.rxNumber,
            status: p.status,
            signedAt: p.signedAt,
            createdAt: p.createdAt,
            itemCount: p.items.length,
          })),
        ),
      )
      .catch(setError)
  }, [patient.id])
  useEffect(load, [load])

  if (error !== null) {
    return <ErrorState title="Could not load prescriptions" description={error} onRetry={load} />
  }
  if (rows === null) return <LoadingState label="Loading prescriptions…" />

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-ink">Prescriptions issued here</h2>
      <DataTable
        caption="Prescriptions issued at this facility"
        rows={rows}
        columns={[
          {
            key: 'rx',
            header: 'Number',
            card: 'title',
            render: (r) => (
              <span className="font-mono text-2xs text-ink">{r.rxNumber}</span>
            ),
          },
          { key: 'status', header: 'Status', card: 'subtitle', render: (r) => prescriptionStatusLabel(r.status) },
          {
            key: 'items',
            header: 'Items',
            card: 'meta',
            render: (r) => <span className="tabular-nums">{r.itemCount}</span>,
          },
          {
            key: 'date',
            header: 'Signed',
            card: 'meta',
            render: (r) => (
              <span className="tabular-nums text-ink-muted">
                {r.signedAt === null ? '—' : formatDate(r.signedAt)}
              </span>
            ),
          },
        ]}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            icon={Pill}
            title="No prescriptions on file"
            description="Prescriptions written in this system appear here once they are signed."
          />
        }
      />
    </section>
  )
}

/* ── Results ─────────────────────────────────────────────────────────────── */

function ResultsTab() {
  // ⚠️ Not an empty state. An empty results tab reads as "there are no
  // results", which on a chart is a clinical statement — and a false one.
  // The honest rendering is that this system does not hold results yet.
  return (
    <div className="rounded-xl border border-dashed border-border-soft p-6">
      <div className="flex items-start gap-3">
        <FlaskConical size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted" />
        <div>
          <h2 className="text-sm font-semibold text-ink">Results are not in this release</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Laboratory and imaging results (modules M-09, M-14 and M-15) are not part of this
            release. This panel is empty because the data is not here — not because the patient
            has no results. Check your laboratory system.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Notes ───────────────────────────────────────────────────────────────── */

function NotesTab() {
  const { patient } = usePatient()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<ClinicalNote[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    setError(null)
    clinicalNoteService.listNotes(patient.id).then(setNotes).catch(setError)
  }, [patient.id])
  useEffect(load, [load])

  if (error !== null) {
    return <ErrorState title="Could not load notes" description={error} onRetry={load} />
  }
  if (notes === null) return <LoadingState label="Loading notes…" />

  return (
    <DataTable
      caption="Clinical notes"
      rows={notes}
      columns={[
        {
          key: 'date',
          header: 'Date',
          card: 'subtitle',
          sortValue: (r) => r.createdAt,
          render: (r) => (
            <span className="tabular-nums text-ink-muted">{formatDate(r.createdAt)}</span>
          ),
        },
        {
          key: 'problem',
          header: 'Reason',
          card: 'title',
          render: (r) => (
            <span className="font-medium text-ink">
              {r.problemText ?? r.assessment?.slice(0, 80) ?? 'Consultation note'}
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          card: 'meta',
          render: (r) => <NoteStatusChip note={r} />,
        },
        {
          key: 'author',
          header: 'Signed by',
          card: 'meta',
          hideBelow: 'lg',
          render: (r) => (
            <span className="text-ink-muted">{r.signerName ?? 'Not signed'}</span>
          ),
        },
      ]}
      rowKey={(r) => r.id}
      // ⚠️ `encounterVisitId`, not `encounterId`. The route is keyed on the
      // visit id; the internal UUID would 404 on every row.
      onRowActivate={(r) =>
        r.encounterVisitId === null
          ? undefined
          : navigate(`/encounter/${r.encounterVisitId}/note`)
      }
      emptyState={
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Start a consultation to write the first note for this patient."
        />
      }
    />
  )
}

export function NoteStatusChip({ note }: { note: ClinicalNote }) {
  const label =
    note.status === 'CosignPending'
      ? 'Awaiting co-sign'
      : note.status === 'Signed' && note.addenda.length > 0
        ? `Signed · ${note.addenda.length} addend${note.addenda.length === 1 ? 'um' : 'a'}`
        : noteStatusLabel(note.status)
  const tone =
    note.status === 'Signed'
      ? 'bg-success-bg text-success-fg'
      : note.status === 'CosignPending'
        ? 'bg-warning-bg text-warning-fg'
        : 'bg-surface-2 text-ink-muted'
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-2xs font-semibold ${tone}`}>
      {label}
    </span>
  )
}

/* ── Documents ───────────────────────────────────────────────────────────── */

function DocumentsTab() {
  const { patient } = usePatient()
  const navigate = useNavigate()
  const [rows, setRows] = useState<EncounterListItem[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    setError(null)
    clinicalPatientService.listEncountersForPatient(patient.shriPatientId).then(setRows).catch(setError)
  }, [patient.shriPatientId])
  useEffect(load, [load])

  if (error !== null) {
    return <ErrorState title="Could not load encounters" description={error} onRetry={load} />
  }
  if (rows === null) return <LoadingState label="Loading encounters…" />

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-subtle">
        Scanned and uploaded documents (module M-16) are not in this release. What follows is the
        encounter record held in this system.
      </p>
      <DataTable
        caption="Encounters"
        rows={rows}
        columns={[
          {
            key: 'started',
            header: 'Date',
            card: 'subtitle',
            sortValue: (r) => r.startedAt,
            render: (r) => (
              <span className="tabular-nums text-ink-muted">
                {formatDate(r.startedAt)} {formatTime(r.startedAt)}
              </span>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            card: 'title',
            render: (r) => (
              <span className="font-medium text-ink">{encounterTypeLabel(r.type)}</span>
            ),
          },
          { key: 'status', header: 'Status', card: 'meta', render: (r) => encounterStatusLabel(r.status) },
          {
            key: 'complaint',
            header: 'Chief complaint',
            card: 'hidden',
            hideBelow: 'xl',
            render: (r) => <span className="text-ink-muted">{r.chiefComplaint ?? '—'}</span>,
          },
        ]}
        rowKey={(r) => r.visitId}
        // ⚠️ The encounter history must be openable. Without this the chart
        // lists every visit a patient has had and lets you open none of them —
        // a clinician could only ever start a NEW consultation, never reopen
        // the one that produced the note they are looking at.
        onRowActivate={(r) => navigate(`/encounter/${r.visitId}/note`)}
        emptyState={
          <EmptyState
            icon={Folder}
            title="No encounters recorded"
            description="An encounter is created when you start a consultation."
          />
        }
      />
    </div>
  )
}
