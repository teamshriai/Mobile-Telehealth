import apiClient from '../lib/apiClient'

export async function listCareTeam() {
  const { careTeam } = await apiClient.get('/care-team')
  return careTeam
}
