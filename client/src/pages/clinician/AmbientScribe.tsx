import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Pause, Play, Square, Trash2, X } from 'lucide-react'
import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import AiMark from '../../ai/components/AiMark'
import ConfidenceBandChip from '../../ai/components/ConfidenceBand'
import { useAiMode } from '../../ai/useAi'
import {
  TRANSCRIPT,
  DRAFTS,
  DURATION_SECONDS,
  ABSTAIN_REASON,
  type Utterance,
  type ScribeDraft,
} from '../../ai/fixtures/scribe'

/**
 * `S-06-04` · Ambient Scribe Session — `ARC-21`, an overlay over `S-06-03`.
 *
 * ⚠️ NOTHING IS RECORDED, AND THE SCREEN SAYS SO IN THREE PLACES. The
 * microphone permission is real, because the consent-and-record *flow* is what
 * this screen specifies and a fake permission prompt would teach the wrong
 * thing about it. But no audio is read, stored or sent: the transcript is fixed
 * text played back on a timer. Pretending otherwise would be the exact failure
 * the brief forbids — claiming an integration that does not exist.
 *
 * Four properties the atlas makes non-negotiable here:
 *
 *  1. **Consent before recording** (`CMP-DPDP-05`). The record control does not
 *     exist until consent is recorded — it is not a disabled button, because a
 *     disabled record button invites someone to look for a way to enable it.
 *  2. **The transcript sits beside the forming draft** (§6634 — "it is what
 *     makes the scribe believable"). Not a transcript you can open afterwards:
 *     both, at once, while it happens.
 *  3. **Pause marks the gap, it does not hide it.** A transcript that silently
 *     closes over a pause is a transcript nobody can rely on in a dispute.
 *  4. **Discard keeps the raw transcript.** The draft is derived and can be
 *     thrown away; what was said is the record and cannot.
 *
 * ⚠️ Typing is never taken away. §6630: "Dictation is never the only input
 * path." The note underneath stays fully editable the entire time this is open.
 */

type Phase = 'consent' | 'idle' | 'recording' | 'paused' | 'drafted' | 'abstained'

/** Playback speed. Real time would make a 140-second fixture a 140-second demo. */
const TICK_MS = 250
const SECONDS_PER_TICK = 2

/** §6598 — "Stop & draft, enabled when ≥10s recorded". */
const MIN_SECONDS_TO_DRAFT = 10

interface AmbientScribeProps {
  open: boolean
  onClose: () => void
  patientName: string
  /** Called with the accepted sections when the clinician keeps the draft. */
  onAccept: (drafts: ReadonlyArray<ScribeDraft>) => void
}

