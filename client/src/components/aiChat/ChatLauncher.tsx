import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import ChatPanel from './ChatPanel'
import { useAiChat } from './useAiChat'

/**
 * The corner button that opens the assistant from any patient page.
 *
 * Hidden on AI Insights itself (the full view is already there). Above the
 * phone bottom bar below 768px — white there, so it does not compete with
 * the bar's own round voice-note button — and solid in the corner from
 * 768px up. The button stays mounted while the panel is open (just not
 * visible), so closing can hand focus straight back to it.
 */
export default function ChatLauncher(): ReactElement | null {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const wasOpen = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const chat = useAiChat({ persistKey: 'shri-health.ai-chat' })
  const onAiInsights = location.pathname.startsWith('/app/ai-insights')

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // Leaving for the full view closes the panel.
  useEffect(() => {
    if (onAiInsights) setOpen(false)
  }, [onAiInsights])

  if (onAiInsights) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI chat"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="ai-chat-launcher"
        className={`focus-ring fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-1 text-primary-700 shadow-card-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6 md:border-transparent md:bg-primary-600 md:text-on-primary ${
          open ? 'invisible' : ''
        }`}
      >
        <MessageCircle size={24} aria-hidden="true" />
      </button>
      {open && <ChatPanel chat={chat} onClose={close} />}
    </>
  )
}
