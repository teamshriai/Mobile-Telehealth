import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity, ClipboardList, FileText, FlaskConical, Folder, Pill, ReceiptText, Stethoscope,
} from 'lucide-react'
import { usePatient } from './usePatientRoute'
import { useAuth } from '../../app/useAuth'
import { useMediaQuery } from '../../app/useMediaQuery'
import PatientContextRail from '../../components/clinical/PatientContextRail'
import ChartAiPanel from '../../ai/components/ChartAiPanel'
import Tabs from '../../components/common/Tabs'
import BottomSheet from '../../components/common/BottomSheet'
import Card from '../../components/common/Card'
import PatientReportedNotes from '../../components/clinical/PatientReportedNotes'
import Button from '../../components/common/Button'
import DataTable, { type Column } from '../../components/common/DataTable'
import { EmptyState, ErrorState, Skeleton } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import * as problemService from '../../services/problem.service'
import * as clinicalNoteService from '../../services/clinicalNote.service'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import { useToast } from '../../components/common/useToast'
import { formatBloodGroup, patientFullName } from '../../components/clinical/patientDisplay'
import {
  encounterStatusLabel,
  noteStatusLabel,
  prescriptionStatusLabel,
  problemStatusLabel,
} from '../../components/clinical/clinicalLabels'
import { encounterTypeLabel } from '../../components/clinical/encounterLabels'
import type {
  ClinicalNote,
  ClinicalPatient,
  PrescriptionStatus,
  Problem,
  ProblemStatus,
} from '../../types/domain'
import type { EncounterPage } from '../../services/clinicalPatient.service'
import type { ApiError } from '../../types/api'

/**
 * S-06-02 · Patient Chart Summary (ARC-02 record view, Compact).
 *
 * The chart is where a clinician orients before doing anything. Two rules
 * shape it:
 *
 *  1. **A summary must be visibly a summary.** ARC-02 requires a standing
 *     escape to the unsummarised record, so "View full record" is a permanent
 *     `Z4` control — enabled always, never gated, never hidden when AI is off.
 *  2. **Nothing in `Z5` is generated.** Every tab panel is a direct read of a
 *     stored row. The only generated content on this screen is in `Z6`, is
 *     marked with `◆`, carries its confidence band, and links back to the
 *     unsummarised record. With AI off it disappears entirely (§4.8 — the
 *     affordance is absent, not greyed) and the screen is unchanged otherwise.
 *
 * Tabs are the atlas's seven, in its order (§6437). `1`–`9` jump between them;
 * the active tab is in the query string so a chart can be linked or refreshed
 * without losing the clinician's place.
 *
 * ⚠️ `Z6` IS NEVER DROPPED, ONLY RELOCATED — three behaviours, per §6474 and
 * §5.1: drawn as a rail at ≥1280, a tab at 768–1279, a bottom sheet below 768.
 * Its content is the one thing a clinician re-checks constantly, so it stays
 * one gesture away at every width rather than being hidden on the narrow ones.
 *
 * ⚠️ Where the two sections disagree, the screen line wins. §5.1's generic
 * table makes `Z6` a bottom sheet from `md` (1024) down; §6474 says it collapses
 * to a tab at 1024–1279. §5.2 — "a screen specification describes only the
 * zones it changes" — makes the screen spec the deviation that governs.
 *
 * **States.** §1.5 permits a screen to declare a state `n/a` "but only with a
 * reason", so the two that are:
 *
 *   `VALIDATION` — n/a. This screen commits nothing. The only input is the
 *     assistant's question box, where an empty question simply does not submit;
 *     there is no field whose value could be invalid and no primary action to
 *     hold disabled.
 *   `LOCKED`     — n/a. The chart is a read-only projection of records that are
 *     locked, or not, on the screens that own them. A lock here would be
 *     reporting someone else's state and could disagree with it.
 *
 * Every other state is reachable: `SAVING` on Start consultation, `STALE` on
 * the freshness stamp, `OFFLINE` from the shell's `C-37` strip, `PARTIAL` from
 * the rail, `DENIED`/`BREAKGLASS` from `PatientShell`, and the three AI states
 * from the demo switcher in the account menu.
 */

