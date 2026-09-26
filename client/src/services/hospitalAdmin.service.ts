/**
 * hospitalAdmin.service.ts
 *
 * The Hospital Admin's own profile/hospital setup, plus the hospital-scoped
 * management endpoints (doctors, patients, appointments, analytics,
 * feedback). Every read here is already scoped server-side to the acting
 * admin's own hospital — nothing here accepts a hospitalId from the caller.
 */

import apiClient from '../lib/apiClient'
import type {
  StaffProfile,
  Hospital,
  HospitalAdminDoctorRow,
  HospitalAdminPatientRow,
  HospitalAdminAppointmentRow,
  HospitalAdminAnalytics,
  Feedback,
} from '../types/domain'

export async function getOwnProfile(): Promise<StaffProfile> {
  const { profile } = await apiClient.get<{ profile: StaffProfile }>('/hospital-admin/profile')
  return profile
}

export async function updateOwnProfile(payload: Partial<StaffProfile>): Promise<StaffProfile> {
  const { profile } = await apiClient.patch<{ profile: StaffProfile }>(
    '/hospital-admin/profile',
    payload,
  )
  return profile
}

export interface CreateHospitalPayload {
  name: string
  city?: string
  state?: string
}

export async function createHospital(payload: CreateHospitalPayload): Promise<StaffProfile> {
  const { profile } = await apiClient.post<{ profile: StaffProfile }>(
    '/hospital-admin/hospital/create',
    payload,
  )
  return profile
}

export async function joinHospital(hospitalId: string): Promise<StaffProfile> {
  const { profile } = await apiClient.post<{ profile: StaffProfile }>(
    '/hospital-admin/hospital/join',
    { hospitalId },
  )
  return profile
}

export async function completeOnboarding(): Promise<StaffProfile> {
  const { profile } = await apiClient.post<{ profile: StaffProfile }>(
    '/hospital-admin/onboarding-complete',
  )
  return profile
}

export async function getOwnHospital(): Promise<Hospital> {
  const { hospital } = await apiClient.get<{ hospital: Hospital }>('/hospital-admin/hospital')
  return hospital
}

export async function updateOwnHospital(payload: Partial<Hospital>): Promise<Hospital> {
  const { hospital } = await apiClient.patch<{ hospital: Hospital }>(
    '/hospital-admin/hospital',
    payload,
  )
  return hospital
}

export async function listDoctors(): Promise<HospitalAdminDoctorRow[]> {
  const { doctors } = await apiClient.get<{ doctors: HospitalAdminDoctorRow[] }>(
    '/hospital-admin/doctors',
  )
  return doctors
}

/**
 * ⚠️ A CLOSED SET — and `HospitalAdmin` and `Admin` are absent deliberately.
 * A hospital administrator must not be able to create a peer or a superior;
 * that would turn one compromised admin account into every admin account.
 * The server enforces the same enum, so this is a convenience, not the control.
 */
export const PROVISIONABLE_ROLES = [
  { value: 'Doctor', label: 'Doctor' },
  { value: 'Resident', label: 'Resident' },
  { value: 'HealthcareWorker', label: 'Nurse / healthcare worker' },
  { value: 'LabTechnician', label: 'Lab technician' },
] as const

export type ProvisionableRole = (typeof PROVISIONABLE_ROLES)[number]['value']

export interface ProvisionStaffPayload {
  role: ProvisionableRole
  firstName: string
  lastName: string
  email: string
  /** Digits only — the server normalizes again with utils/phone.ts. */
  mobile: string
  /** Specialty for a clinician; job title for other staff. */
  specialty: string
  /**
   * ⚠️ Required. `completeOnboarding` refuses without it, so omitting it
   * trapped every provisioned clinician on the onboarding screen — blocked by
   * the one field the form never asked for.
   */
  yearsExperience: number
  registrationNumber?: string
  qualifications?: string
}

/**
 * Create a doctor account.
 *
 * ⚠️ THE REPLACEMENT FOR PUBLIC DOCTOR SIGN-UP. No password is sent or
 * returned — there isn't one. The server emails a single-use set-password link
 * to the address registered here, and the doctor signs in with email + password.
 */
export async function provisionStaff(
  payload: ProvisionStaffPayload,
): Promise<{ profileId: string; userId: string; role: string }> {
  return apiClient.post<{ profileId: string; userId: string; role: string }>(
    '/hospital-admin/staff',
    payload,
  )
}

