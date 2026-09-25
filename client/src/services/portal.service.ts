import apiClient from '../lib/apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// The patient's own clinical record — GET /me/*. Read-only.
//
// ⚠️ No function here takes a patient id. The server resolves "which patient"
// from the session, so there is nothing for this client to get wrong.
// ─────────────────────────────────────────────────────────────────────────────

export interface Medication {
  id: string
  rxNumber: string
  visitId: string | null
  name: string
  form: string
  strength: string
  dose: string
  doseUnit: string
  route: string
  routeInWords: string
  frequency: string
  frequencyInWords: string
  durationDays: number | null
  instructions: string | null
  prescribedBy: string | null
  prescriberRegistration: string | null
  startedAt: string
  /** Last day the prescription covers; null when no duration was set. */
  endsAt: string | null
  status: 'current' | 'completed'
}

export interface Condition {
  id: string
  code: string
  title: string
  status: 'Active' | 'Resolved'
  onsetDate: string | null
  resolvedAt: string | null
  recordedAt: string
}

export interface IssuedInstruction {
  id: string
  visitId: string | null
  title: string
  body: string
  language: string
  titleEnglish: string | null
  bodyEnglish: string | null
  issuedAt: string
  issuedByName: string
}

export interface VisitSummaryListItem {
  visitId: string
  type: string
  startedAt: string
  endedAt: string | null
  location: string | null
  clinician: string | null
  signedAt: string | null
  counts: { diagnoses: number; prescriptions: number; instructions: number }
}

export interface VisitSummary {
  visitId: string
  type: string
  startedAt: string
  endedAt: string | null
  location: string | null
  reasonForVisit: string | null
  seenBy: Array<{ name: string | null; registrationNumber: string | null; signedAt: string | null }>
  diagnoses: Condition[]
  medications: Medication[]
  instructions: IssuedInstruction[]
}

export async function getMedications(): Promise<{ current: Medication[]; past: Medication[] }> {
  return apiClient.get('/me/medications')
}

export async function getConditions(): Promise<Condition[]> {
  return (await apiClient.get<{ conditions: Condition[] }>('/me/conditions')).conditions
}

export async function getInstructions(): Promise<IssuedInstruction[]> {
  return (await apiClient.get<{ instructions: IssuedInstruction[] }>('/me/instructions')).instructions
}

export async function getVisits(): Promise<VisitSummaryListItem[]> {
  return (await apiClient.get<{ visits: VisitSummaryListItem[] }>('/me/visits')).visits
}

export async function getVisit(visitId: string): Promise<VisitSummary> {
  return apiClient.get(`/me/visits/${encodeURIComponent(visitId)}`)
}

/** Human names for the encounter types a patient sees. */
export const VISIT_TYPE_LABEL: Record<string, string> = {
  ClinicVisit: 'Clinic visit',
  FollowUp: 'Follow-up',
  Emergency: 'Emergency visit',
  Telehealth: 'Video consultation',
  AmbulanceIntake: 'Ambulance arrival',
  Screening: 'Screening',
  FieldRegistration: 'Registration'
}

export const LANGUAGE_LABEL: Record<string, string> = {
  en: 'English',
  kn: 'Kannada',
  hi: 'Hindi',
  ta: 'Tamil',
  ml: 'Malayalam',
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}
