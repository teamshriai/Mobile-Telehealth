/**
 * appointment.service.js
 *
 * Thin wrapper over the appointment endpoints. Same shape as auth/profile
 * services: pure async functions, one apiClient import, no UI/routing/state.
 */

import apiClient from '../lib/apiClient'

/**
 * @param {'upcoming'|'past'|'all'} scope
 * @returns {Promise<Array>}
 */
export async function listAppointments(scope = 'all') {
  const { appointments } = await apiClient.get('/appointments', { params: { scope } })
  return appointments
}

export async function getAppointment(id) {
  const { appointment } = await apiClient.get(`/appointments/${id}`)
  return appointment
}

/**
 * @param {{ scheduledAt: string, doctorId?: string|null, mode: 'InPerson'|'Video'|'Phone', reason: string }} payload
 */
export async function requestAppointment(payload) {
  const { appointment } = await apiClient.post('/appointments', payload)
  return appointment
}

export async function cancelAppointment(id, cancelReason) {
  const { appointment } = await apiClient.patch(`/appointments/${id}/cancel`, { cancelReason })
  return appointment
}