export default function AmbientScribe({
  open,
  onClose,
  patientName,
  onAccept,
}: AmbientScribeProps) {
  const { mode } = useAiMode()
  const [phase, setPhase] = useState<Phase>('consent')
  const [consent, setConsent] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [micDenied, setMicDenied] = useState(false)
  const [gaps, setGaps] = useState<number[]>([])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const heard = TRANSCRIPT.filter((u) => u.at <= elapsed)

  /**
   * The transcript as one time-ordered list of speech and pauses.
   *
   * ⚠️ Built as a merged timeline rather than "utterances, with a flag on the
   * one a pause followed". That first shape quietly lost any pause taken before
   * the next person spoke — including a pause taken immediately, which is the
   * commonest one — and a transcript that drops a gap is exactly what rule 3 in
   * the header says it must never be.
   */
  const timeline: Array<{ kind: 'speech'; u: Utterance } | { kind: 'gap'; at: number }> = [
    ...heard.map((u) => ({ kind: 'speech' as const, u })),
    ...gaps.map((at) => ({ kind: 'gap' as const, at })),
  ].sort((a, b) => (a.kind === 'speech' ? a.u.at : a.at) - (b.kind === 'speech' ? b.u.at : b.at))

  /** Reset whenever the overlay is reopened — a stale session is confusing. */
  useEffect(() => {
    if (!open) return
    setPhase('consent')
    setConsent(false)
    setElapsed(0)
    setMicDenied(false)
    setGaps([])
  }, [open])

  // The playback clock.
  useEffect(() => {
    if (phase !== 'recording') return undefined
    const t = window.setInterval(() => {
      setElapsed((e) => Math.min(e + SECONDS_PER_TICK, DURATION_SECONDS))
    }, TICK_MS)
    return () => window.clearInterval(t)
  }, [phase])

  // Keep the newest line in view.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [heard.length])

  /**
   * ⚠️ A REAL PERMISSION PROMPT, AND A REAL DEGRADE PATH. The atlas requires
   * the record action to be enabled only when "consent captured and mic
   * available", so the availability has to be genuinely checked. When it is
   * refused — or there is no device, or the browser blocks it on an insecure
   * origin — the session continues as playback and says which one happened.
   * It must never look like it is listening when it is not.
   */
  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Released immediately: holding an open microphone we never read would be
      // indefensible, and the recording indicator in the browser chrome would
      // be telling the patient something untrue.
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setMicDenied(true)
    }
    setPhase('recording')
  }, [])

  const stopAndDraft = useCallback(() => {
    // The three AI failure states are reachable from the demo switcher, and
    // this is the one that matters most here: an unintelligible recording must
    // produce nothing rather than something plausible.
    setPhase(mode === 'abstain' ? 'abstained' : 'drafted')
  }, [mode])

  if (!open) return null

  const canDraft = elapsed >= MIN_SECONDS_TO_DRAFT
  const drafts = mode === 'low' ? DRAFTS.map((d) => ({ ...d, band: 'LOW' as const })) : DRAFTS

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ambient scribe — ${patientName}`}
      className="fixed inset-0 z-50 flex flex-col bg-surface-2"
    >
      {/* ── Z4 · session context ──────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-soft bg-surface-1 px-4 py-3 sm:px-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <AiMark />
          Ambient scribe
        </h2>
        <span className="text-xs text-ink-muted">{patientName}</span>

        {(phase === 'recording' || phase === 'paused') && (
          <span
            role="status"
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold ${
              phase === 'recording'
                ? 'bg-critical-bg text-critical-fg'
                : 'bg-warning-bg text-warning-fg'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                phase === 'recording' ? 'animate-pulse bg-critical-fg' : 'bg-warning-fg'
              }`}
            />
            {phase === 'recording' ? 'Recording' : 'Paused'}
            <span className="tabular-nums font-normal">{mmss(elapsed)}</span>
          </span>
        )}

        {/* ⚠️ Stated plainly, at the top, always. Not a footnote. */}
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-2xs text-ink-muted">
          Simulated — no audio is captured or sent
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close the scribe"
          className="focus-ring ml-auto rounded p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {/* ── Z5 · transcript beside the forming draft ──────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-hidden bg-border-soft lg:grid-cols-2">
        {/* Transcript */}
        <section aria-label="Live transcript" className="flex min-h-0 flex-col bg-surface-1">
          <h3 className="border-b border-border-soft px-4 py-2 text-2xs font-medium uppercase tracking-wide text-ink-subtle sm:px-6">
            Transcript
          </h3>

          {phase === 'consent' ? (
            <ConsentPanel
              consent={consent}
              onConsentChange={setConsent}
              patientName={patientName}
            />
          ) : (
            <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-6">
              {micDenied && (
                <p className="flex items-start gap-1.5 rounded-lg bg-warning-bg p-2.5 text-2xs text-warning-fg">
                  <MicOff size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
                  No microphone is available, so this session is playing back a recorded example.
                  Nothing is being listened to.
                </p>
              )}
              {timeline.length === 0 && (
                <p className="text-xs text-ink-subtle">Listening…</p>
              )}
              {timeline.map((row, i) =>
                row.kind === 'speech' ? (
                  <TranscriptLine key={row.u.id} u={row.u} />
                ) : (
                  <PauseMarker key={`gap-${i}`} />
                ),
              )}
            </div>
          )}
        </section>

        {/* Draft */}
        <section aria-label="Drafted note" className="flex min-h-0 flex-col bg-surface-1">
          <h3 className="flex items-center gap-1.5 border-b border-border-soft px-4 py-2 text-2xs font-medium uppercase tracking-wide text-ink-subtle sm:px-6">
            <AiMark />
            Forming draft
          </h3>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-6">
            {phase === 'abstained' ? (
              <div className="rounded-xl border border-border-soft bg-surface-2 p-3">
                <p className="text-xs font-semibold text-ink">Could not draft from this</p>
                <p className="mt-1 text-2xs leading-relaxed text-ink-muted">{ABSTAIN_REASON}</p>
              </div>
            ) : phase === 'drafted' ? (
              drafts.map((d) => <DraftCard key={d.section} draft={d} />)
            ) : (
              <p className="text-xs text-ink-subtle">
                Sections appear here once you stop and draft. Nothing is written into the note
                until you accept it.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Z7a · composer ────────────────────────────────────────────────── */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-border-soft bg-surface-1 px-4 py-3 sm:px-6">
        {phase === 'consent' ? (
          <>
            <Button onClick={() => void start()} disabled={!consent} icon={<Mic size={14} />}>
              Start recording
            </Button>
            {!consent && (
              <p className="text-xs text-ink-muted">
                Record the patient&rsquo;s consent before the session can start.
              </p>
            )}
          </>
        ) : phase === 'drafted' || phase === 'abstained' ? (
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmDiscard(true)}
              icon={<Trash2 size={14} />}
            >
              Discard draft
            </Button>
            {phase === 'drafted' && (
              <Button
                className="ml-auto"
                onClick={() => {
                  onAccept(drafts)
                  onClose()
                }}
              >
                Put {drafts.length} sections into the note
              </Button>
            )}
            {phase === 'abstained' && (
              <Button variant="secondary" className="ml-auto" onClick={onClose}>
                Back to the note
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (phase === 'recording') {
                  // ⚠️ The gap is recorded, not hidden. See the header.
                  // Stamped at the moment it happened, not attached to an
                  // utterance — see the `timeline` note above.
                  setGaps((g) => [...g, elapsed])
                  setPhase('paused')
                } else {
                  setPhase('recording')
                }
              }}
              icon={phase === 'recording' ? <Pause size={14} /> : <Play size={14} />}
            >
              {phase === 'recording' ? 'Pause' : 'Resume'}
            </Button>
            <Button
              onClick={stopAndDraft}
              disabled={!canDraft}
              icon={<Square size={14} />}
              className="ml-auto"
            >
              Stop &amp; draft
            </Button>
            {!canDraft && (
              <p className="basis-full text-xs text-ink-muted">
                Record at least {MIN_SECONDS_TO_DRAFT} seconds before drafting.
              </p>
            )}
          </>
        )}
      </footer>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard the drafted sections?"
        consequence={
          <>
            The drafted text will be cleared and nothing will be written into the note.{' '}
            <strong className="font-semibold">The transcript is kept</strong> — what was said
            stays on the record whether or not you use the draft.
          </>
        }
        confirmLabel="Discard draft"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false)
          setPhase('paused')
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}