export async function verifyDoctor(doctorId: string): Promise<void> {
  return apiClient.post(`/hospital-admin/doctors/${doctorId}/verify`)
}

export async function setDoctorActive(doctorId: string, isActive: boolean): Promise<void> {
  return apiClient.patch(`/hospital-admin/doctors/${doctorId}/active`, { isActive })
}

export async function listPatients(): Promise<HospitalAdminPatientRow[]> {
  const { patients } = await apiClient.get<{ patients: HospitalAdminPatientRow[] }>(
    '/hospital-admin/patients',
  )
  return patients
}

export async function listAppointments(): Promise<HospitalAdminAppointmentRow[]> {
  const { appointments } = await apiClient.get<{ appointments: HospitalAdminAppointmentRow[] }>(
    '/hospital-admin/appointments',
  )
  return appointments
}

export async function getAnalytics(): Promise<HospitalAdminAnalytics> {
  const { analytics } = await apiClient.get<{ analytics: HospitalAdminAnalytics }>(
    '/hospital-admin/analytics',
  )
  return analytics
}

export async function listFeedback(): Promise<{ feedback: Feedback[]; averageRating: number | null; count: number }> {
  return apiClient.get('/hospital-admin/feedback')
}

// ── Refill requests ──────────────────────────────────────────────────────────
// The administrator routes a patient's request to a doctor, or declines it
// with a reason the patient sees. Only a doctor's signed prescription fulfils it.

export type RefillQueueStatus = 'Requested' | 'Forwarded' | 'Fulfilled' | 'Declined' | 'Cancelled'

export interface RefillQueueRow {
  id: string
  status: RefillQueueStatus
  requestedAt: string
  resolvedAt: string | null
  patientName: string
  shriPatientId: string
  medicine: string
  form: string
  frequency: string
  prescribedBy: string | null
  prescriberUserId: string | null
  /** Days of supply left on the course; negative once it has run out. */
  supplyDaysLeft: number | null
  note: string | null
  forwardedToName: string | null
  declineReason: string | null
}

export interface RefillDoctor {
  id: string
  userId: string
  name: string
  specialty: string | null
}

export async function listRefills(): Promise<{ refills: RefillQueueRow[]; doctors: RefillDoctor[] }> {
  return apiClient.get('/hospital-admin/refills')
}

/** Without a doctor id, the request goes to the doctor who prescribed it. */
export async function forwardRefill(id: string, doctorId?: string): Promise<{ forwardedToName: string }> {
  const { refill } = await apiClient.post<{ refill: { forwardedToName: string } }>(
    `/hospital-admin/refills/${encodeURIComponent(id)}/forward`,
    doctorId === undefined ? {} : { doctorId },
  )
  return refill
}

export async function declineRefill(id: string, reason: string): Promise<void> {
  await apiClient.post(`/hospital-admin/refills/${encodeURIComponent(id)}/decline`, { reason })
}

export interface CareTeamAssignmentRow {
  id: string
  careRole: string
  isPrimary: boolean
  since: string
  doctorId: string
  doctorName: string
  specialty: string | null
}

export async function listPatientCareTeam(patientId: string): Promise<CareTeamAssignmentRow[]> {
  const { careTeam } = await apiClient.get<{ careTeam: CareTeamAssignmentRow[] }>(
    `/hospital-admin/patients/${patientId}/care-team`,
  )
  return careTeam
}

export interface AssignCareTeamPayload {
  patientId: string
  doctorId: string
  careRole: string
  isPrimary?: boolean
}

export async function assignCareTeam(payload: AssignCareTeamPayload): Promise<{ id: string }> {
  const { membership } = await apiClient.post<{ membership: { id: string } }>(
    '/hospital-admin/care-team',
    payload,
  )
  return membership
}

export async function endCareTeam(membershipId: string): Promise<void> {
  return apiClient.delete(`/hospital-admin/care-team/${membershipId}`)
}

/**
 * Approve a patient's request. The server checks the doctor is working then
 * and not already booked, and refuses with the reason if not. An unassigned
 * ("no preference") request needs `doctorId` — a doctor at this hospital.
 */
export async function approveAppointment(id: string, doctorId?: string): Promise<void> {
  await apiClient.post(`/hospital-admin/appointments/${id}/approve`, doctorId === undefined ? {} : { doctorId })
}

/** Decline a request; the patient is notified and asked to choose another time. */
export async function declineAppointment(id: string, reason: string): Promise<void> {
  await apiClient.post(`/hospital-admin/appointments/${id}/decline`, { reason })
}
