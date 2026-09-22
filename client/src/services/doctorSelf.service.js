/**
 * doctorSelf.service.js
 *
 * A doctor's own profile, availability and assigned-patients summary.
 * Distinct from doctor.service.js, which is the PATIENT-facing bookable
 * directory (/api/v1/doctors) — this wraps /api/v1/doctor (singular), the
 * doctor's self-service API.
 */

import apiClient from '../lib/apiClient'

export async function getOwnProfile() {
  const { profile } = await apiClient.get('/doctor/profile')
  return profile
}

export async function updateOwnProfile(payload) {
  const { profile } = await apiClient.patch('/doctor/profile', payload)
  return profile
}

export async function completeOnboarding() {
  const { profile } = await apiClient.post('/doctor/onboarding-complete')
  return profile
}

export async function listAvailability() {
  return apiClient.get('/doctor/availability')
}

export async function addAvailabilitySlot(payload) {
  const { slot } = await apiClient.post('/doctor/availability', payload)
  return slot
}

export async function removeAvailabilitySlot(id) {
  return apiClient.delete(`/doctor/availability/${id}`)
}

/** Pause or resume a recurring slot without deleting it. */
export async function setAvailabilitySlotActive(id, isActive) {
  return apiClient.patch(`/doctor/availability/${id}`, { isActive })
}

export async function addLeave(payload) {
  const { leave } = await apiClient.post('/doctor/leave', payload)
  return leave
}

export async function removeLeave(id) {
  return apiClient.delete(`/doctor/leave/${id}`)
}

export async function listOwnPatients() {
  const { patients } = await apiClient.get('/doctor/patients')
  return patients
}

/**
 * The whole "My Day" screen in one call. Deliberately one request rather than
 * five: the dashboard is a single screen and a waterfall of partial fetches is
 * how it ends up rendering half-built.
 */
export async function getDashboard() {
  return apiClient.get('/doctor/dashboard')
}

/** range: 'today' | 'upcoming' | 'past' */
export async function listOwnAppointments(range = 'today') {
  const { appointments } = await apiClient.get(`/doctor/appointments?range=${range}`)
  return appointments
}
