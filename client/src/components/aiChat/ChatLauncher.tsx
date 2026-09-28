import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import AssistantMark from './AssistantMark'
import ChatPanel from './ChatPanel'
import InsightNudge from './InsightNudge'
import { useAiChat } from './useAiChat'
import { useMediaQuery } from '../../app/useMediaQuery'

/** From here up the open chat docks beside the page instead of covering it.
 *  Keep in step with the `64rem` in index.css's DOCKED AI CHAT block. */
const DOCK_QUERY = '(min-width: 64rem)'

/**
 * The corner button that opens the assistant from any patient page.
 *
 * Hidden on AI Insights itself (the full view is already there). Above the
 * phone bottom bar below 768px — white there, so it does not compete with
 * the bar's own round voice-note button — and solid in the corner from
 * 768px up. The button stays mounted while the panel is open (just not
 * visible), so closing can hand focus straight back to it.
 *
 * From 1024px the open panel DOCKS: a full-height column on the right, below
 * the header, and the page narrows beside it (`data-chat-docked` on <html>;
 * see index.css) — nothing sits underneath it, and the patient can keep
 * reading, and moving between pages, while they ask. Narrower screens have no
 * room beside it, so there it covers the page below the header, and moving to
 * another page closes it.
 */
export default function ChatLauncher(): ReactElement | null {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  // A question from an insight bubble, waiting in the chat box (never sent).
  const [prefill, setPrefill] = useState('')
  const wasOpen = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const chat = useAiChat({ persistKey: 'shri-health.ai-chat' })
  const wide = useMediaQuery(DOCK_QUERY)
  const onAiInsights = location.pathname.startsWith('/app/ai-insights')
  const onEmergency = location.pathname.startsWith('/app/emergency')
  const docked = open && wide && !onAiInsights

  const close = useCallback(() => setOpen(false), [])
  const askFromInsight = useCallback((question: string) => {
    setPrefill(question)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // Leaving for the full view closes the panel.
  useEffect(() => {
    if (onAiInsights) setOpen(false)
  }, [onAiInsights])

  // Below the dock width the panel covers the page, so a new page (from the
  // header, the menu, a notification) closes it rather than opening hidden
  // underneath it.
  const lastPath = useRef(location.pathname)
  useEffect(() => {
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname
    if (!wide) setOpen(false)
  }, [location.pathname, wide])

  // The page makes room while docked. Cleared on close, and when the launcher
  // unmounts — which signing out does.
  useEffect(() => {
    if (!docked) return undefined
    const root = document.documentElement
    root.setAttribute('data-chat-docked', 'true')
    return () => root.removeAttribute('data-chat-docked')
  }, [docked])

  useEffect(() => {
    if (!open) return undefined
    const root = document.documentElement
    root.setAttribute('data-chat-open', 'true')
    return () => root.removeAttribute('data-chat-open')
  }, [open])

  if (onAiInsights) return null

  return (
    <>
      <InsightNudge paused={open || onEmergency} onAsk={askFromInsight} />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPrefill('')
          setOpen(true)
        }}
        aria-label="Open AI chat"
        aria-expanded={open}
        data-testid="ai-chat-launcher"
        data-print="hide"
        className={`focus-ring fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-1 text-primary-700 shadow-card-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6 md:border-transparent md:bg-primary-600 md:text-on-primary ${
          open ? 'invisible' : ''
        }`}
      >
        <AssistantMark size={30} />
      </button>
      {open && <ChatPanel chat={chat} docked={docked} initialDraft={prefill} onClose={close} />}
    </>
  )
}