type TabId =
  | 'summary'
  | 'problems'
  | 'medications'
  | 'results'
  | 'notes'
  | 'documents'
  | 'billing'
  /** ⚠️ Not an atlas tab — the `Z6` rail, reachable below 1280. See above. */
  | 'context'

const ATLAS_TABS: Array<{ id: TabId; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'problems', label: 'Problems' },
  { id: 'medications', label: 'Medications' },
  { id: 'results', label: 'Results' },
  { id: 'notes', label: 'Notes' },
  { id: 'documents', label: 'Documents' },
  { id: 'billing', label: 'Billing' },
]

const CONTEXT_TAB = { id: 'context' as const, label: 'Context' }

function isTabId(v: string | null): v is TabId {
  return v === 'context' || ATLAS_TABS.some((t) => t.id === v)
}

export default function PatientChart() {
  const { patient, reload } = usePatient()
  const navigate = useNavigate()
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabId = isTabId(raw) ? raw : 'summary'

  /**
   * ⚠️ `xl` (1280px) is the rail's breakpoint, matching §6474's "≥1280 as
   * drawn". Read once through `matchMedia` and kept in sync by its change
   * event — not a `resize` listener, which fires on every pixel of a drag.
   */
  const wide = useMediaQuery('(min-width: 1280px)')
  /**
   * ⚠️ THREE BEHAVIOURS, NOT TWO (§6474 + §5.1):
   *   ≥1280      the rail is drawn
   *   768–1279   it collapses to a tab
   *   <768       it is a bottom sheet
   * A tab at phone width would sit in a horizontally scrolling strip past six
   * others, which is not "one gesture away" for the one thing on this screen a
   * clinician re-checks constantly.
   */
  const phone = useMediaQuery('(max-width: 767px)')
  const [sheetOpen, setSheetOpen] = useState(false)

  const railHref = `/patient/${patient.shriPatientId}/timeline`

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

  // The Context tab exists only in the 768–1279 band. Above it the rail is
  // drawn, below it the sheet takes over — and the same content must never be
  // reachable two ways at once.
  const tabs = wide || phone ? ATLAS_TABS : [...ATLAS_TABS, CONTEXT_TAB]

  // If the viewport leaves that band while the Context tab is open, the tab
  // disappears. Fall back to Summary rather than rendering nothing.
  useEffect(() => {
    if ((wide || phone) && tab === 'context') setTab('summary')
  }, [wide, phone, tab, setTab])

  /**
   * §6476 — "`Esc` returns to the caller". Browser history is the honest
   * definition of "the caller": the clinician came from My Day, a search, or
   * the timeline, and only history knows which.
   *
   * ⚠️ CAPTURE PHASE, AND THAT IS LOAD-BEARING. `Esc` must close the topmost
   * overlay and nothing else — so this has to know whether one is open. Every
   * other dismisser in the app (`useDismissable`, `Drawer`, `Modal`) listens on
   * `document` in the bubble phase, which runs BEFORE a bubble-phase listener
   * on `window`. Registered that way, this handler saw a DOM from which the
   * menu had already been closed and navigated the clinician off the chart on
   * the same keypress that was only meant to shut a popover. Capture runs
   * first, while the overlay is still mounted, so the guard below is reliable
   * rather than a race.
   *
   * ⚠️ Also ignored while a text field has focus: `Esc` in a search box means
   * "clear this", never "leave the patient".
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const overlay = document.querySelector(
        '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
      )
      if (overlay !== null) return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      navigate(-1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [navigate])

  return (
    <div className="space-y-4">
      {/* ── Z4 · breadcrumb, title, status chips, actions ─────────────────── */}
      <div className="space-y-2">
        <ChartBreadcrumb name={patientFullName(patient)} />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Patient chart
            </h1>
            <ChartStatusChips />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ⚠️ §6446 — "View full record", enabled ALWAYS. Not gated on a
                capability and not hidden when AI is off: it is the escape hatch
                behind every summary in the product, and §6485 is explicit that
                "a summary nobody can go behind is not trusted". */}
            <Button variant="secondary" size="sm" onClick={() => navigate(railHref)}>
              View full record
            </Button>
            {/* §6443 — primary, needs note.write + relationship. The server is
                the real gate; hiding it here just avoids offering an action
                that would be refused. */}
            {can('note:write:assigned') && (
              <StartConsultationButton shriPatientId={patient.shriPatientId} />
            )}
          </div>
        </div>
      </div>

      <StaleStamp onRefresh={reload} />

      {/* ≥1280: Z5 + Z6 as drawn. Below: one column, rail as a tab. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Tabs label="Chart sections" activeId={tab} onChange={setTab} tabs={tabs}>
            {tab === 'summary' && <SummaryTab />}
            {tab === 'problems' && <ProblemsTab />}
            {tab === 'medications' && <MedicationsTab />}
            {tab === 'results' && <ResultsTab />}
            {tab === 'notes' && <NotesTab />}
            {tab === 'documents' && <DocumentsTab />}
            {tab === 'billing' && <BillingTab />}
            {tab === 'context' && (
              <ContextRegion patient={patient} timelineHref={railHref} inRail={false} />
            )}
          </Tabs>
        </div>

        {wide && <ContextRegion patient={patient} timelineHref={railHref} inRail />}
      </div>

      {/* <768 · Z6 as a bottom sheet, with a persistent trigger. */}
      {phone && (
        <>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="focus-ring fixed inset-x-4 bottom-4 z-30 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-soft bg-surface-1 px-4 text-sm font-medium text-ink shadow-card-lg"
          >
            Patient context
          </button>
          {/* Clears the fixed trigger so the last card is never behind it. */}
          <div aria-hidden="true" className="h-16" />
          <BottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Patient context"
          >
            <ContextRegion patient={patient} timelineHref={railHref} inRail={false} />
          </BottomSheet>
        </>
      )}
    </div>
  )
}

