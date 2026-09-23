/**
 * doctorSelf.service.ts
 *
 * A doctor's own profile, availability and assigned-patients summary.
 * Distinct from doctor.service.ts, which is the PATIENT-facing bookable
 * directory (/api/v1/doctors) — this wraps /api/v1/doctor (singular), the
 * doctor's self-service API.
 */

import apiClient from '../lib/apiClient'
import type {
  AvailabilitySlot,
  DoctorLeave,
  DoctorProfile,
  DoctorDashboard,
  DoctorPatientSummary,
  Appointment,
  AppointmentStatus,
} from '../types/domain'

export async function getOwnProfile(): Promise<DoctorProfile> {
  const { profile } = await apiClient.get<{ profile: DoctorProfile }>('/doctor/profile')
  return profile
}

export async function updateOwnProfile(payload: Partial<DoctorProfile>): Promise<DoctorProfile> {
  const { profile } = await apiClient.patch<{ profile: DoctorProfile }>('/doctor/profile', payload)
  return profile
}

export async function completeOnboarding(): Promise<DoctorProfile> {
  const { profile } = await apiClient.post<{ profile: DoctorProfile }>('/doctor/onboarding-complete')
  return profile
}

export async function listAvailability(): Promise<{ slots: AvailabilitySlot[]; leaves: DoctorLeave[] }> {
  return apiClient.get('/doctor/availability')
}

export interface AddAvailabilitySlotPayload {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMins: number
}

export async function addAvailabilitySlot(
  payload: AddAvailabilitySlotPayload,
): Promise<AvailabilitySlot> {
  const { slot } = await apiClient.post<{ slot: AvailabilitySlot }>('/doctor/availability', payload)
  return slot
}

export async function removeAvailabilitySlot(id: string): Promise<void> {
  return apiClient.delete(`/doctor/availability/${id}`)
}

/** Pause or resume a recurring slot without deleting it. */
export async function setAvailabilitySlotActive(id: string, isActive: boolean): Promise<void> {
  return apiClient.patch(`/doctor/availability/${id}`, { isActive })
}

export interface AddLeavePayload {
  startDate: string
  endDate: string
  reason?: string
}

export async function addLeave(payload: AddLeavePayload): Promise<DoctorLeave> {
  const { leave } = await apiClient.post<{ leave: DoctorLeave }>('/doctor/leave', payload)
  return leave
}

export async function removeLeave(id: string): Promise<void> {
  return apiClient.delete(`/doctor/leave/${id}`)
}

export async function listOwnPatients(): Promise<DoctorPatientSummary[]> {
  const { patients } = await apiClient.get<{ patients: DoctorPatientSummary[] }>('/doctor/patients')
  return patients
}

/**
 * The whole "My Day" screen in one call. Deliberately one request rather than
 * five: the dashboard is a single screen and a waterfall of partial fetches is
 * how it ends up rendering half-built.
 */
export async function getDashboard(): Promise<DoctorDashboard> {
  return apiClient.get('/doctor/dashboard')
}

export type DoctorAppointmentRange = 'today' | 'upcoming' | 'past'

export async function listOwnAppointments(
  range: DoctorAppointmentRange = 'today',
): Promise<Appointment[]> {
  const { appointments } = await apiClient.get<{ appointments: Appointment[] }>(
    `/doctor/appointments?range=${range}`,
  )
  return appointments
}

export interface DoctorSlotDay {
  date: string
  slots: Array<{ startsAt: string; durationMins: number; label: string }>
}

export async function listOwnSlots(from: string, to: string): Promise<DoctorSlotDay[]> {
  const { days } = await apiClient.get<{ days: DoctorSlotDay[] }>(
    `/doctor/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  )
  return days
}

export interface BookAppointmentPayload {
  patientId: string
  scheduledAt: string
  durationMins?: number
  mode: 'InPerson' | 'Video' | 'Phone'
  reason?: string | null
  locationName?: string | null
}

export async function bookAppointment(payload: BookAppointmentPayload): Promise<Appointment> {
  const { appointment } = await apiClient.post<{ appointment: Appointment }>(
    '/doctor/appointments',
    payload,
  )
  return appointment
}

export interface RescheduleAppointmentPayload {
  scheduledAt: string
}

export interface ChangeAppointmentStatusPayload {
  status: AppointmentStatus
  cancelReason?: string | null
  notes?: string | null
}

export async function updateAppointment(
  id: string,
  payload: RescheduleAppointmentPayload | ChangeAppointmentStatusPayload,
): Promise<Appointment> {
  const { appointment } = await apiClient.patch<{ appointment: Appointment }>(
    `/doctor/appointments/${id}`,
    payload,
  )
  return appointment
}
