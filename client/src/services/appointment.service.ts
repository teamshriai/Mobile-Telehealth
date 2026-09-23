/**
 * appointment.service.ts
 *
 * Thin wrapper over the appointment endpoints. Same shape as auth/profile
 * services: pure async functions, one apiClient import, no UI/routing/state.
 */

import apiClient from '../lib/apiClient'
import type { Appointment, AppointmentMode } from '../types/domain'

export type AppointmentScope = 'upcoming' | 'past' | 'all'

export async function listAppointments(scope: AppointmentScope = 'all'): Promise<Appointment[]> {
  const { appointments } = await apiClient.get<{ appointments: Appointment[] }>('/appointments', {
    params: { scope },
  })
  return appointments
}

export async function getAppointment(id: string): Promise<Appointment> {
  const { appointment } = await apiClient.get<{ appointment: Appointment }>(`/appointments/${id}`)
  return appointment
}

export interface RequestAppointmentPayload {
  scheduledAt: string
  doctorId?: string | null
  mode: AppointmentMode
  reason: string
}

export async function requestAppointment(payload: RequestAppointmentPayload): Promise<Appointment> {
  const { appointment } = await apiClient.post<{ appointment: Appointment }>(
    '/appointments',
    payload,
  )
  return appointment
}

export async function cancelAppointment(id: string, cancelReason?: string | null): Promise<Appointment> {
  const { appointment } = await apiClient.patch<{ appointment: Appointment }>(
    `/appointments/${id}/cancel`,
    { cancelReason },
  )
  return appointment
}
