import { createContext } from 'react'
import type { ClinicalPatient } from '../types/domain'

/**
 * The patient currently in context, published by a `/patient/:id/*` or
 * `/encounter/:id/*` screen and rendered by the shell as the `Z3` banner.
 *
 * A context rather than a prop because `Z3` lives in the shell, above the
 * router outlet — there is no prop path from a page to it.
 */
export interface PatientContextValue {
  patient: ClinicalPatient | null
  /** Set by the active screen on mount; cleared on unmount. */
  setPatient: (patient: ClinicalPatient | null) => void
  /** True while the banner's own fetch is in flight. */
  loading: boolean
  setLoading: (loading: boolean) => void
}

export const PatientContext = createContext<PatientContextValue | null>(null)
