import apiClient from '../lib/apiClient'
import type { BookableDoctor } from '../types/domain'

/** The bookable clinician directory a patient chooses from when requesting a visit. */
export async function listDoctors(): Promise<BookableDoctor[]> {
  const { doctors } = await apiClient.get<{ doctors: BookableDoctor[] }>('/doctors')
  return doctors
}
