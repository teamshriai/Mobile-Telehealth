import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { usePatientContext } from '../../app/usePatientContext'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import BreakGlassGate from '../../components/clinical/BreakGlassGate'
import { encounterTypeLabel } from '../../components/clinical/encounterLabels'
import { encounterStatusLabel } from '../../components/clinical/clinicalLabels'
import { ErrorState, LoadingState, Skeleton } from '../../components/feedback/States'
import { formatDate, formatTime } from '../../components/clinic/format'
import type { EncounterWorkspace } from '../../services/clinicalPatient.service'
import type { ClinicalPatient } from '../../types/domain'
import type { EncounterOutletContext } from './useEncounterRoute'
import type { ApiError } from '../../types/api'

/**
 * Layout route for `/encounter/:visitId/*` — the consultation workspace.
 *
 * Loads in two steps for a reason: the workspace call resolves *whose*
 * encounter this is and enforces access, and only then is the full clinical
 * record fetched. That ordering is what lets the break-glass offer appear
 * before a single clinical field has been requested, let alone painted.
 *
 * The sub-navigation below is the `W-06-1` spine made visible — note →
 * problems → prescription → instructions, in the order the consultation
 * actually happens.
 */

type State =
  | { status: 'loading' }
  | { status: 'ready'; encounter: EncounterWorkspace['encounter']; patient: ClinicalPatient }
  | { status: 'breakglass'; shriPatientId: string }
  | { status: 'denied' }
  | { status: 'error'; error: ApiError }

const STEPS = [
  { to: 'note', label: 'Note' },
  { to: 'problems', label: 'Problems & coding' },
  { to: 'rx', label: 'Prescription' },
  { to: 'instructions', label: 'Instructions' },
]

export default function EncounterShell() {
  const { visitId } = useParams<{ visitId: string }>()
  const { setPatient } = usePatientContext()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (visitId === undefined) return undefined
    let cancelled = false
    setState({ status: 'loading' })

    clinicalPatientService
      .getEncounterWorkspace(visitId)
      .then(async (ws) => {
        const patient = await clinicalPatientService.getClinicalPatient(ws.patient.shriPatientId)
        if (cancelled) return
        setState({ status: 'ready', encounter: ws.encounter, patient })
        setPatient(patient)
      })
      .catch((err: ApiError) => {
        if (cancelled) return
        // Same three-way split as useClinicalPatient. Kept explicit rather
        // than shared because the break-glass branch needs a shriPatientId
        // the workspace call is exactly what failed to return.
        if (err.status === 403 && err.breakGlass === true && typeof err.shriPatientId === 'string') {
          setState({ status: 'breakglass', shriPatientId: err.shriPatientId })
        } else if (err.status === 404) {
          setState({ status: 'denied' })
        } else {
          setState({ status: 'error', error: err })
        }
        setPatient(null)
      })

    return () => { cancelled = true }
  }, [visitId, nonce, setPatient])

  useEffect(() => () => setPatient(null), [setPatient])

  if (state.status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
        <LoadingState label="Opening the consultation…" />
      </div>
    )
  }

  if (state.status === 'breakglass') {
    return <BreakGlassGate shriPatientId={state.shriPatientId} onGranted={reload} />
  }

  if (state.status === 'denied') {
    return (
      <ErrorState
        title="This consultation is not available to you"
        description="You do not have access to this encounter, or it does not exist. If you believe you should have access, ask the patient's consultant to add you to the care team."
      />
    )
  }

  if (state.status === 'error') {
    return <ErrorState title="Could not open this consultation" description={state.error} onRetry={reload} />
  }

  const { encounter, patient } = state

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Consultation
        </h1>
        <p className="text-2xs text-ink-muted">
          <span className="font-mono">{encounter.visitId}</span> ·{' '}
          {encounterTypeLabel(encounter.type)} ·{' '}
          {formatDate(encounter.startedAt)} {formatTime(encounter.startedAt)} ·{' '}
          <span className={encounter.status === 'InProgress' ? 'font-semibold text-ink' : ''}>
            {encounterStatusLabel(encounter.status)}
          </span>
        </p>
      </div>

      {/* The W-06-1 spine. A horizontal scroller below md rather than a
          wrapping grid — a wrapped step list stops reading as a sequence. */}
      <nav aria-label="Consultation steps" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex min-w-max gap-1">
          {STEPS.map((s, i) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                className={({ isActive }) =>
                  `focus-ring clinical-row inline-flex items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-on-primary'
                      : 'bg-surface-2 text-ink-muted hover:text-ink'
                  }`
                }
              >
                <span aria-hidden="true" className="tabular-nums opacity-60">{i + 1}</span>
                {s.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet context={{ encounter, patient, reload } satisfies EncounterOutletContext} />
    </div>
  )
}
