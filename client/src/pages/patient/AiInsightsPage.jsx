import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Sparkles, Send, Plus, MessageSquare, Trash2, Info, X, PanelLeft,
  Search, Pencil, Check, Copy, ArrowDown,
} from 'lucide-react'
import * as aiService from '../../services/ai.service'
import { Banner, Spinner } from '../../components/feedback/States.jsx'

/**
 * AI Insights.
 *
 * Conversations are persisted (server/src/ai). The model is NOT connected yet:
 * every assistant turn is stored and shown as an explicit placeholder rather
 * than invented prose. navigation.js records that the previous assistant was
 * removed from this product for "canned replies presented as clinical
 * reassurance" — writing fabricated answers into a permanent transcript would
 * be a worse version of that, so the placeholder stays until a real model is
 * behind it.
 *
 * Geometry note: radii here are deliberately tighter than the rest of the
 * portal (12px panels, 8px controls, against the app's 16-20px cards). A
 * working tool that someone types into all day should read as precise rather
 * than soft; the softer radius elsewhere suits content cards, not a console.
 */

const SUGGESTIONS = [
  'Summarise my most recent report',
  'What is Clopidogrel for?',
  'What do my blood pressure readings mean?',
  'What should I ask at my next appointment?',
]

const DAY = 86_400_000

