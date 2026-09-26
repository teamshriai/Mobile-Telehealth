import apiClient from '../lib/apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// The patient's reports — imaging studies, lab reports and vital signs.
// Read-only, and like every /me/* call, no function takes a patient id.
// ─────────────────────────────────────────────────────────────────────────────

export type ImagingModality = 'CT' | 'MR' | 'XR'
export type ReportStatus = 'Preliminary' | 'Final' | 'Amended' | 'EnteredInError'
export type LabFlag = 'Low' | 'High' | 'CriticalLow' | 'CriticalHigh' | 'Abnormal'
export type VitalType =
  | 'BloodPressure' | 'HeartRate' | 'SpO2' | 'Temperature' | 'RespiratoryRate'
  | 'BloodGlucose' | 'Weight' | 'Height' | 'Bmi'
export type VitalSource = 'Facility' | 'HomeDevice' | 'PatientReported'

export interface ImagingStudySummary {
  id: string
  accessionNumber: string
  title: string
  modality: ImagingModality
  bodyPart: string
  performedAt: string
  performingFacility: string
  orderedBy: string | null
  report: { number: string; status: ReportStatus; reportedAt: string; reportedBy: { name: string; registration: string | null; role: string | null } }
  impression: string
  seriesCount: number
  imageCount: number
  isIllustrative: boolean
}

export interface ImagingSeriesInfo {
  id: string
  number: number
  description: string
  dicomModality: string
  instanceCount: number
  keyInstanceNumber: number | null
  rows: number
  columns: number
  sliceThicknessMm: number | null
  spacingMm: number | null
  defaultWindow: { center: number; width: number } | null
  totalBytes: number
  instances: Array<{ id: string; number: number; sliceLocation: number | null }>
}

export interface ImagingStudyDetail extends ImagingStudySummary {
  reportText: { clinicalIndication: string | null; technique: string | null; comparison: string | null; findings: string; impression: string }
  reportingFacility: string | null
  provenance: { isIllustrative: boolean; attribution: string | null; note: string | null }
  series: ImagingSeriesInfo[]
}

export interface LabResult {
  id: string
  analyteCode: string
  name: string
  value: string
  valueNumeric: number | null
  unit: string | null
  referenceRange: string | null
  referenceLow: number | null
  referenceHigh: number | null
  /** The laboratory's own flag, as issued. */
  flag: LabFlag | null
  method: string | null
}

export interface LabReport {
  id: string
  reportNumber: string
  panelName: string
  specimen: string
  fasting: boolean | null
  collectedAt: string
  reportedAt: string
  status: ReportStatus
  labName: string
  validatedBy: { name: string | null; registration: string | null; role: string | null } | null
  orderedBy: string | null
  comment: string | null
  isAtlasVocabulary: boolean
  results: LabResult[]
}

export interface VitalReading {
  id: string
  type: VitalType
  value: number
  value2: number | null
  unit: string
  qualifier: string | null
  source: VitalSource
  placeName: string | null
  recordedByRole: string | null
  deviceName: string | null
  isDerived: boolean
  measuredAt: string
  note: string | null
}

export interface VitalLatest {
  type: VitalType
  reading: VitalReading | null
  trend: Array<{ at: string; value: number; value2: number | null }>
}

export async function getImagingStudies(): Promise<ImagingStudySummary[]> {
  const { studies } = await apiClient.get<{ studies: ImagingStudySummary[] }>('/me/imaging')
  return studies
}

export async function getImagingStudy(id: string): Promise<ImagingStudyDetail> {
  const { study } = await apiClient.get<{ study: ImagingStudyDetail }>(`/me/imaging/${encodeURIComponent(id)}`)
  return study
}

export async function getLabReports(): Promise<LabReport[]> {
  const { reports } = await apiClient.get<{ reports: LabReport[] }>('/me/labs')
  return reports
}

export async function getVitals(): Promise<{ latest: VitalLatest[]; readings: VitalReading[] }> {
  return apiClient.get('/me/vitals')
}

export const VITAL_LABEL: Record<VitalType, string> = {
  BloodPressure: 'Blood pressure',
  HeartRate: 'Pulse',
  SpO2: 'Oxygen saturation',
  Temperature: 'Temperature',
  RespiratoryRate: 'Breathing rate',
  BloodGlucose: 'Blood glucose',
  Weight: 'Weight',
  Height: 'Height',
  Bmi: 'Body mass index',
}

export const MODALITY_LABEL: Record<ImagingModality, string> = { CT: 'CT', MR: 'MRI', XR: 'X-ray' }

/** "176/92" for blood pressure, "36.8" for temperature, "88" otherwise. */
export function vitalValue(r: { type: VitalType; value: number; value2: number | null }): string {
  if (r.type === 'BloodPressure' && r.value2 !== null) return `${Math.round(r.value)}/${Math.round(r.value2)}`
  if (r.type === 'Temperature' || r.type === 'Weight' || r.type === 'Bmi') return r.value.toFixed(1)
  return String(Math.round(r.value))
}
