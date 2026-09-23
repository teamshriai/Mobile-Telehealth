import { useContext } from 'react'
import { PatientContext, type PatientContextValue } from './patientContextObject'

export function usePatientContext(): PatientContextValue {
  const ctx = useContext(PatientContext)
  if (ctx === null) {
    throw new Error('usePatientContext must be used within <PatientContextProvider>.')
  }
  return ctx
}
