import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react'
import { Link } from 'react-router-dom'
import { Maximize2, Plus, Send, X } from 'lucide-react'
import AssistantMark from './AssistantMark'
import { Spinner } from '../feedback/States'
import MessageBubble from './MessageBubble'
import type { AiChat } from './useAiChat'
import { CHAT_SUGGESTIONS } from './suggestions'

/**
 * The assistant panel, opened from the corner button.
 *
 * NON-MODAL on purpose: a patient asks about the page they are reading
 * ("what does this lab result mean?"), so the page stays usable.
 *
 * - DOCKED (1024px and up): a full-height column on the right, below the
 *   header, with the page narrowed beside it. A complementary landmark, not
 *   a dialog. Esc closes it only while focus is inside it, so Esc on the page
 *   still belongs to the page. A source link keeps it open: the page changes
 *   beside it.
 * - Narrower: there is no room beside it, so it covers the page below the
 *   header (the header, with Emergency, stays reachable): the whole width on
 *   a phone, a sheet over a dimmed page on a tablet. A source link closes it,
 *   since the page it opens would be underneath.
 *
 * Either way, closing hands focus back to the corner button.
 */
export default function ChatPanel({
  chat,
  docked,
  initialDraft = '',
  onClose,
}: {
  chat: AiChat
  docked: boolean
  /** A question to start from (an insight bubble's) — in the box, not sent. */
  initialDraft?: string
  onClose: () => void
}): ReactElement {
  const [draft, setDraft] = useState(initialDraft)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  // Typed as the narrower element so the same ref fits the <aside> and the <div>.
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = inputRef.current
    el?.focus()
    // A pre-filled question: the caret after it, ready to send or change.
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const active = document.activeElement
      const inside = active !== null && panelRef.current?.contains(active) === true
      // Covering the page, the panel is all there is to dismiss — unless focus
      // is up in the header, whose menus close on Esc themselves.
      const covering = !docked && (active === null || active === document.body)
      if (inside || covering) {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [docked, onClose])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chat.messages.length, chat.sending])

  useLayoutEffect(() => {
    const el = inputRef.current
    if (el === null) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [draft])

  const submit = async (text: string): Promise<void> => {
    if (text.trim() === '') return
    setDraft('')
    const ok = await chat.send(text)
    if (!ok) setDraft(text)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit(draft)
    }
  }

  // Below the header in every layout; z-20 keeps the header's own menus
  // (z-30) opening over it, and page overlays (z-50) above both.
  const place = 'fixed bottom-0 right-0 top-[var(--app-header-h)] z-20 flex flex-col bg-surface-1'
  const body = (
    <>
      {/* A div, not <header>: outside a sectioning element <header> is a page
          banner, and the page already has one. */}
      <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border-soft px-4 py-3">
        <span aria-hidden="true" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-sky text-accent-sky-fg">
          <AssistantMark size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ai-chat-title" className="truncate text-sm font-semibold text-ink">
            {chat.conversationId === null ? 'Ask about your health' : chat.title || 'Conversation'}
          </h2>
          <p className="truncate text-2xs text-ink-subtle">From your record · not a doctor</p>
        </div>
        {chat.conversationId !== null && (
          <button
            type="button"
            onClick={chat.startNew}
            aria-label="Start a new chat"
            title="New chat"
            className="focus-ring tap-target rounded-lg text-ink-muted hover:bg-surface-2"
          >
            <Plus size={17} aria-hidden="true" />
          </button>
        )}
        <Link
          to={chat.conversationId === null ? '/app/ai-insights' : `/app/ai-insights?c=${chat.conversationId}`}
          onClick={onClose}
          aria-label="Open in AI Insights"
          title="Open full view"
          className="focus-ring tap-target hidden rounded-lg text-ink-muted hover:bg-surface-2 sm:inline-flex"
        >
          <Maximize2 size={16} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI chat"
          className="focus-ring tap-target -mr-1.5 rounded-lg text-ink-muted hover:bg-surface-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {chat.loading && (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}
        {!chat.loading && chat.messages.length === 0 && (
          <div className="pt-2">
            <p className="text-sm font-semibold text-ink">What would you like to know?</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Ask about your appointments, medicines, lab results, scans or visits — or a general health question.
            </p>
            <ul className="mt-4 space-y-1.5">
              {CHAT_SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void submit(s)}
                    className="focus-ring min-h-11 w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!chat.loading &&
          chat.messages.map((m) => (
            <MessageBubble key={m.id} m={m} onNavigate={docked ? undefined : onClose} compact />
          ))}
        {chat.sending && (
          <p className="flex items-center gap-2 text-xs text-ink-subtle" role="status">
            <Spinner size={12} /> Looking through your record…
          </p>
        )}
        <div ref={endRef} />
      </div>

      {chat.error !== '' && (
        <p role="alert" className="mx-4 mb-2 rounded-lg bg-critical-bg px-3 py-2 text-xs text-critical-fg">{chat.error}</p>
      )}

      <form
        onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void submit(draft) }}
        className="safe-bottom flex-shrink-0 border-t border-border-soft p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-2 p-1.5 focus-within:border-border-strong">
          <label htmlFor="ai-chat-question" className="sr-only">Ask a question about your health</label>
          <textarea
            id="ai-chat-question"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question…"
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle"
          />
          <button
            type="submit"
            disabled={draft.trim() === '' || chat.sending}
            aria-label="Send question"
            className="focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {chat.sending ? <Spinner size={14} /> : <Send size={15} aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-2 text-2xs leading-snug text-ink-subtle">
          It never diagnoses or changes a medicine. For anything urgent, call 108.
        </p>
      </form>
    </>
  )

  if (docked) {
    return (
      <aside
        ref={panelRef}
        aria-labelledby="ai-chat-title"
        data-testid="ai-chat-panel"
        data-docked="true"
        data-print="hide"
        className={`${place} w-[var(--chat-dock-w)] border-l border-border-soft motion-safe:animate-[dockIn_200ms_var(--ease-premium)]`}
      >
        {body}
      </aside>
    )
  }

  return (
    <>
      {/* Tablet: the page is dimmed, not hidden; a tap on it closes the sheet. */}
      <button
        type="button"
        aria-label="Close AI chat"
        tabIndex={-1}
        onClick={onClose}
        data-print="hide"
        className="fixed inset-x-0 bottom-0 top-[var(--app-header-h)] z-20 hidden cursor-default bg-scrim motion-safe:animate-[fadeIn_150ms_ease-out] sm:block"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="ai-chat-title"
        data-testid="ai-chat-panel"
        data-docked="false"
        data-print="hide"
        className={`${place} w-full sm:w-[26.25rem] sm:border-l sm:border-border-soft sm:shadow-card-lg motion-safe:sm:animate-[dockIn_200ms_var(--ease-premium)]`}
      >
        {body}
      </div>
    </>
  )
}
