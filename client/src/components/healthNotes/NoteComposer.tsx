import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Keyboard, Lock, Mic, Phone, Square, Users } from 'lucide-react'
import Modal from '../common/Modal'
import { Banner, Spinner } from '../feedback/States'
import { classifyMicError, micPreflight, type MicStatus } from '../../lib/micSupport'
import { toPcm16kMonoWav } from '../../lib/audio/pcm'
import * as notes from '../../services/healthNote.service'
import type { NoteLanguage, NoteVisibility, SaveResult, TranscriptQuality } from '../../services/healthNote.service'
import type { ApiError } from '../../types/api'

/**
 * Add a health note — by voice or by typing.
 *
 * Voice: choose language → record → stop → the server transcribes → the
 * patient CORRECTS the text → chooses who can see it → saves. Nothing is
 * saved as a note until the patient confirms the words; an unconfirmed
 * recording is discarded by the server after 24 hours.
 *
 * ⚠️ THE TRANSCRIPT IS A DRAFT, AND THE SCREEN SAYS SO. Speech-to-text is
 * wrong often enough — especially outside English — that presenting its
 * output as "your note" would put words in the patient's mouth. The text is
 * always editable, and a transcript the server judged unreliable (repetitive,
 * or in the wrong script for the chosen language) is flagged in words.
 *
 * ⚠️ NOT A MESSAGE. The composer states that the care team does not monitor
 * notes, and there is a call-108 line at every step, because the moment
 * someone is describing a symptom is the moment they may need it.
 */

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording'; startedAt: Date }
  | { kind: 'transcribing'; startedAt: number }
  | { kind: 'review'; draftId: string | null; quality: TranscriptQuality | null }
  | { kind: 'saving'; draftId: string | null }
  | { kind: 'saved'; result: SaveResult }

const MIC_MESSAGE: Record<MicStatus, string> = {
  'insecure-origin':
    'Voice notes need a secure connection. This page was opened over plain HTTP, where browsers do not allow the microphone. You can type your note instead.',
  denied: 'Microphone access was declined. You can allow it from the address bar, or type your note instead.',
  'no-device': 'No microphone was found on this device. You can type your note instead.',
  unsupported: 'This browser cannot record audio here. You can type your note instead.',
}

