import apiClient from '../lib/apiClient'
import type { Drug, Prescription, SafetyEvaluation } from '../types/domain'

/**
 * prescription.service.ts — S-06-07.
 *
 * ⚠️ Every mutating call returns the re-evaluated safety state alongside the
 * basket. The gate must never be rendered from a stale evaluation, and a
 * separate "now check safety" round trip is a round trip a caller can skip.
 */

export async function searchFormulary(q: string): Promise<Drug[]> {
  const { drugs } = await apiClient.get<{ drugs: Drug[] }>('/prescriptions/formulary', {
    params: { q },
  })
  return drugs
}

/** One open draft per clinician per encounter — reopening resumes it. */
export async function getDraftForEncounter(encounterId: string): Promise<Prescription> {
  const { prescription } = await apiClient.get<{ prescription: Prescription }>(
    `/prescriptions/encounter/${encounterId}/draft`,
  )
  return prescription
}

export async function getPrescription(id: string): Promise<Prescription> {
  const { prescription } = await apiClient.get<{ prescription: Prescription }>(
    `/prescriptions/${id}`,
  )
  return prescription
}

export async function listForPatient(patientId: string): Promise<Prescription[]> {
  const { prescriptions } = await apiClient.get<{ prescriptions: Prescription[] }>(
    '/prescriptions',
    { params: { patientId } },
  )
  return prescriptions
}

export async function evaluateSafety(id: string): Promise<SafetyEvaluation> {
  const { safety } = await apiClient.get<{ safety: SafetyEvaluation }>(
    `/prescriptions/${id}/safety`,
  )
  return safety
}

export interface AddItemPayload {
  drugId: string
  dose: number
  doseUnit: string
  route: string
  frequency: string
  durationDays: number
  indicationCode?: string | null
  substitutionAllowed: boolean
  instructions?: string | null
}

export async function addItem(
  id: string,
  payload: AddItemPayload,
): Promise<{ prescription: Prescription; safety: SafetyEvaluation }> {
  return apiClient.post(`/prescriptions/${id}/items`, payload)
}

export async function removeItem(
  id: string,
  itemId: string,
): Promise<{ prescription: Prescription; safety: SafetyEvaluation }> {
  return apiClient.delete(`/prescriptions/${id}/items/${itemId}`)
}

/** ⚠️ 409s if any hard stop stands. The server re-evaluates before committing. */
export async function signPrescription(id: string): Promise<Prescription> {
  const { prescription } = await apiClient.post<{ prescription: Prescription }>(
    `/prescriptions/${id}/sign`,
  )
  return prescription
}

export interface OverridePayload {
  itemId: string
  reason: string
  secondConsultantEmail: string
  /** Verified server-side against that clinician's account. Never stored. */
  secondConsultantPassword: string
  acknowledged: true
}

/**
 * ⚠️ G4 dual-signature override of a deterministic hard stop. Emits the one
 * audit event UI_ATLAS says must ALERT, reviewed within 24 hours.
 */
export async function overrideHardStop(
  id: string,
  payload: OverridePayload,
): Promise<{ overrideId: string; audited: boolean; safety: SafetyEvaluation }> {
  return apiClient.post(`/prescriptions/${id}/override`, payload)
}
