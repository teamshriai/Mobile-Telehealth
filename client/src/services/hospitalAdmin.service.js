/**
 * hospitalAdmin.service.js
 *
 * The Hospital Admin's own profile/hospital setup, plus the hospital-scoped
 * management endpoints (doctors, patients, appointments, analytics,
 * feedback). Every read here is already scoped server-side to the acting
 * admin's own hospital — nothing here accepts a hospitalId from the caller.
 */

import apiClient from '../lib/apiClient'

export async function getOwnProfile() {
  const { profile } = await apiClient.get('/hospital-admin/profile')
  return profile
}

export async function updateOwnProfile(payload) {
  const { profile } = await apiClient.patch('/hospital-admin/profile', payload)
  return profile
}

export async function createHospital(payload) {
  const { profile } = await apiClient.post('/hospital-admin/hospital/create', payload)
  return profile
}

export async function joinHospital(hospitalId) {
  const { profile } = await apiClient.post('/hospital-admin/hospital/join', { hospitalId })
  return profile
}

export async function completeOnboarding() {
  const { profile } = await apiClient.post('/hospital-admin/onboarding-complete')
  return profile
}

export async function getOwnHospital() {
  const { hospital } = await apiClient.get('/hospital-admin/hospital')
  return hospital
}

export async function updateOwnHospital(payload) {
  const { hospital } = await apiClient.patch('/hospital-admin/hospital', payload)
  return hospital
}

export async function listDoctors() {
  const { doctors } = await apiClient.get('/hospital-admin/doctors')
  return doctors
}

export async function verifyDoctor(doctorId) {
  return apiClient.post(`/hospital-admin/doctors/${doctorId}/verify`)
}

export async function setDoctorActive(doctorId, isActive) {
  return apiClient.patch(`/hospital-admin/doctors/${doctorId}/active`, { isActive })
}

export async function listPatients() {
  const { patients } = await apiClient.get('/hospital-admin/patients')
  return patients
}

export async function listAppointments() {
  const { appointments } = await apiClient.get('/hospital-admin/appointments')
  return appointments
}

export async function getAnalytics() {
  const { analytics } = await apiClient.get('/hospital-admin/analytics')
  return analytics
}

export async function listFeedback() {
  return apiClient.get('/hospital-admin/feedback')
}
