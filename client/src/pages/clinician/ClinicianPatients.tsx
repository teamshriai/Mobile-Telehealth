import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search as SearchIcon } from 'lucide-react'
import { usePatientContext } from '../../app/usePatientContext'
import * as doctorSelf from '../../services/doctorSelf.service'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import DataTable, { type Column } from '../../components/common/DataTable'
import Tabs from '../../components/common/Tabs'
import { EmptyState, LoadingState, ErrorState, Banner } from '../../components/feedback/States'
import { formatDate } from '../../components/clinic/format'
import type { DoctorPatientSummary, PatientSearchResult } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * Patients — the clinician's own panel, plus population search.
 *
 * Two tabs because they answer different questions and have different
 * authorization: "who am I looking after" reads the care-team table and is
 * own-scope; "find a patient" searches the whole population and is gated by
 * `patient:search:any`.
 *
 * ⚠️ Search results are NOT filtered by care relationship — the server
 * deliberately lets any clinician FIND a patient, and enforces the
 * relationship on READ. That is why opening a search result may land on the
 * break-glass gate rather than the chart, and why this screen says so.
 */

type TabId = 'panel' | 'search'

export default function ClinicianPatients() {
  const [tab, setTab] = useState<TabId>('panel')
  const { setPatient } = usePatientContext()

  useEffect(() => { setPatient(null) }, [setPatient])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Patients</h1>
        <p className="mt-0.5 text-xs text-ink-muted">
          Your active panel, and search across the hospital.
        </p>
      </div>

      <Tabs
        label="Patient views"
        activeId={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'panel', label: 'My panel' },
          { id: 'search', label: 'Find a patient' },
        ]}
      >
        {tab === 'panel' ? <PanelTab /> : <SearchTab />}
      </Tabs>
    </div>
  )
}

