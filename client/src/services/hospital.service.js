/**
 * hospital.service.js
 *
 * The lightweight hospital directory used by the Doctor and Hospital Admin
 * onboarding pickers to join an existing hospital.
 */

import apiClient from '../lib/apiClient'

export async function listHospitals() {
  const { hospitals } = await apiClient.get('/hospitals')
  return hospitals
}