/**
 * `Z6` — the context rail and the AI panel, as one region.
 *
 * ⚠️ ONE CARD, NOT A STACK. The same treatment as My Day's `Z6`: separate
 * bordered boxes per section make a rail read as a dashboard of unrelated
 * widgets, which is exactly what a clinician re-checking an allergy does not
 * need. Hairline dividers, one container.
 *
 * Rendered in two places — the rail at ≥1280 and the Context tab below it — so
 * the content is defined once and cannot drift between the two.
 */
function ContextRegion({
  patient,
  timelineHref,
  inRail,
}: {
  patient: ClinicalPatient
  timelineHref: string
  inRail: boolean
}) {
  return (
    <aside
      aria-label="Patient context"
      className={inRail ? '' : 'mx-auto w-full max-w-2xl'}
    >
      <div className="overflow-hidden rounded-xl border border-border-soft bg-surface-1">
        <PatientContextRail patient={patient} />
        <ChartAiPanel patientName={patientFullName(patient)} timelineHref={timelineHref} />
      </div>
    </aside>
  )
}

/**
 * `Z4` breadcrumb.
 *
 * ⚠️ It is a `<nav>` with an accessible name, not a row of chevrons. The
 * breadcrumb's job on a clinical screen is to answer "how did I get into this
 * patient's record" — which matters when the answer is "from a search" and the
 * clinician needs to be sure they opened the right person.
 */
function ChartBreadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-2xs text-ink-subtle">
        <li>
          <Link
            to="/clinician"
            className="focus-ring rounded underline-offset-2 hover:text-ink hover:underline"
          >
            My Day
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            to="/clinician/patients"
            className="focus-ring rounded underline-offset-2 hover:text-ink hover:underline"
          >
            Patients
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="font-medium text-ink-muted" aria-current="page">
          {name}
        </li>
      </ol>
    </nav>
  )
}

