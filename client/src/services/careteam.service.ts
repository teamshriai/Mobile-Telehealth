import apiClient from '../lib/apiClient'
import type { CareTeamMember } from '../types/domain'

export async function listCareTeam(): Promise<CareTeamMember[]> {
  const { careTeam } = await apiClient.get<{ careTeam: CareTeamMember[] }>('/care-team')
  return careTeam
}
