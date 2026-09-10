import apiClient from '../lib/apiClient'

/** The bookable clinician directory a patient chooses from when requesting a visit. */
export async function listDoctors() {
  const { doctors } = await apiClient.get('/doctors')
  return doctors
}