/**
 * `Z4` status chips.
 *
 * ⚠️ The chips state what kind of record this is, not how the patient is. A
 * clinical status chip in `Z4` would compete with `Z3`'s allergy flag, which is
 * the one thing on this screen that must win the eye (§6485).
 */
function ChartStatusChips() {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-muted">
      <span>Read-only summary</span>
      <span aria-hidden="true">·</span>
      <span>Stored data, not a generated narrative</span>
    </div>
  )
}

/**
 * `STALE` — "Data as of HH:MM · Refresh" (§6468).
 *
 * ⚠️ IT GOES AMBER, AND THAT IS THE WHOLE POINT. A timestamp that always looks
 * the same is decoration; the atlas asks for the moment it stops being
 * trustworthy to be visible. A chart open on a ward computer for two hours
 * while another clinician prescribes is the case this exists for.
 *
 * The threshold is deliberately generous. A chart is a reference document, not
 * a monitor — going amber after five minutes would cry wolf and teach people to
 * ignore the colour.
 */
const STALE_AFTER_MS = 10 * 60 * 1000

function StaleStamp({ onRefresh }: { onRefresh: () => void }) {
  const [loadedAt, setLoadedAt] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // One minute is fine: the threshold is ten, so a minute of lag on the
    // colour change costs nothing and this costs almost nothing to run.
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const stale = now.getTime() - loadedAt.getTime() > STALE_AFTER_MS

  async function refresh() {
    setBusy(true)
    try {
      onRefresh()
      setLoadedAt(new Date())
      setNow(new Date())
    } finally {
      setBusy(false)
    }
  }

  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs ${
        stale ? 'text-warning-fg' : 'text-ink-subtle'
      }`}
    >
      <span>
        Data as of {formatTime(loadedAt)}
        {stale && ' — this may have changed'}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="focus-ring rounded font-medium underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? 'Refreshing…' : 'Refresh'}
      </button>
    </p>
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

  /**
   * ⚠️ NO ALLERGY CARD HERE, DELIBERATELY. The allergy is already rendered
   * twice on this screen by design: `Z3` carries it as text on every
   * patient-scoped screen (§6485 — "unmissable in `Z3` as text, not an icon
   * alone"), and `Z6` carries it as the first thing in the context rail. A
   * third copy in `Z5` made the same sentence appear three times above the
   * fold, which does not make it more unmissable — it makes the screen look
   * like it is shouting and pushes the actual record below the fold.
   *
   * Nothing is lost at any width: `Z3` is always visible, and below 1280 the
   * rail is one tap away on the Context tab.
   */
  return (
    // ⚠️ `items-start`. Grid items stretch to the row height by default, which
    // made the short cards grow tall columns of nothing next to the long one —
    // the single biggest source of dead space on this screen.
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
      {/* ⚠️ ONE CARD FOR THE WHOLE BACKGROUND, not four. Two of these fields
          are empty for most patients, and a card whose entire content is "Not
          recorded." is a box drawn around nothing. As rows, an unrecorded
          field costs one muted line and the recorded ones read as a list a
          clinician can scan in one pass. */}
      <Card padding="md">
        <PanelHeading icon={Stethoscope} title="Clinical background" />
        <dl className="divide-y divide-border-soft">
          <FreeTextRow label="Known conditions" body={patient.existingDiseases} />
          <FreeTextRow label="Current medications" body={patient.currentMedications} />
          <FreeTextRow label="Past surgery" body={patient.previousSurgeries} />
          <FreeTextRow label="Family history" body={patient.familyHistory} />
        </dl>
        <p className="mt-3 text-2xs text-ink-subtle">
          As recorded by the patient. Coded problems are on the Problems tab and prescriptions
          issued here are on the Medications tab.
        </p>
      </Card>

      <PatientReportedNotes shriPatientId={patient.shriPatientId} />

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

/**
 * `C-45` — a skeleton matching the loaded geometry (§6460).
 *
 * ⚠️ A SPINNER IS NOT A SKELETON, and the difference is not cosmetic. A spinner
 * says "something is happening"; a skeleton says "a table of about this shape
 * is arriving here", so the layout does not jump when it does and the clinician
 * can already aim at where the first row will be. Every tab on this screen
 * loads a table, so one component covers all of them.
 *
 * `role="status"` with the label in an `sr-only` span: a screen-reader user
 * gets the words, a sighted user gets the shape, and neither gets both.
 */
function TableSkeleton({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

/**
 * A free-text record field as a row.
 *
 * ⚠️ "Not recorded." in words, never an em-dash and never blank. On a clinical
 * record the difference between "the patient has no family history" and "nobody
 * asked" is the whole of the information, and a dash reads as the former.
 */
function FreeTextRow({ label, body }: { label: string; body: string | null }) {
  const empty = body === null || body.trim() === ''
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-line text-sm ${empty ? 'text-ink-subtle' : 'text-ink'}`}>
        {empty ? 'Not recorded.' : body}
      </dd>
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
  if (problems === null) return <TableSkeleton label="Loading problems…" />

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
  if (rows === null) return <TableSkeleton rows={3} label="Loading prescriptions…" />

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

