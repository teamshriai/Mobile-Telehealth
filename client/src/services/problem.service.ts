import apiClient from '../lib/apiClient'
import type { Problem, DiagnosisCode } from '../types/domain'

/** Problem list & diagnosis coding — S-06-05. */

export async function searchDiagnosisCodes(q: string): Promise<DiagnosisCode[]> {
  const { codes } = await apiClient.get<{ codes: DiagnosisCode[] }>('/problems/codes', {
    params: { q },
  })
  return codes
}

export async function listProblems(patientId: string): Promise<Problem[]> {
  const { problems } = await apiClient.get<{ problems: Problem[] }>('/problems', {
    params: { patientId },
  })
  return problems
}

export interface AddProblemPayload {
  patientId: string
  encounterId?: string | null
  code: string
  onsetDate?: string | null
  note?: string | null
}

/** ⚠️ The server rejects a parent-only ICD-10 code with a 400. */
export async function addProblem(payload: AddProblemPayload): Promise<Problem> {
  const { problem } = await apiClient.post<{ problem: Problem }>('/problems', payload)
  return problem
}

/** ⚠️ Resolves, never deletes — a resolved diagnosis is still history. */
export async function resolveProblem(id: string): Promise<void> {
  return apiClient.patch(`/problems/${id}/resolve`)
}