const QUALITY_MESSAGE: Partial<Record<TranscriptQuality, string>> = {
  empty: 'We could not make out any words. Please record again, or type your note.',
  repetitive:
    'This transcript repeats itself, which usually means the recording was not understood. Please check it carefully, record again, or type your note.',
  wrong_script:
    'This does not look like the language you chose. Check the language, record again, or type your note.',
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface Props {
  open: boolean
  mode: 'voice' | 'text'
  voiceAvailable: boolean
  maxSeconds: number
  defaultLanguage: NoteLanguage
  onClose: () => void
  onSaved: () => void
}

export default function NoteComposer({ open, mode: initialMode, voiceAvailable, maxSeconds, defaultLanguage, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<'voice' | 'text'>(voiceAvailable ? initialMode : 'text')
  const [language, setLanguage] = useState<NoteLanguage>(defaultLanguage)
  const [visibility, setVisibility] = useState<NoteVisibility>('Private')
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [micStatus, setMicStatus] = useState<MicStatus | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [level, setLevel] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Reset every time the composer opens, so a previous note never leaks in.
  useEffect(() => {
    if (!open) return
    setMode(voiceAvailable ? initialMode : 'text')
    setLanguage(defaultLanguage)
    setVisibility('Private')
    setText('')
    setPhase({ kind: 'idle' })
    setError(null)
    setMicStatus(voiceAvailable ? micPreflight() : null)
  }, [open, initialMode, voiceAvailable, defaultLanguage])

  const releaseMic = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    void audioCtxRef.current?.close()
    audioCtxRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // ⚠️ Never leave a microphone open behind a closed dialog.
  useEffect(() => () => releaseMic(), [releaseMic])

  const ticking = phase.kind === 'recording' || phase.kind === 'transcribing'
  useEffect(() => {
    if (!ticking) return undefined
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [ticking])

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current
    if (rec !== null && rec.state !== 'inactive') rec.stop()
  }, [])

  const finishRecording = useCallback(async (startedAt: Date) => {
    releaseMic()
    setPhase({ kind: 'transcribing', startedAt: Date.now() })
    try {
      const recorded = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || 'audio/webm' })
      const { wav } = await toPcm16kMonoWav(recorded)
      const draft = await notes.transcribe(wav, language, startedAt)
      setText(draft.text)
      setPhase({ kind: 'review', draftId: draft.draftId, quality: draft.quality })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message || 'We could not transcribe that recording.')
      setPhase({ kind: 'idle' })
    }
  }, [language, releaseMic])

  // Auto-stop at the server's limit, so the upload is never refused for length.
  useEffect(() => {
    if (phase.kind !== 'recording') return
    if (now - phase.startedAt.getTime() >= maxSeconds * 1000) stopRecording()
  }, [now, phase, maxSeconds, stopRecording])

  const startRecording = async () => {
    setError(null)
    const blocked = micPreflight()
    if (blocked !== null) { setMicStatus(blocked); return }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
    } catch (err) {
      setMicStatus(classifyMicError(err))
      return
    }
    streamRef.current = stream
    chunksRef.current = []
    const rec = new MediaRecorder(stream)
    recorderRef.current = rec
    const startedAt = new Date()
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = () => { void finishRecording(startedAt) }
    rec.start(250)

    // A live level meter: proof the microphone is actually hearing something.
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(buf)
      let peak = 0
      for (const b of buf) peak = Math.max(peak, Math.abs(b - 128))
      setLevel(Math.min(1, peak / 64))
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    setNow(Date.now())
    setPhase({ kind: 'recording', startedAt })
  }

  const save = async () => {
    const body = text.trim()
    if (body === '') { setError('The note is empty.'); return }
    setError(null)
    const draftId = phase.kind === 'review' ? phase.draftId : null
    setPhase({ kind: 'saving', draftId })
    try {
      const result = draftId !== null
        ? await notes.confirmDraft(draftId, body, visibility)
        : await notes.createTypedNote({ body, language, visibility })
      setPhase({ kind: 'saved', result })
      onSaved()
    } catch (err) {
      setError((err as ApiError).message || 'The note could not be saved.')
      setPhase({ kind: 'review', draftId, quality: null })
    }
  }

  const close = () => {
    stopRecording()
    releaseMic()
    onClose()
  }

  const recording = phase.kind === 'recording'
  const busy = phase.kind === 'transcribing' || phase.kind === 'saving'
  const editing = mode === 'text' ? phase.kind !== 'saved' : phase.kind === 'review' || phase.kind === 'saving'
  const qualityMessage = phase.kind === 'review' && phase.quality !== null ? QUALITY_MESSAGE[phase.quality] : undefined

  return (
    <Modal
      isOpen={open}
      onClose={busy || recording ? undefined : close}
      closeable={!busy && !recording}
      size="md"
      title={phase.kind === 'saved' ? 'Note saved' : 'Add a health note'}
    >
      <div className="space-y-4">
        {phase.kind === 'saved' ? (
          <SavedView result={phase.result} onDone={close} />
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              A private record in your own words — symptoms, readings, questions for your next visit.
              <strong className="font-semibold text-ink"> Your doctors do not monitor these notes.</strong>
            </p>

            {voiceAvailable && phase.kind === 'idle' && (
              <div role="radiogroup" aria-label="How do you want to add this note?" className="grid grid-cols-2 gap-1 rounded-xl border border-border-soft bg-surface-2 p-1">
                {(['voice', 'text'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => { setMode(m); setError(null) }}
                    className={`focus-ring flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium ${
                      mode === m ? 'bg-surface-1 text-ink shadow-card-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {m === 'voice' ? <Mic size={15} aria-hidden="true" /> : <Keyboard size={15} aria-hidden="true" />}
                    {m === 'voice' ? 'Speak' : 'Type'}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="note-language" className="mb-1.5 block text-sm font-medium text-ink">
                Language {mode === 'voice' && <span className="font-normal text-ink-subtle">— the language you will speak</span>}
              </label>
              <select
                id="note-language"
                value={language}
                disabled={phase.kind !== 'idle' && mode === 'voice'}
                onChange={(e) => setLanguage(e.target.value as NoteLanguage)}
                className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink disabled:opacity-60"
              >
                {notes.NOTE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}{l.native !== l.label ? ` — ${l.native}` : ''}</option>
                ))}
              </select>
            </div>

            {mode === 'voice' && micStatus !== null && (
              <Banner tone="warning">{MIC_MESSAGE[micStatus]}</Banner>
            )}

            {mode === 'voice' && (phase.kind === 'idle' || recording) && micStatus === null && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border-soft bg-surface-2 px-4 py-6">
                {recording ? (
                  <>
                    <p className="text-sm font-semibold text-critical-fg" role="status" aria-live="polite">
                      <span aria-hidden="true">●</span> Recording · {clock(now - phase.startedAt.getTime())}
                      <span className="font-normal text-ink-subtle"> / {clock(maxSeconds * 1000)}</span>
                    </p>
                    <div aria-hidden="true" className="h-2 w-40 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-primary-600 transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="focus-ring flex h-16 w-16 items-center justify-center rounded-full bg-critical-fg text-on-primary shadow-card-lg"
                      aria-label="Stop recording"
                    >
                      <Square size={22} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void startRecording()}
                      className="focus-ring flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-on-primary shadow-card-lg hover:bg-primary-700"
                      aria-label="Start recording"
                    >
                      <Mic size={24} aria-hidden="true" />
                    </button>
                    <p className="text-center text-sm text-ink-muted">Press to start. Up to {Math.round(maxSeconds / 60)} minutes.</p>
                  </>
                )}
              </div>
            )}

            {phase.kind === 'transcribing' && (
              <div role="status" className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-2 px-4 py-5">
                <Spinner />
                <p className="text-sm text-ink">
                  Turning your recording into text… <span className="tabular-nums text-ink-subtle">{clock(now - phase.startedAt)}</span>
                  <span className="block text-xs text-ink-subtle">This happens on our own server; your recording is not sent to any other company.</span>
                </p>
              </div>
            )}

            {editing && (
              <div>
                <label htmlFor="note-body" className="mb-1.5 block text-sm font-medium text-ink">
                  {mode === 'voice' ? 'Check and correct the text' : 'Your note'}
                </label>
                {qualityMessage !== undefined && (
                  <Banner tone="warning" className="mb-2">{qualityMessage}</Banner>
                )}
                <textarea
                  id="note-body"
                  lang={language}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  maxLength={5000}
                  disabled={busy}
                  placeholder={mode === 'text' ? 'e.g. Headache since yesterday evening. BP 145/90 this morning.' : undefined}
                  className="focus-ring w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm leading-relaxed text-ink disabled:opacity-60"
                />
                <p className="mt-1 text-right text-xs tabular-nums text-ink-subtle">{text.length} / 5000</p>
              </div>
            )}

            {editing && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-ink">Who can see this note?</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <VisibilityChoice
                    checked={visibility === 'Private'}
                    onChange={() => setVisibility('Private')}
                    icon={<Lock size={15} aria-hidden="true" />}
                    title="Only me"
                    detail="Private to you."
                  />
                  <VisibilityChoice
                    checked={visibility === 'CareTeam'}
                    onChange={() => setVisibility('CareTeam')}
                    icon={<Users size={15} aria-hidden="true" />}
                    title="Share with my doctors"
                    detail="They can read it at your next visit. It is not monitored."
                  />
                </div>
              </fieldset>
            )}

            {error !== null && <Banner tone="error">{error}</Banner>}

            <p className="flex items-start gap-1.5 text-xs text-ink-subtle">
              <Phone size={13} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              <span>If you have stroke warning signs or feel very unwell now, do not write a note — <a href="tel:108" className="font-semibold text-critical-fg underline">call 108</a>.</span>
            </p>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border-soft pt-4">
              <button
                type="button"
                onClick={close}
                disabled={busy || recording}
                className="focus-ring tap-target rounded-lg px-4 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:opacity-60"
              >
                Cancel
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy || text.trim() === ''}
                  className="focus-ring tap-target rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary hover:bg-primary-700 disabled:opacity-60"
                >
                  {phase.kind === 'saving' ? 'Saving…' : 'Save note'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function VisibilityChoice({ checked, onChange, icon, title, detail }: {
  checked: boolean; onChange: () => void; icon: React.ReactNode; title: string; detail: string
}) {
  return (
    <label className={`focus-within:ring-2 focus-within:ring-primary-600/40 flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 ${
      checked ? 'border-primary-600 bg-primary-50/40' : 'border-border-soft bg-surface-1 hover:border-border'
    }`}>
      <input type="radio" name="note-visibility" checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">{icon}{title}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{detail}</span>
      </span>
    </label>
  )
}

/**
 * After saving. When the words look like an emergency the whole view is the
 * call-108 instruction — the note is saved, but that is not what matters now.
 */
function SavedView({ result, onDone }: { result: SaveResult; onDone: () => void }) {
  if (result.emergency !== null) {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-xl border-2 border-critical-fg bg-critical-bg p-4 text-critical-fg">
          <p className="flex items-center gap-2 text-base font-bold">
            <AlertTriangle size={20} aria-hidden="true" /> If this is happening now, call 108.
          </p>
          <p className="mt-1 text-sm">
            What you wrote may describe an emergency. Your note was saved, but nobody is reading it
            right now. Do not wait — call for help.
          </p>
          <a href="tel:108" className="focus-ring mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-critical-fg px-5 text-base font-bold text-on-primary">
            <Phone size={18} aria-hidden="true" /> Call 108
          </a>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={onDone} className="focus-ring tap-target rounded-lg px-4 text-sm font-medium text-ink-muted hover:bg-surface-2">Close</button>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <Banner tone="success">
        Saved to your health notes{result.note.visibility === 'CareTeam' ? ' and shared with your doctors' : ''}.
      </Banner>
      <div className="flex justify-end">
        <button type="button" onClick={onDone} className="focus-ring tap-target rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary hover:bg-primary-700">Done</button>
      </div>
    </div>
  )
}