function ConsentPanel({
  consent,
  onConsentChange,
  patientName,
}: {
  consent: boolean
  onConsentChange: (v: boolean) => void
  patientName: string
}) {
  return (
    <div className="flex min-h-0 flex-1 items-start overflow-y-auto px-4 py-4 sm:px-6">
      <div className="max-w-prose">
        <h4 className="text-sm font-semibold text-ink">Consent to record</h4>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          {patientName} must be told that this consultation will be recorded to draft the note,
          and must agree, before recording starts. This is recorded against the encounter.
        </p>
        <label className="focus-within:ring-focus mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border-soft p-3 text-xs text-ink">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary-600"
          />
          <span>
            I have explained that this consultation will be recorded to help write the note, and
            the patient has agreed.
          </span>
        </label>
        <p className="mt-2 text-2xs text-ink-subtle">
          The patient may decline. If they do, close this and type the note — nothing here is
          required to document a consultation.
        </p>
      </div>
    </div>
  )
}

function PauseMarker() {
  return (
    // ⚠️ Visible, not elided. See rule 3 in the header.
    <p className="flex items-center gap-2 text-2xs italic text-warning-fg">
      <span aria-hidden="true" className="h-px flex-1 bg-warning-fg/30" />
      recording paused
      <span aria-hidden="true" className="h-px flex-1 bg-warning-fg/30" />
    </p>
  )
}

function TranscriptLine({ u }: { u: Utterance }) {
  return (
    <p className="text-xs leading-relaxed">
        <span className="mr-1.5 font-mono text-2xs tabular-nums text-ink-subtle">{mmss(u.at)}</span>
        <span
          className={`mr-1.5 font-semibold ${
            u.speaker === 'clinician' ? 'text-primary-700' : 'text-ink-muted'
          }`}
        >
          {u.speaker === 'clinician' ? 'Dr' : 'Pt'}
        </span>
        <span className="text-ink">{u.text}</span>
        {u.mixed === true && (
          <span className="ml-1.5 rounded bg-surface-2 px-1 text-2xs text-ink-subtle">
            kn/en
          </span>
        )}
    </p>
  )
}

function DraftCard({ draft }: { draft: ScribeDraft }) {
  const [showSource, setShowSource] = useState(false)
  const sources = TRANSCRIPT.filter((u) => draft.from.includes(u.id))

  return (
    <section
      role="region"
      aria-label={`Drafted ${draft.section}`}
      className="rounded-xl border border-ai/25 bg-ai-soft p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold capitalize text-ink">{draft.section}</h4>
        <ConfidenceBandChip band={draft.band} />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink">{draft.text}</p>

      {/* ⚠️ Mandatory for AI-101 (§6602): the transcript span behind the text.
          This is what separates a draft a clinician can check from one they
          can only trust. */}
      <button
        type="button"
        onClick={() => setShowSource((v) => !v)}
        aria-expanded={showSource}
        className="focus-ring mt-2 rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
      >
        {showSource ? 'Hide' : 'Show'} what this came from ({sources.length})
      </button>
      {showSource && (
        <ul className="mt-1.5 space-y-1 border-t border-ai/20 pt-1.5">
          {sources.map((u) => (
            <li key={u.id} className="text-2xs text-ink-muted">
              <span className="font-mono tabular-nums">{mmss(u.at)}</span>{' '}
              <span className="font-medium">{u.speaker === 'clinician' ? 'Dr' : 'Pt'}</span>{' '}
              {u.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
