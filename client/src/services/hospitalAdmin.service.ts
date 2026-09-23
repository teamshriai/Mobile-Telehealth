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
