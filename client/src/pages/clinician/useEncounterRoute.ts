import { useOutletContext } from 'react-router-dom'
import type { EncounterWorkspace } from '../../services/clinicalPatient.service'
import type { ClinicalPatient } from '../../types/domain'

/** Split from EncounterShell.tsx for the same reason as usePatientRoute. */
export interface EncounterOutletContext {
  encounter: EncounterWorkspace['encounter']
  patient: ClinicalPatient
  reload: () => void
}

export function useEncounter(): EncounterOutletContext {
  return useOutletContext<EncounterOutletContext>()
}
