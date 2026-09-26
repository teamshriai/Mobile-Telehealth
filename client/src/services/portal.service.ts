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
  /** When a newer prescription for the same medicine replaced this one. */
  replacedAt: string | null
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

// ── Medicines section ─────────────────────────────────────────────────────────
// ⚠️ Two kinds of fact. What was PRESCRIBED (signed, read-only here) and what
// the patient says they TOOK (their own dose log). The types keep them apart.

export type DoseState = 'taken' | 'skipped' | 'due' | 'upcoming' | 'missed'
export type PartOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night'
export type RefillStatus = 'Requested' | 'Forwarded' | 'Fulfilled' | 'Declined' | 'Cancelled'

export interface Adherence {
  taken: number
  skipped: number
  missed: number
  due: number
  /** taken ÷ due, 0–100; null when nothing was due yet. */
  percent: number | null
}

export interface Refill {
  id: string
  status: RefillStatus
  requestedAt: string
  forwardedToName: string | null
  declineReason: string | null
  resolvedAt: string | null
}

export interface Medicine extends Medication {
  drugClass: string | null
  indication: { code: string; title: string } | null
  prescriber: { name: string | null; specialty: string | null; hospital: string | null }
  schedule: 'scheduled' | 'weekly' | 'as_needed' | 'unknown'
  /** Days of supply left on a current course (0 on its last day). */
  supplyDaysLeft: number | null
  adherence30: Adherence | null
  refill: Refill | null
}

export interface TodayDose {
  key: string
  itemId: string
  name: string
  dose: string
  doseUnit: string
  form: string
  at: string
  partOfDay: PartOfDay
  state: DoseState
  logId: string | null
  canLog: boolean
  instructions: string | null
}

export interface MedicinesSummary {
  currentCount: number
  pastCount: number
  doctors: string[]
  /** `remaining`: still ahead or due now. `notMarked`: its time has passed and
   *  it was not tapped — it can still be marked for two days. */
  today: { taken: number; skipped: number; total: number; remaining: number; notMarked: number }
  nextDose: { name: string; at: string } | null
  /** The 30 days BEFORE today; today is counted on the Today card instead. */
  adherence30: Adherence
  refillsDueSoon: number
  asNeededCount: number
  /** As the PATIENT reported them — not a clinician-verified allergy list. */
  allergies: string | null
}

export interface MedicinesOverview {
  summary: MedicinesSummary
  current: Medicine[]
  past: Medicine[]
  today: TodayDose[]
  selfReported: string | null
  generatedAt: string
}

export type MedicineSummaryResult =
  | { state: 'ok'; text: string; generatedAt: string; cached: boolean }
  | { state: 'none' }
  | { state: 'empty' | 'off' | 'policy' | 'busy' | 'blocked'; message: string }

export async function getMedicinesOverview(): Promise<MedicinesOverview> {
  return apiClient.get('/me/medications')
}

export async function logDose(itemId: string, scheduledFor: string, status: 'Taken' | 'Skipped'): Promise<void> {
  await apiClient.post('/me/medications/doses', { itemId, scheduledFor, status })
}

export async function undoDose(logId: string): Promise<void> {
  await apiClient.delete(`/me/medications/doses/${encodeURIComponent(logId)}`)
}

export async function requestRefill(itemId: string, note?: string): Promise<Refill> {
  const body = note !== undefined && note.trim() !== '' ? { note: note.trim() } : {}
  const { refill } = await apiClient.post<{ refill: Refill }>(`/me/medications/${encodeURIComponent(itemId)}/refill`, body)
  return refill
}

export async function cancelRefill(refillId: string): Promise<void> {
  await apiClient.delete(`/me/medications/refills/${encodeURIComponent(refillId)}`)
}

/** The cached AI summary, if it still matches the prescriptions. Never calls the model. */
export async function getMedicineSummary(): Promise<MedicineSummaryResult> {
  return apiClient.get('/me/medications/summary')
}

/** Writes (or returns the cached) AI summary. Spends the patient's AI allowance only on a miss. */
export async function generateMedicineSummary(): Promise<MedicineSummaryResult> {
  return apiClient.post('/me/medications/summary')
}

/** "8:00 am", India time — every dose time on the page is IST. */
export function formatDoseTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    .format(new Date(iso))
    .replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toLowerCase()}`)
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