/* ── Billing ─────────────────────────────────────────────────────────────── */

/**
 * §6437 lists Billing as the seventh tab. Billing itself is M-19/M-21, outside
 * this module.
 *
 * ⚠️ AN ENABLED TAB STATING A BOUNDARY, NOT A DISABLED ONE. `Tabs` supports
 * `disabled` + `disabledReason`, and using it here would be worse: a greyed tab
 * advertises a feature and invites the question "when do I get it?", while the
 * clinician still cannot find out what it would have shown. The same reasoning
 * §4.8 applies to AI affordances applies to module boundaries — and the Results
 * tab beside it already sets this precedent.
 *
 * ⚠️ It says explicitly that nothing is being asserted about the patient's
 * account. An empty billing panel that looked like data would read as "nothing
 * owing", which is a financial statement this system is in no position to make.
 */
function BillingTab() {
  return (
    <div className="rounded-xl border border-dashed border-border-soft p-6">
      <div className="flex items-start gap-3">
        <ReceiptText size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted" />
        <div>
          <h2 className="text-sm font-semibold text-ink">Billing is a separate module</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Charges, payer cover and settlement (modules M-19 and M-21) are not part of this
            release. Nothing is shown here rather than an empty ledger — an empty ledger would
            say this patient owes nothing, which this system cannot tell you.
          </p>
          <p className="mt-1.5 text-xs text-ink-subtle">
            Check the billing system for this patient&rsquo;s account.
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
  if (notes === null) return <TableSkeleton label="Loading notes…" />

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
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-medium text-ink">
                {r.problemText ?? r.assessment?.slice(0, 80) ?? 'Consultation note'}
              </span>
              {/* ⚠️ A row that cannot be opened must SAY so. This one swallowed
                  the click and did nothing, which reads as a broken table
                  rather than as a note with no visit attached. The coherence
                  gate makes this unreachable in seeded data; it is here so the
                  failure is legible if that ever stops being true. */}
              {r.encounterVisitId === null && (
                <span className="text-2xs text-ink-subtle">· not linked to a visit</span>
              )}
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
  const [page, setPage] = useState<EncounterPage | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    setError(null)
    clinicalPatientService.listEncountersForPatient(patient.shriPatientId).then(setPage).catch(setError)
  }, [patient.shriPatientId])
  useEffect(load, [load])

  if (error !== null) {
    return <ErrorState title="Could not load encounters" description={error} onRetry={load} />
  }
  if (page === null) return <TableSkeleton rows={5} label="Loading encounters…" />

  const rows = page.results
  const truncated = page.total > rows.length

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-subtle">
        Scanned and uploaded documents (module M-16) are not in this release. What follows is the
        encounter record held in this system.
      </p>
      {/* ⚠️ Said out loud, never silent. A visit list that stops without
          saying so reads as a complete history. */}
      {truncated && (
        <p className="text-xs text-warning-fg">
          Showing the {rows.length} most recent of {page.total} visits.
        </p>
      )}
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
