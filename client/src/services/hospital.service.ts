/**
 * hospital.service.ts
 *
 * The lightweight hospital directory used by the Doctor and Hospital Admin
 * onboarding pickers to join an existing hospital.
 */

import apiClient from '../lib/apiClient'
import type { Hospital } from '../types/domain'

export async function listHospitals(): Promise<Hospital[]> {
  const { hospitals } = await apiClient.get<{ hospitals: Hospital[] }>('/hospitals')
  return hospitals
}
