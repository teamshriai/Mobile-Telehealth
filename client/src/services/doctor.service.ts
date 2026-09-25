import apiClient from '../lib/apiClient'
import type { BookableDoctor } from '../types/domain'

/** The bookable clinician directory a patient chooses from when requesting a visit. */
export async function listDoctors(): Promise<BookableDoctor[]> {
  const { doctors } = await apiClient.get<{ doctors: BookableDoctor[] }>('/doctors')
  return doctors
}

export interface SlotDay {
  date: string
  slots: Array<{ startsAt: string; durationMins: number; label: string }>
}

/**
 * A clinician's free, PUBLISHED slots — the same generator their own diary
 * uses, so a slot offered here is one the server will accept.
 */
export async function listSlots(doctorId: string, from: Date, to: Date): Promise<SlotDay[]> {
  const { days } = await apiClient.get<{ days: SlotDay[] }>(`/doctors/${doctorId}/slots`, {
    params: { from: from.toISOString(), to: to.toISOString() },
  })
  return days
}
