import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { Maximize2, Plus, Send, Sparkles, X } from 'lucide-react'
import { Spinner } from '../feedback/States'
import MessageBubble from './MessageBubble'
import type { AiChat } from './useAiChat'
import { CHAT_SUGGESTIONS } from './suggestions'

/**
 * The floating assistant panel, opened from the corner button.
 *
 * NON-MODAL on purpose: a patient asks about the page they are reading
 * ("what does this lab result mean?"), so the page stays visible and usable
 * beside the panel from 640px up. On a phone there is no room beside it, so
 * it covers the screen. Either way Esc closes it and focus returns to the
 * button that opened it.
 */


export default function ChatPanel({ chat, onClose }: { chat: AiChat; onClose: () => void }): ReactElement {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ai-chat-title"
      data-testid="ai-chat-panel"
      className="fixed inset-0 z-50 flex flex-col bg-surface-1 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-7rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-border-soft sm:shadow-card-lg"
    >
      <header className="flex flex-shrink-0 items-center gap-2.5 border-b border-border-soft px-4 py-3">
        <span aria-hidden="true" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-sky text-accent-sky-fg">
          <Sparkles size={15} />
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
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
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
                    className="focus-ring w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!chat.loading && chat.messages.map((m) => <MessageBubble key={m.id} m={m} onNavigate={onClose} compact />)}
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
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle"
          />
          <button
            type="submit"
            disabled={draft.trim() === '' || chat.sending}
            aria-label="Send question"
            className="focus-ring flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {chat.sending ? <Spinner size={14} /> : <Send size={15} aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-2 text-2xs leading-snug text-ink-subtle">
          It never diagnoses or changes a medicine. For anything urgent, call 108.
        </p>
      </form>
    </div>
  )
}
