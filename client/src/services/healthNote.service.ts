import apiClient from '../lib/apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// The patient's own health notes — /me/health-notes.
//
// ⚠️ PATIENT-GENERATED. Nothing here is reviewed by a clinician, and no
// function takes a patient id: the server resolves the patient from the
// session and scopes every row to them.
// ─────────────────────────────────────────────────────────────────────────────

export type NoteLanguage = 'en' | 'kn' | 'hi' | 'ta' | 'ml'
export type NoteVisibility = 'Private' | 'CareTeam'
export type TranscriptQuality = 'ok' | 'empty' | 'repetitive' | 'wrong_script'

export interface HealthNote {
  id: string
  source: 'Voice' | 'Typed'
  status: 'Draft' | 'Confirmed'
  visibility: NoteVisibility
  body: string | null
  language: NoteLanguage
  recordedAt: string
  confirmedAt: string | null
  editedAt: string | null
  correctedAfterTranscription: boolean
  hasAudio: boolean
  audioDurationMs: number | null
}

export interface SaveResult {
  note: HealthNote
  /** Set when the words look like an emergency — the screen must say "call 108". */
  emergency: { category: 'stroke' | 'medical' | 'selfHarm' } | null
}

export interface TranscriptionDraft {
  draftId: string
  text: string
  quality: TranscriptQuality
  durationMs: number
  language: NoteLanguage
}

export async function getCapabilities(): Promise<{ voice: boolean; maxSeconds: number }> {
  return apiClient.get('/me/health-notes/capabilities')
}

export async function listNotes(): Promise<HealthNote[]> {
  return (await apiClient.get<{ notes: HealthNote[] }>('/me/health-notes')).notes
}

export async function createTypedNote(input: {
  body: string
  language: NoteLanguage
  visibility: NoteVisibility
}): Promise<SaveResult> {
  return apiClient.post('/me/health-notes', input)
}

/**
 * ⚠️ Two overrides, both load-bearing. The shared client defaults to a JSON
 * content type, and axios converts a FormData body to JSON when it sees one —
 * so multipart is stated explicitly (axios then lets the browser add the
 * boundary). And the 15 s default timeout is shorter than a two-minute clip
 * takes to transcribe on the server's CPU.
 */
export async function transcribe(wav: Blob, language: NoteLanguage, recordedAt: Date): Promise<TranscriptionDraft> {
  const form = new FormData()
  form.append('language', language)
  form.append('recordedAt', recordedAt.toISOString())
  form.append('audio', wav, 'note.wav')
  return apiClient.post('/me/health-notes/transcriptions', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180_000,
  })
}

export async function confirmDraft(draftId: string, body: string, visibility: NoteVisibility): Promise<SaveResult> {
  return apiClient.post(`/me/health-notes/${draftId}/confirm`, { body, visibility })
}

export async function updateNote(id: string, change: { body?: string; visibility?: NoteVisibility }): Promise<SaveResult> {
  return apiClient.patch(`/me/health-notes/${id}`, change)
}

export async function deleteNote(id: string): Promise<void> {
  await apiClient.delete(`/me/health-notes/${id}`)
}

/** The recording, as bytes — fetched with the session so it is never a public URL. */
export async function fetchAudio(id: string): Promise<Blob> {
  return apiClient.get<Blob>(`/me/health-notes/${id}/audio`, { responseType: 'blob' })
}

export const NOTE_LANGUAGES: Array<{ code: NoteLanguage; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
]
