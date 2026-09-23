import { useCallback, useEffect, useState } from 'react'
import { usePatientContext } from '../../app/usePatientContext'
import * as clinicalPatientService from '../../services/clinicalPatient.service'
import type { ClinicalPatient } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * Load a patient, publish them to the `Z3` banner, and handle the one
 * refusal that is not final.
 *
 * ⚠️ THE BREAK-GLASS INTERCEPT. A clinical read can fail three ways and they
 * are NOT the same:
 *   - 403 + breakGlass → offer emergency access (DD-014). Recoverable.
 *   - 404             → uniform refusal. No patient, or no relationship and
 *                       no capability. Indistinguishable ON PURPOSE (§3.2),
 *                       so the UI must not guess which.
 *   - anything else   → an ordinary error with a retry.
 *
 * Centralised here so every patient-scoped screen behaves identically —
 * a screen that forgot the break-glass branch would just show "not found"
 * and strand a clinician who had a legitimate route through.
 */

export type PatientLoadState =
  | { status: 'loading' }
  | { status: 'ready'; patient: ClinicalPatient }
  | { status: 'breakglass' }
  | { status: 'denied' }
  | { status: 'error'; error: ApiError }

interface UseClinicalPatientResult {
  state: PatientLoadState
  reload: () => void
}

export function useClinicalPatient(shriPatientId: string | undefined): UseClinicalPatientResult {
  const { setPatient, setLoading } = usePatientContext()
  const [state, setState] = useState<PatientLoadState>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (shriPatientId === undefined) return undefined

    let cancelled = false
    setState({ status: 'loading' })
    setLoading(true)

    clinicalPatientService
      .getClinicalPatient(shriPatientId)
      .then((patient) => {
        if (cancelled) return
        setState({ status: 'ready', patient })
        setPatient(patient)
      })
      .catch((err: ApiError) => {
        if (cancelled) return
        // The flag is set by the server only on the sanctioned exception —
        // see careRelationship.service.offerBreakGlassOrDeny.
        if (err.status === 403 && err.breakGlass === true) {
          setState({ status: 'breakglass' })
        } else if (err.status === 404) {
          setState({ status: 'denied' })
        } else {
          setState({ status: 'error', error: err })
        }
        // ⚠️ Nothing about the patient reaches the banner on any failure
        // path. DENIED shows no patient data at all (§1.5).
        setPatient(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shriPatientId, nonce, setPatient, setLoading])

  // Clear the banner on unmount so a patient never bleeds across a
  // navigation into a screen about somebody else.
  useEffect(() => () => setPatient(null), [setPatient])

  return { state, reload }
}
