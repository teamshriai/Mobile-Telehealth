import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Keyboard, Lock, Mic, NotebookPen, Pencil, Play, Trash2, Users } from 'lucide-react'
import * as notes from '../../services/healthNote.service'
import * as profileService from '../../services/profile.service'
import type { HealthNote, NoteLanguage } from '../../services/healthNote.service'
import { Banner, EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import SourceBadge from '../../components/common/SourceBadge'
import NoteComposer from '../../components/healthNotes/NoteComposer'
import { LANGUAGE_LABEL } from '../../services/portal.service'
import type { ApiError } from '../../types/api'

/**
 * Health Notes — what the PATIENT wrote or said, in their own words.
 *
 * ⚠️ PATIENT-GENERATED ON EVERY LINE. Each note carries the sand "You wrote
 * this" badge and never the clinician styling used for diagnoses and
 * prescriptions. A note that looked like a finding would be the worst
 * possible failure of this page.
 *
 * `?new=voice` or `?new=text` opens the composer straight away — that is how
 * the phone bar's centre button and Home's quick action arrive here.
 */
const SUPPORTED: NoteLanguage[] = ['en', 'kn', 'hi', 'ta', 'ml']

export default function HealthNotesPage() {
  const [params, setParams] = useSearchParams()
  const [list, setList] = useState<HealthNote[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [caps, setCaps] = useState<{ voice: boolean; maxSeconds: number }>({ voice: false, maxSeconds: 120 })
  const [defaultLanguage, setDefaultLanguage] = useState<NoteLanguage>('en')
  const [toDelete, setToDelete] = useState<HealthNote | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const requested = params.get('new')
  const composerMode: 'voice' | 'text' | null = requested === 'voice' || requested === 'text' ? requested : null

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    notes.listNotes()
      .then(setList)
      .catch((err: ApiError) => setError(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    notes.getCapabilities().then(setCaps).catch(() => setCaps({ voice: false, maxSeconds: 120 }))
    profileService.getProfile()
      .then((r) => {
        const pref = (r.profile?.preferences?.language as { language?: string } | undefined)?.language
        if (pref !== undefined && (SUPPORTED as string[]).includes(pref)) setDefaultLanguage(pref as NoteLanguage)
      })
      .catch(() => {})
  }, [load])

  const openComposer = (mode: 'voice' | 'text') => setParams({ new: mode })
  const closeComposer = () => setParams({}, { replace: true })

  const confirmDelete = async () => {
    if (toDelete === null) return
    await notes.deleteNote(toDelete.id)
    setToDelete(null)
    setNotice('Note deleted. Its recording has been removed.')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Health Notes</h1>
          <p className="mt-1.5 max-w-prose text-sm text-ink-muted">
            Your own record of how you feel, readings you took, and questions for your next visit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {caps.voice && (
            <button
              type="button"
              onClick={() => openComposer('voice')}
              className="focus-ring tap-target inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary hover:bg-primary-700"
            >
              <Mic size={16} aria-hidden="true" /> Speak a note
            </button>
          )}
          <button
            type="button"
            onClick={() => openComposer('text')}
            className={`focus-ring tap-target inline-flex items-center gap-2 rounded-lg px-4 text-sm font-semibold ${
              caps.voice ? 'border border-border-soft text-ink hover:bg-surface-2' : 'bg-primary-600 text-on-primary hover:bg-primary-700'
            }`}
          >
            <Keyboard size={16} aria-hidden="true" /> Type a note
          </button>
        </div>
      </div>

      <Banner tone="info">
        Your doctors do not monitor these notes. For anything urgent, call your clinic —
        and for stroke warning signs, <a href="tel:108" className="font-semibold underline">call 108</a>.
      </Banner>

      {notice !== null && <Banner tone="success">{notice}</Banner>}

      {loading ? (
        <LoadingState label="Loading your notes…" />
      ) : error !== null ? (
        <ErrorState description={error} onRetry={load} />
      ) : (list ?? []).length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          description={caps.voice
            ? 'Press "Speak a note" and say how you are feeling. You can check and correct the text before it is saved.'
            : 'Press "Type a note" to write down how you are feeling or a reading you took.'}
        />
      ) : (
        <ul className="space-y-3">
          {(list ?? []).map((n) => (
            <li key={n.id}>
              <NoteCard note={n} onChanged={load} onDelete={() => setToDelete(n)} />
            </li>
          ))}
        </ul>
      )}

      <NoteComposer
        open={composerMode !== null}
        mode={composerMode ?? 'voice'}
        voiceAvailable={caps.voice}
        maxSeconds={caps.maxSeconds}
        defaultLanguage={defaultLanguage}
        onClose={closeComposer}
        onSaved={load}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this note?"
        consequence="The note and its recording will be permanently removed. This cannot be undone."
        confirmLabel="Delete note"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

function NoteCard({ note, onChanged, onDelete }: { note: HealthNote; onChanged: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body ?? '')
  const [saving, setSaving] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [emergency, setEmergency] = useState(false)

  // Object URLs hold the decrypted recording in memory; release them.
  useEffect(() => () => { if (audioUrl !== null) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  const play = async () => {
    setAudioError(null)
    try {
      setAudioUrl(URL.createObjectURL(await notes.fetchAudio(note.id)))
    } catch (err) {
      setAudioError((err as ApiError).message || 'The recording could not be loaded.')
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const r = await notes.updateNote(note.id, { body: draft.trim() })
      setEmergency(r.emergency !== null)
      setEditing(false)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  const toggleShare = async () => {
    await notes.updateNote(note.id, { visibility: note.visibility === 'Private' ? 'CareTeam' : 'Private' })
    onChanged()
  }

  const when = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.recordedAt))
  const markers = [
    note.source === 'Voice' ? 'Voice note' : 'Typed note',
    note.correctedAfterTranscription && 'corrected after transcription',
    note.editedAt !== null && 'edited',
  ].filter(Boolean).join(' · ')

  return (
    <article className="rounded-xl border border-border-soft bg-surface-1 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{when}</p>
          <p className="text-xs text-ink-subtle">{markers} · {LANGUAGE_LABEL[note.language] ?? note.language}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
          {note.visibility === 'Private'
            ? <><Lock size={12} aria-hidden="true" /> Only you</>
            : <><Users size={12} aria-hidden="true" /> Shared with my doctors</>}
        </span>
      </div>

      {editing ? (
        <div className="mt-3">
          <label htmlFor={`edit-${note.id}`} className="sr-only">Edit note</label>
          <textarea
            id={`edit-${note.id}`}
            lang={note.language}
            value={draft}
            maxLength={5000}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setDraft(note.body ?? '') }} className="focus-ring tap-target rounded-lg px-3 text-sm text-ink-muted hover:bg-surface-2">Cancel</button>
            <button type="button" onClick={() => void saveEdit()} disabled={saving || draft.trim() === ''} className="focus-ring tap-target rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink" lang={note.language}>{note.body}</p>
      )}

      {emergency && (
        <Banner tone="error" className="mt-3">
          If this is happening now, <a href="tel:108" className="font-bold underline">call 108</a>. Nobody is reading your notes right now.
        </Banner>
      )}

      {audioUrl !== null && (
        <audio controls src={audioUrl} className="mt-3 w-full" aria-label="Recording of this note">
          Your browser cannot play this recording.
        </audio>
      )}
      {audioError !== null && <p className="mt-2 text-xs text-critical-fg">{audioError}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-3">
        <SourceBadge kind="patient" />
        {!editing && (
          <div className="flex flex-wrap gap-1">
            {note.hasAudio && audioUrl === null && (
              <button type="button" onClick={() => void play()} className="focus-ring tap-target inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-2">
                <Play size={14} aria-hidden="true" /> Listen
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)} className="focus-ring tap-target inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-2">
              <Pencil size={14} aria-hidden="true" /> Edit
            </button>
            <button type="button" onClick={() => void toggleShare()} className="focus-ring tap-target inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-2">
              {note.visibility === 'Private' ? <><Users size={14} aria-hidden="true" /> Share with my doctors</> : <><Lock size={14} aria-hidden="true" /> Make private</>}
            </button>
            <button type="button" onClick={onDelete} className="focus-ring tap-target inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-critical-fg hover:bg-critical-bg">
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
