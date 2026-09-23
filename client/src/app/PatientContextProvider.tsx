import { useMemo, useState, type ReactNode } from 'react'
import { PatientContext } from './patientContextObject'
import type { ClinicalPatient } from '../types/domain'

export function PatientContextProvider({ children }: { children?: ReactNode }) {
  const [patient, setPatient] = useState<ClinicalPatient | null>(null)
  const [loading, setLoading] = useState(false)

  const value = useMemo(
    () => ({ patient, setPatient, loading, setLoading }),
    [patient, loading],
  )

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
}
