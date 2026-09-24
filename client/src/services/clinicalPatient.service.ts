import apiClient from '../lib/apiClient'
import type {
  ClinicalPatient,
  PatientSearchResult,
  ClinicianEncounter,
  EncounterType,
} from '../types/domain'

/**
 * clinicalPatient.service.ts
 *
 * The clinician's view of a patient — distinct from `profile.service.ts`,
 * which is the patient's own self-service API and is patient-role-only.
 */

export type SearchMode = 'name' | 'mobile' | 'abha' | 'shriId'

export interface PatientSearchParams {
  by: SearchMode
  lastName?: string
  firstName?: string
  dateOfBirth?: string
  mobile?: string
  abha?: string
  shriId?: string
}

export interface PatientSearchResponse {
  results: PatientSearchResult[]
  total: number
  page: number
  pageSize: number
}

/**
 * ⚠️ Search by name requires a surname PLUS a forename or date of birth —
 * the server enforces it as an anti-enumeration control, so the UI must
 * collect both rather than firing a one-letter query.
 */
export async function searchPatients(
  params: PatientSearchParams,
): Promise<PatientSearchResponse> {
  return apiClient.get('/patients/search', { params })
}

/** Full clinical view — demographics plus health history, including allergies. */
export async function getClinicalPatient(shriPatientId: string): Promise<ClinicalPatient> {
  const { patient } = await apiClient.get<{ patient: ClinicalPatient }>(
    `/patients/${shriPatientId}/clinical`,
  )
  return patient
}

/** Every encounter this clinician has open, across all their patients. */
export async function listOpenEncounters(): Promise<ClinicianEncounter[]> {
  const { encounters } = await apiClient.get<{ encounters: ClinicianEncounter[] }>(
    '/doctor/encounters',
  )
  return encounters
}

export interface CreateEncounterPayload {
  type: EncounterType
  locationName?: string | null
  chiefComplaint?: string | null
  appointmentId?: string | null
}

/** Opens a visit. This is what "Start consultation" does from the worklist. */
export async function createEncounter(
  shriPatientId: string,
  payload: CreateEncounterPayload,
): Promise<{ visitId: string }> {
  const { encounter } = await apiClient.post<{ encounter: { visitId: string } }>(
    `/patients/${shriPatientId}/encounters`,
    payload,
  )
  return encounter
}

export interface EncounterListItem {
  visitId: string
  type: string
  status: string
  startedAt: string
  endedAt: string | null
  locationName: string | null
  chiefComplaint: string | null
  createdAt: string
}

export interface EncounterPage {
  results: EncounterListItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * ⚠️ RETURNS THE PAGE, NOT JUST THE ROWS. This previously discarded `total`,
 * `page` and `pageSize` and handed back `results` alone — so a patient with
 * more encounters than one page showed a silently truncated visit history with
 * nothing on screen to say so. On a clinical record, a list that quietly stops
 * is worse than one that refuses to load: the clinician has no cue to go
 * looking for the rest.
 *
 * The server caps `pageSize` at 50 (`encounter.validator.ts`), so callers ask
 * for the cap and state the truncation when `total` exceeds what they hold.
 */
export async function listEncountersForPatient(
  shriPatientId: string,
  pageSize = 50,
): Promise<EncounterPage> {
  return apiClient.get<EncounterPage>(
    `/patients/${shriPatientId}/encounters?pageSize=${pageSize}`,
  )
}

export interface EncounterWorkspace {
  encounter: {
    id: string
    visitId: string
    type: string
    status: string
    startedAt: string
    endedAt: string | null
    locationName: string | null
    chiefComplaint: string | null
    createdAt: string
  }
  patient: {
    id: string
    shriPatientId: string
  }
}

/**
 * Resolves a visit id to the encounter AND whose it is, in one call.
 *
 * ⚠️ Two calls would leave a window where the workspace has an encounter
 * on screen and does not yet know the patient. On screens whose job is to
 * stop a wrong-patient error, that window must not exist.
 */
export async function getEncounterWorkspace(visitId: string): Promise<EncounterWorkspace> {
  return apiClient.get(`/encounters/${visitId}/workspace`)
}
