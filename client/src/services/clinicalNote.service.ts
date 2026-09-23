/**
 * clinicalNote.service.ts
 *
 * The consultation-note lifecycle: draft, sign, amend. Mirrors
 * server/src/clinicalNote — every one of these calls is already row-gated
 * server-side by careRelationshipService.requirePatientAccess; nothing here
 * repeats that check, it only shapes the request.
 *
 * ⚠️ A signed note is never edited (CMP-NABH-10) — there is deliberately no
 * "update after sign" function here. `amendNote` is the only way to change
 * one, and the server enforces that even if this file were bypassed.
 */

import apiClient from '../lib/apiClient'
import type { ClinicalNote, CosignQueueItem, QualityFinding } from '../types/domain'

export async function listNotes(patientId: string): Promise<ClinicalNote[]> {
  const { notes } = await apiClient.get<{ notes: ClinicalNote[] }>('/notes', {
    params: { patientId },
  })
  return notes
}

export async function getNote(id: string): Promise<ClinicalNote> {
  const { note } = await apiClient.get<{ note: ClinicalNote }>(`/notes/${id}`)
  return note
}

export interface CreateNotePayload {
  patientId: string
  encounterId?: string | null
  appointmentId?: string | null
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  problemCode?: string | null
  problemText?: string | null
}

export async function createNote(payload: CreateNotePayload): Promise<ClinicalNote> {
  const { note } = await apiClient.post<{ note: ClinicalNote }>('/notes', payload)
  return note
}

export type UpdateNotePayload = Omit<CreateNotePayload, 'patientId' | 'encounterId' | 'appointmentId'>

/** Only succeeds while the note is a Draft — the server 409s otherwise. */
export async function updateNoteDraft(id: string, payload: UpdateNotePayload): Promise<ClinicalNote> {
  const { note } = await apiClient.patch<{ note: ClinicalNote }>(`/notes/${id}`, payload)
  return note
}

export async function signNote(id: string): Promise<ClinicalNote> {
  const { note } = await apiClient.post<{ note: ClinicalNote }>(`/notes/${id}/sign`)
  return note
}

export async function amendNote(id: string, body: string): Promise<ClinicalNote> {
  const { note } = await apiClient.post<{ note: ClinicalNote }>(`/notes/${id}/addenda`, { body })
  return note
}

export async function deleteNoteDraft(id: string): Promise<void> {
  return apiClient.delete(`/notes/${id}`)
}

// ── Co-sign (S-06-09) and documentation quality (CMP-NABH-05) ───────────────

/**
 * The consultant co-sign queue.
 *
 * ⚠️ Returns triage metadata only — never note content. The content is read
 * on the note screen, through the same row-level gate as any other read.
 */
export async function listCosignQueue(): Promise<CosignQueueItem[]> {
  const { notes } = await apiClient.get<{ notes: CosignQueueItem[] }>('/notes/cosign-queue')
  return notes
}

/** ⚠️ Stamps the consultant ALONGSIDE the author — both identities survive. */
export async function cosignNote(id: string): Promise<ClinicalNote> {
  const { note } = await apiClient.post<{ note: ClinicalNote }>(`/notes/${id}/cosign`)
  return note
}

/** Sends it back to Draft. ⚠️ Reason mandatory; the author is notified. */
export async function returnNoteToAuthor(id: string, reason: string): Promise<void> {
  return apiClient.post(`/notes/${id}/return`, { reason })
}

/**
 * Banned-abbreviation and dose-expression check (CMP-NABH-05).
 *
 * Takes the text rather than a note id so an unsaved draft can be checked on
 * blur — waiting for a save would make the warning arrive too late to act on.
 */
export async function checkNoteQuality(sections: {
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
}): Promise<QualityFinding[]> {
  const { findings } = await apiClient.post<{ findings: QualityFinding[] }>(
    '/notes/quality-check',
    sections,
  )
  return findings
}
