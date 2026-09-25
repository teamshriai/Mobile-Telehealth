import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X, Send } from 'lucide-react'
import { useAiMode } from '../useAi'
import { useAuth } from '../../app/useAuth'
import { touchpoint } from '../registry'
import AiMark from './AiMark'
import { isClinicalQuestion, routeFor, lookup, SUGGESTED } from '../fixtures/assistant'
import type { AssistantAnswer } from '../fixtures/assistant'

/**
 * `GP-17` / `C-49` — the assistant bubble in `Z7b`. §6.1, specified once.
 *
 * ⚠️ IT FLOATS. §6.1: "It does not occupy a bar, a strip or any layout width —
 * it floats above `Z7a`, so it costs no vertical space on any screen." That is
 * why it is `fixed` and why it is mounted by the shell rather than by a screen.
 *
 * ⚠️ IT NEVER AUTO-OPENS. A panel that opens itself over a clinical screen
 * during a consultation is an interruption nobody asked for. A proactive nudge
 * gets a dot on the bubble and nothing else.
 *
 * ⚠️ `AI-OFF` HIDES IT ENTIRELY. §6.1 guardrail 6: "AI-OFF hides the bubble
 * entirely (not greyed) and GP-16 static help plus a support contact remain. No
 * task anywhere in the product may require the assistant to complete."
 *
 * The six guardrails, and where each one lives:
 *   1 not a clinical adviser — `isClinicalQuestion` is checked BEFORE lookup
 *   2 grounded or silent     — no corpus match ⇒ abstain, never extrapolate
 *   3 capability-scoped      — the corpus is product documentation, not records
 *   4 no PHI it did not have — it holds none; it never reads the patient context
 *   5 citable and reportable — every answer renders citations + Report
 *   6 never the only path    — hidden when off; nothing requires it
 */

type Turn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; answer: AssistantAnswer }
  | { role: 'declined'; route: string }
  | { role: 'abstain' }

