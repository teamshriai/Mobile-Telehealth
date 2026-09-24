import apiClient from '../lib/apiClient'
import type { ClinicalTemplate, PatientInstruction } from '../types/domain'

/** Templates & order sets — S-06-10. */

export async function listTemplates(category?: string): Promise<ClinicalTemplate[]> {
  const { templates } = await apiClient.get<{ templates: ClinicalTemplate[] }>('/templates', {
    params: category !== undefined ? { category } : undefined,
  })
  return templates
}

export interface SaveTemplatePayload {
  key: string
  name: string
  category: string
  body: string
}

export async function saveTemplate(payload: SaveTemplatePayload): Promise<ClinicalTemplate> {
  const { template } = await apiClient.post<{ template: ClinicalTemplate }>('/templates', payload)
  return template
}

/** A clinician asks; an administrator approves. They are different acts. */
export async function requestPromotion(id: string): Promise<void> {
  return apiClient.post(`/templates/${id}/request-promotion`)
}

/** Patient instructions — S-06-08. */

export async function listInstructions(patientId: string): Promise<PatientInstruction[]> {
  const { instructions } = await apiClient.get<{ instructions: PatientInstruction[] }>(
    '/instructions',
    { params: { patientId } },
  )
  return instructions
}

export interface IssueInstructionPayload {
  patientId: string
  encounterId?: string | null
  title: string
  body: string
  /** ⚠️ The PATIENT's language, not the clinician's (CMP-DPDP-02). */
  language: string
  /**
   * ⚠️ A6 — the English counterpart printed alongside. Omit both when
   * `language` is `'en'`; the server rejects sending them in that case rather
   * than storing the same text twice. Send both or neither.
   */
  titleEnglish?: string | null
  bodyEnglish?: string | null
}

export async function issueInstructions(
  payload: IssueInstructionPayload,
): Promise<PatientInstruction> {
  const { instruction } = await apiClient.post<{ instruction: PatientInstruction }>(
    '/instructions',
    payload,
  )
  return instruction
}
