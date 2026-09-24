import { useCallback } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useClinicalPatient } from '../../components/clinical/useClinicalPatient'
import BreakGlassGate from '../../components/clinical/BreakGlassGate'
import DeniedPanel from '../../components/clinical/DeniedPanel'
import { ErrorState, LoadingState, Skeleton } from '../../components/feedback/States'
import type { PatientOutletContext } from './usePatientRoute'

/**
 * Layout route for every `/patient/:shriPatientId/*` screen.
 *
 * It exists so the four load outcomes — ready, break-glass, denied, error —
 * are resolved in exactly ONE place. A screen that rendered its own
 * `useClinicalPatient` would eventually forget the break-glass branch and
 * strand a clinician who had a legitimate route through; worse, a screen that
 * forgot the DENIED branch could paint a heading with a patient's name in it
 * before the refusal landed.
 *
 * It also means switching Chart ↔ Timeline does not re-fetch the patient.
 */

export default function PatientShell() {
  const { shriPatientId } = useParams<{ shriPatientId: string }>()
  const { state, reload } = useClinicalPatient(shriPatientId)

  const onGranted = useCallback(() => reload(), [reload])

  if (state.status === 'loading') {
    return (
      <div className="space-y-4">
        {/* Skeleton matches the loaded geometry — §1.5 forbids a bare spinner
            on a blank screen, because the jump when content lands is where a
            clinician loses their place. */}
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <LoadingState label="Loading patient record…" />
      </div>
    )
  }

  if (state.status === 'breakglass') {
    // ⚠️ Renders INSTEAD of the screen, never over it. Nothing clinical is
    // fetched or painted until a reason has been recorded (DD-014).
    return <BreakGlassGate shriPatientId={shriPatientId ?? ''} onGranted={onGranted} />
  }

  if (state.status === 'denied') {
    // C-36, not an ErrorState: the atlas wants what is missing, who grants it
    // and a request action. The uniform refusal deliberately says nothing about
    // whether this patient exists — see §3.2 on the enumeration oracle.
    return <DeniedPanel />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title="Could not load this patient"
        description={state.error}
        onRetry={reload}
      />
    )
  }

  return <Outlet context={{ patient: state.patient, reload } satisfies PatientOutletContext} />
}