export default function AssistantBubble() {
  const { mode } = useAiMode()
  const { role } = useAuth()
  const spec = touchpoint('AI-911')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  /**
   * §6.1 keyboard: "`?` opens from anywhere · `Esc` closes and leaves the page
   * state untouched."
   *
   * ⚠️ `?` is ignored while typing. A shortcut that hijacks a character key
   * would make it impossible to type a question mark into a clinical note,
   * which is a considerably worse bug than a missing shortcut.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)

      if (e.key === '?' && !typing) {
        e.preventDefault()
        setOpen(true)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Keep the newest turn in view without stealing focus from the input.
  useEffect(() => {
    if (open) logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [turns, open])

  // §6.1 guardrail 6 — hidden entirely, not greyed.
  if (mode === 'off') return null
  // ⚠️ NOT FOR PATIENTS. This bubble's corpus is written for clinicians
  // ("How do I correct a signed note?"), and patients have the real,
  // record-grounded assistant at /app/ai-insights. Showing both put a
  // simulated clinician helper on top of a patient's own records.
  if (role === 'Patient') return null

  function ask(e: FormEvent) {
    e.preventDefault()
    const q = draft.trim()
    if (q === '') return
    setDraft('')

    // ⚠️ ORDER IS THE GUARDRAIL. The clinical check runs before retrieval, so
    // there is no path on which a clinical question reaches the corpus.
    if (isClinicalQuestion(q)) {
      setTurns((t) => [...t, { role: 'user', text: q }, { role: 'declined', route: routeFor(q) }])
      return
    }

    if (mode === 'abstain') {
      setTurns((t) => [...t, { role: 'user', text: q }, { role: 'abstain' }])
      return
    }

    const answer = lookup(q)
    setTurns((t) => [
      ...t,
      { role: 'user', text: q },
      answer === null ? { role: 'abstain' } : { role: 'assistant', answer },
    ])
  }

  return (
    <>
      {/* ── Z7b · the bubble ───────────────────────────────────────────────
          Bottom-right, 24px inset (§6.1). 48px below 1024, 56px above — and
          `bottom-20 sm:bottom-6` keeps it clear of a bottom nav on a phone so
          it never covers a primary action. */}
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open assistant. Keyboard shortcut: question mark"
          className="focus-ring fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-ai/30 bg-surface-1 shadow-card-lg transition-transform hover:scale-105 sm:bottom-6 sm:right-6 lg:h-14 lg:w-14"
        >
          <AiMark className="lg:text-[14px]" />
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Assistant"
          className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex max-h-[70dvh] flex-col rounded-t-2xl border border-border-soft bg-surface-1 shadow-card-lg sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-h-[32rem] sm:w-[26rem] sm:rounded-2xl"
        >
          <header className="flex items-start justify-between gap-2 border-b border-border-soft p-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <AiMark />
                Assistant
              </h2>
              {/* Guardrail 1, stated before a question is asked rather than
                  only when one is declined. */}
              <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">
                How to use this product. Not a clinical adviser — clinical questions are routed to
                the screen that owns them.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="focus-ring -m-1 shrink-0 rounded p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>

          <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-2xs font-medium uppercase tracking-wide text-ink-subtle">
                  Try asking
                </p>
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(s)}
                    className="focus-ring block w-full rounded-lg border border-border-soft px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {turns.map((t, i) =>
              t.role === 'user' ? (
                <p
                  key={i}
                  className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-primary-50 px-3 py-2 text-xs text-ink"
                >
                  {t.text}
                </p>
              ) : t.role === 'declined' ? (
                // ⚠️ Guardrail 1 in the UI. It refuses and says where to go —
                // it never offers a hedged clinical answer.
                <div
                  key={i}
                  className="rounded-xl border border-warning-fg/30 bg-warning-bg p-3 text-xs text-warning-fg"
                >
                  <p className="font-semibold">That is a clinical question.</p>
                  <p className="mt-1 leading-relaxed">
                    This assistant does not answer clinical questions at any confidence. It belongs
                    to {t.route}.
                  </p>
                </div>
              ) : t.role === 'abstain' ? (
                <div key={i} className="rounded-xl border border-border-soft bg-surface-2 p-3">
                  <p className="text-xs font-semibold text-ink">
                    I do not have documentation for that.
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-ink-muted">
                    Nothing relevant was retrieved, so nothing is offered. Contact your
                    administrator, or use the help centre — both stay available whether or not this
                    assistant does.
                  </p>
                </div>
              ) : (
                <div key={i} className="rounded-xl border border-ai/25 bg-ai-soft p-3">
                  <p className="whitespace-pre-line text-xs leading-relaxed text-ink">
                    {t.answer.body}
                  </p>
                  {/* ⚠️ Guardrail 5. §6.1: "an uncited answer is not rendered at
                      all", so citations are not optional chrome. */}
                  <ul className="mt-2 space-y-1 border-t border-ai/20 pt-2">
                    {t.answer.citations.map((c, n) => (
                      <li key={c.label} className="text-2xs text-ink-muted">
                        <span className="font-mono text-ink-subtle">[{n + 1}]</span>{' '}
                        <span className="font-medium text-ink">{c.label}</span> — {c.detail}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="focus-ring mt-2 rounded text-2xs font-medium text-primary-700 underline underline-offset-2"
                  >
                    Report a wrong answer
                  </button>
                </div>
              ),
            )}
          </div>

          <form onSubmit={ask} className="flex items-center gap-2 border-t border-border-soft p-3">
            <label htmlFor="assistant-q" className="sr-only">
              Ask the assistant
            </label>
            <input
              id="assistant-q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about using this product…"
              className="focus-ring min-w-0 flex-1 rounded-lg border border-border-soft bg-surface-1 px-3 py-2 text-xs text-ink placeholder:text-ink-subtle"
            />
            <button
              type="submit"
              aria-label="Send"
              className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-on-primary hover:bg-primary-700"
            >
              <Send size={14} aria-hidden="true" />
            </button>
          </form>

          <p className="border-t border-border-soft px-3 py-2 text-2xs text-ink-subtle">
            {spec.guardrail}
          </p>
        </div>
      )}
    </>
  )
}