function timeOfDay(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

/** Clock time for today, a date for anything older — a bare "4:20 pm" on a
 *  three-week-old chat tells you nothing about when it happened. */
function listStamp(iso) {
  const then = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (then.getTime() >= startOfToday) return timeOfDay(iso)
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Buckets the history the way people actually look for a past chat —
 *  by "roughly when", not by an exact date they will not remember. */
function groupConversations(list) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const buckets = [
    { key: 'today', label: 'Today', items: [] },
    { key: 'yesterday', label: 'Yesterday', items: [] },
    { key: 'week', label: 'Previous 7 days', items: [] },
    { key: 'older', label: 'Older', items: [] },
  ]
  for (const c of list) {
    const t = new Date(c.updatedAt).getTime()
    if (t >= startOfToday) buckets[0].items.push(c)
    else if (t >= startOfToday - DAY) buckets[1].items.push(c)
    else if (t >= startOfToday - 7 * DAY) buckets[2].items.push(c)
    else buckets[3].items.push(c)
  }
  return buckets.filter((b) => b.items.length > 0)
}

export default function AiInsightsPage() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeTitle, setActiveTitle] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [atBottom, setAtBottom] = useState(true)

  const scrollRef = useRef(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const renameRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await aiService.listConversations())
    } catch {
      // A failing history list must not block asking a new question.
      setConversations([])
    }
  }, [])

  useEffect(() => { void loadConversations() }, [loadConversations])

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  useEffect(() => {
    if (messages.length > 0 && atBottom) scrollToBottom()
  }, [messages, atBottom, scrollToBottom])

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.select()
  }, [renamingId])

  // Auto-grow the composer instead of making people drag a resize handle.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (el === null) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  const onScroll = () => {
    const el = scrollRef.current
    if (el === null) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60)
  }

  const openConversation = async (id) => {
    setHistoryOpen(false)
    if (id === activeId) return
    setActiveId(id)
    setLoadingThread(true)
    setError('')
    try {
      const c = await aiService.getConversation(id)
      setMessages(c.messages)
      setActiveTitle(c.title)
      setAtBottom(true)
    } catch (err) {
      setError(err.message || 'Could not open that conversation.')
      setMessages([])
    } finally {
      setLoadingThread(false)
    }
  }

  const startNew = () => {
    setActiveId(null)
    setActiveTitle('')
    setMessages([])
    setError('')
    setHistoryOpen(false)
    setAtBottom(true)
    inputRef.current?.focus()
  }

  const send = async (text) => {
    const content = text.trim()
    if (content === '' || sending) return

    setError('')
    setSending(true)
    setDraft('')
    setAtBottom(true)

    // Show the question straight away; the server remains the source of truth
    // for what the thread contains and replaces this on response.
    const optimistic = {
      id: `tmp-${Date.now()}`, role: 'User', content,
      isPlaceholder: false, createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await aiService.sendMessage(content, activeId)
      setMessages(res.messages)
      if (res.conversationId !== activeId) setActiveId(res.conversationId)
      void loadConversations()
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(content)
      setError(err.message || 'Could not send that. Please try again.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const commitRename = async (id) => {
    const title = renameDraft.trim()
    setRenamingId(null)
    if (title === '') return
    const previous = conversations
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
    if (id === activeId) setActiveTitle(title)
    try {
      await aiService.renameConversation(id, title)
    } catch (err) {
      setConversations(previous)
      setError(err.message || 'Could not rename that conversation.')
    }
  }

  const confirmDelete = async (id) => {
    setConfirmDeleteId(null)
    const previous = conversations
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (id === activeId) startNew()
    try {
      await aiService.deleteConversation(id)
    } catch (err) {
      setConversations(previous)
      setError(err.message || 'Could not delete that conversation.')
    }
  }

  const copyMessage = async (m) => {
    try {
      await navigator.clipboard.writeText(m.content)
      setCopiedId(m.id)
      window.setTimeout(() => setCopiedId((cur) => (cur === m.id ? null : cur)), 1600)
    } catch {
      setError('Could not copy that message.')
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(draft)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, query])

  const groups = useMemo(() => groupConversations(filtered), [filtered])

  /* ── History panel ──────────────────────────────────────────────────── */
  const historyPanel = (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={startNew}
        className="focus-ring flex w-full min-h-11 flex-shrink-0 items-center justify-center gap-2 rounded-md bg-primary-600 px-3 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
      >
        <Plus size={15} aria-hidden="true" />
        New chat
      </button>

      <div className="relative mt-3 flex-shrink-0">
        <Search
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
        />
        <label htmlFor="ai-search" className="sr-only">Search your chats</label>
        <input
          id="ai-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="focus-ring w-full rounded-md border border-border bg-surface-2 py-2 pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-subtle"
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="px-1 py-2 text-xs text-ink-subtle">Your chats will appear here.</p>
        )}
        {conversations.length > 0 && filtered.length === 0 && (
          <p className="px-1 py-2 text-xs text-ink-subtle">No chats match “{query}”.</p>
        )}

        {groups.map((group) => (
          <div key={group.key} className="mb-3">
            <p className="px-1 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((c) => {
                const isActive = c.id === activeId
                const isRenaming = c.id === renamingId
                const isConfirming = c.id === confirmDeleteId

                if (isRenaming) {
                  return (
                    <li key={c.id} className="rounded-md bg-surface-2 p-1.5">
                      <label htmlFor={`rename-${c.id}`} className="sr-only">Rename chat</label>
                      <div className="flex items-center gap-1">
                        <input
                          id={`rename-${c.id}`}
                          ref={renameRef}
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); void commitRename(c.id) }
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          className="focus-ring min-w-0 flex-1 rounded border border-border bg-surface-1 px-2 py-1.5 text-sm text-ink"
                        />
                        <button
                          type="button"
                          onClick={() => void commitRename(c.id)}
                          aria-label="Save name"
                          className="focus-ring tap-target rounded text-success-fg"
                        >
                          <Check size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                }

                return (
                  <li key={c.id}>
                    <div
                      className={`group relative flex items-stretch rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary-50 ring-1 ring-primary-200'
                          : 'hover:bg-surface-2'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void openConversation(c.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className="focus-ring flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left"
                      >
                        <MessageSquare
                          size={13}
                          aria-hidden="true"
                          className={`flex-shrink-0 ${isActive ? 'text-primary-700' : 'text-ink-subtle'}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm ${
                              isActive ? 'font-semibold text-primary-700' : 'text-ink'
                            }`}
                          >
                            {c.title}
                          </span>
                          <span className="block text-2xs text-ink-subtle">
                            {listStamp(c.updatedAt)} · {c.messageCount} messages
                          </span>
                        </span>
                      </button>

                      {/* Always rendered, not hover-revealed: hover does not
                          exist on a touch screen, which is most of these users. */}
                      <span className="flex flex-shrink-0 items-center gap-0.5 pr-1">
                        <button
                          type="button"
                          onClick={() => { setRenameDraft(c.title); setConfirmDeleteId(null); setRenamingId(c.id) }}
                          aria-label={`Rename chat: ${c.title}`}
                          className="focus-ring rounded p-1.5 text-ink-subtle/70 transition-colors hover:bg-surface-3 hover:text-ink"
                        >
                          <Pencil size={13} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRenamingId(null); setConfirmDeleteId(isConfirming ? null : c.id) }}
                          aria-label={`Delete chat: ${c.title}`}
                          aria-expanded={isConfirming}
                          className="focus-ring rounded p-1.5 text-ink-subtle/70 transition-colors hover:bg-surface-3 hover:text-critical-fg"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      </span>
                    </div>

                    {/* Deleting a transcript is not undoable, so it asks. */}
                    {isConfirming && (
                      <div className="mt-1 rounded-md border border-critical-fg/30 bg-critical-bg p-2">
                        <p className="text-xs text-critical-fg">Delete this chat?</p>
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void confirmDelete(c.id)}
                            className="focus-ring rounded bg-critical-fg px-2.5 py-1.5 text-xs font-semibold text-on-danger transition-opacity hover:opacity-90"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="focus-ring rounded border border-border bg-surface-1 px-2.5 py-1.5 text-xs font-medium text-ink-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )

  const panelHeight = { height: 'min(calc(100vh - 13rem), 46rem)' }

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="focus-ring tap-target rounded-md border border-border bg-surface-1 px-3 text-ink-muted lg:hidden"
          aria-label="Show chat history"
        >
          <PanelLeft size={16} aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            AI Insights
            <span className="rounded bg-warning-bg px-1.5 py-0.5 text-xs font-semibold text-warning-fg">
              Preview
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Ask about your reports, medicines and recovery.
          </p>
        </div>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <div className="flex gap-4">
        {/* ── History: a column at lg, a sheet below ── */}
        <aside
          className="hidden w-72 flex-shrink-0 rounded-lg border border-border bg-surface-1 p-3 shadow-card lg:block xl:w-80"
          style={panelHeight}
          aria-label="Chat history"
        >
          {historyPanel}
        </aside>

        {historyOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close chat history"
              onClick={() => setHistoryOpen(false)}
              className="absolute inset-0 bg-scrim"
            />
            <div className="absolute left-0 top-0 flex h-full w-[86vw] max-w-xs flex-col border-r border-border bg-surface-1 p-3">
              <div className="mb-2 flex flex-shrink-0 items-center justify-between">
                <p className="text-sm font-semibold text-ink">Chat history</p>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close chat history"
                  className="focus-ring tap-target rounded-md text-ink-subtle"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{historyPanel}</div>
            </div>
          </div>
        )}

        {/* ── Conversation ── */}
        <section
          aria-label="Conversation"
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-1 shadow-card"
          style={panelHeight}
        >
          {/* Thread header — orients you when returning to an old chat. */}
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border-soft px-4 py-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent-sky text-accent-sky-fg"
            >
              <Sparkles size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {activeId === null ? 'New chat' : activeTitle}
              </p>
              <p className="text-2xs text-ink-subtle">
                {activeId === null
                  ? 'Not connected yet — your questions are saved'
                  : `${messages.length} messages`}
              </p>
            </div>
            {activeId !== null && (
              <button
                type="button"
                onClick={startNew}
                className="focus-ring hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 sm:inline-flex"
              >
                <Plus size={13} aria-hidden="true" />
                New
              </button>
            )}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="relative flex-1 space-y-5 overflow-y-auto p-4 sm:px-5"
          >
            {loadingThread && (
              <div className="flex justify-center py-10"><Spinner /></div>
            )}

            {!loadingThread && messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span
                  aria-hidden="true"
                  className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-accent-sky text-accent-sky-fg"
                >
                  <Sparkles size={20} />
                </span>
                <p className="text-sm font-semibold text-ink">What would you like to know?</p>
                <p className="mt-1 max-w-sm text-xs text-ink-subtle">
                  Your questions are saved to your account so you can come back to them.
                </p>
                <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => void send(s)}
                        className="focus-ring rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loadingThread &&
              messages.map((m) => {
                const isUser = m.role === 'User'
                return (
                  <div key={m.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && (
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent-sky text-accent-sky-fg"
                      >
                        <Sparkles size={13} />
                      </span>
                    )}

                    <div className={`group/msg min-w-0 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
                      <p
                        className={`whitespace-pre-wrap break-words px-3.5 py-2.5 text-sm leading-relaxed ${
                          isUser
                            ? 'rounded-lg rounded-br-sm bg-primary-600 text-on-primary'
                            : 'rounded-lg rounded-bl-sm bg-surface-2 text-ink-muted'
                        }`}
                      >
                        {m.content}
                      </p>

                      <div
                        className={`mt-1 flex items-center gap-2 px-0.5 ${isUser ? 'justify-end' : ''}`}
                      >
                        <span className="text-2xs text-ink-subtle">
                          {m.createdAt ? timeOfDay(m.createdAt) : 'Sending…'}
                        </span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => void copyMessage(m)}
                            aria-label="Copy this reply"
                            className="focus-ring rounded p-0.5 text-ink-subtle transition-colors hover:text-ink"
                          >
                            {copiedId === m.id
                              ? <Check size={12} aria-hidden="true" className="text-success-fg" />
                              : <Copy size={12} aria-hidden="true" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            <div ref={endRef} />
          </div>

          {/* Jump back down — only when it is actually useful. */}
          {!atBottom && messages.length > 0 && (
            <div className="pointer-events-none relative">
              <button
                type="button"
                onClick={() => scrollToBottom()}
                className="focus-ring pointer-events-auto absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-xs font-medium text-ink-muted shadow-card-md"
              >
                <ArrowDown size={13} aria-hidden="true" />
                Latest
              </button>
            </div>
          )}

          {/* ── Composer ── */}
          <form
            onSubmit={(e) => { e.preventDefault(); void send(draft) }}
            className="flex-shrink-0 border-t border-border-soft p-3"
          >
            <div className="flex items-end gap-2 rounded-lg border border-border bg-surface-2 p-1.5 focus-within:border-border-strong">
              <label htmlFor="ai-question" className="sr-only">Ask a question about your care</label>
              <textarea
                id="ai-question"
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question…"
                className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle"
              />
              <button
                type="submit"
                disabled={draft.trim() === '' || sending}
                aria-label="Send question"
                className="focus-ring flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary-600 text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? <Spinner size={14} /> : <Send size={15} aria-hidden="true" />}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <details className="min-w-0">
                <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-2xs text-ink-subtle hover:text-ink-muted">
                  <Info size={11} aria-hidden="true" />
                  Not connected yet — what this can and cannot do
                </summary>
                <div className="mt-2 space-y-1.5 rounded-md bg-surface-2 p-2.5 text-xs leading-relaxed text-ink-muted">
                  <p>
                    Your questions are saved, but no model is answering them yet. Once it is
                    switched on it will read only your own records — reports, medicines, health
                    history and care-team notes.
                  </p>
                  <p className="text-critical-fg">
                    It will never diagnose you, judge whether a symptom is serious, or change a
                    medicine. For anything urgent, contact your care team or call 108.
                  </p>
                </div>
              </details>
              <span className="text-2xs text-ink-subtle">Enter to send · Shift + Enter for a line break</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