function PanelTab() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<DoctorPatientSummary[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    setError(null)
    doctorSelf.listOwnPatients().then(setPatients).catch(setError)
  }, [])
  useEffect(load, [load])

  const columns = useMemo<Array<Column<DoctorPatientSummary>>>(
    () => [
      {
        key: 'name',
        header: 'Patient',
        card: 'title',
        sortValue: (r) => r.name,
        render: (r) => <span className="font-medium text-ink">{r.name}</span>,
      },
      {
        key: 'role',
        header: 'Your role',
        card: 'subtitle',
        sortValue: (r) => r.careRole,
        render: (r) => (
          <span className="text-ink-muted">
            {r.careRole}
            {r.isPrimary && (
              <span className="ml-1.5 rounded bg-success-bg px-1.5 py-0.5 text-2xs font-semibold text-success-fg">
                Primary
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'since',
        header: 'On your team since',
        card: 'meta',
        hideBelow: 'lg',
        sortValue: (r) => r.since,
        render: (r) => <span className="tabular-nums text-ink-muted">{formatDate(r.since)}</span>,
      },
      {
        key: 'lastSeen',
        header: 'Last seen',
        card: 'meta',
        sortValue: (r) => r.lastAppointment?.scheduledAt ?? '',
        render: (r) =>
          r.lastAppointment === null ? (
            <span className="text-ink-subtle">No visits yet</span>
          ) : (
            <span className="tabular-nums text-ink-muted">
              {formatDate(r.lastAppointment.scheduledAt)}
            </span>
          ),
      },
    ],
    [],
  )

  if (error !== null) {
    return <ErrorState title="Could not load your patients" description={error} onRetry={load} />
  }
  if (patients === null) return <LoadingState label="Loading your panel…" />

  return (
    <DataTable
      caption="Patients on your active care team"
      rows={patients}
      columns={columns}
      rowKey={(r) => r.patientId}
      // ⚠️ The UHID, not `patientId`. The chart route is keyed on the UHID;
      // passing the internal UUID here silently produced a "record not
      // available" refusal, because the lookup found nothing and the uniform
      // 404 is indistinguishable from a real denial by design.
      onRowActivate={(r) => navigate(`/patient/${r.shriPatientId}/chart`)}
      emptyState={
        <EmptyState
          icon={Users}
          title="No patients on your panel yet"
          description="Patients appear here once your hospital administrator assigns them to your care team. You can still find any patient using search."
        />
      }
    />
  )
}

function SearchTab() {
  const navigate = useNavigate()
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [results, setResults] = useState<PatientSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const debounce = useRef<number | undefined>(undefined)

  // ⚠️ The server requires a surname PLUS a forename or a date of birth, as
  // an anti-enumeration control. Enforced here too so the UI explains the
  // rule rather than surfacing a validation error the clinician cannot parse.
  const canSearch = lastName.trim().length >= 2 && firstName.trim().length >= 1

  useEffect(() => {
    if (!canSearch) {
      setResults(null)
      return undefined
    }
    window.clearTimeout(debounce.current)
    // Debounced, but the INPUTS are never disabled while a query is in
    // flight — ARC-17: "typing is never blocked by an in-flight query".
    debounce.current = window.setTimeout(() => {
      setSearching(true)
      setError('')
      clinicalPatientService
        .searchPatients({ by: 'name', lastName: lastName.trim(), firstName: firstName.trim() })
        .then((r) => setResults(r.results))
        .catch((err: ApiError) => setError(err.message || 'Search failed.'))
        .finally(() => setSearching(false))
    }, 300)
    return () => window.clearTimeout(debounce.current)
  }, [lastName, firstName, canSearch])

  const columns = useMemo<Array<Column<PatientSearchResult>>>(
    () => [
      {
        key: 'name',
        header: 'Patient',
        card: 'title',
        render: (r) => (
          <span className="font-medium text-ink">
            {r.firstName} {r.lastName}
          </span>
        ),
      },
      {
        key: 'uhid',
        header: 'UHID',
        card: 'subtitle',
        render: (r) => <span className="font-mono text-2xs text-ink-muted">{r.shriPatientId}</span>,
      },
      {
        key: 'dob',
        header: 'Date of birth',
        card: 'meta',
        hideBelow: 'lg',
        render: (r) => (
          <span className="tabular-nums text-ink-muted">
            {r.dateOfBirth === null ? '—' : formatDate(r.dateOfBirth)}
          </span>
        ),
      },
      {
        key: 'lastEncounter',
        header: 'Last encounter',
        card: 'meta',
        render: (r) => (
          <span className="tabular-nums text-ink-muted">
            {r.lastEncounterAt === null ? 'None' : formatDate(r.lastEncounterAt)}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="search-last" className="mb-1.5 block text-sm font-medium text-ink-muted">
            Surname
          </label>
          <input
            id="search-last"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Lakshmanan"
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="search-first" className="mb-1.5 block text-sm font-medium text-ink-muted">
            First name
          </label>
          <input
            id="search-first"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. R."
            className="focus-ring w-full rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>

      <p className="text-xs text-ink-subtle">
        Both a surname and a first name are required — searching on a surname alone would let
        anyone page through the whole patient list.
      </p>

      {error !== '' && <Banner tone="error">{error}</Banner>}

      {!canSearch ? (
        <EmptyState
          icon={SearchIcon}
          title="Search for a patient"
          description="Enter a surname and a first name to search across the hospital."
        />
      ) : searching && results === null ? (
        <LoadingState label="Searching…" />
      ) : (
        <>
          <DataTable
            caption="Patient search results"
            rows={results ?? []}
            columns={columns}
            rowKey={(r) => r.shriPatientId}
            onRowActivate={(r) => navigate(`/patient/${r.shriPatientId}/chart`)}
            emptyState={
              <EmptyState
                icon={SearchIcon}
                title="No patients match"
                description="Check the spelling, or try the patient's UHID."
              />
            }
          />
          {(results?.length ?? 0) > 0 && (
            <p className="text-xs text-ink-subtle">
              Finding a patient is not the same as being allowed to read their record. If you
              have no care relationship, opening one will offer you emergency access — which is
              logged and reviewed.
            </p>
          )}
        </>
      )}
    </div>
  )
}
