import { useOutletContext } from 'react-router-dom'
import type { ClinicalPatient } from '../../types/domain'

/** Split from PatientShell.tsx so that file exports only a component —
 *  react-refresh cannot hot-reload a module that mixes the two. */
export interface PatientOutletContext {
  patient: ClinicalPatient
  reload: () => void
}

export function usePatient(): PatientOutletContext {
  return useOutletContext<PatientOutletContext>()
}
