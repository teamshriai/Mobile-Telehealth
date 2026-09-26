import { useCallback, useEffect, useRef, useState } from 'react'
import * as aiService from '../../services/ai.service'
import type { AiMessage } from '../../types/domain'
import type { ApiError } from '../../types/api'

/**
 * One conversation with the assistant: open, send, start over.
 *
 * The question appears straight away (optimistic) and the server's thread
 * replaces it on reply — the server stays the source of truth for what was
 * said. A failed send puts the question back in the composer instead of
 * losing it.
 *
 * `persistKey` keeps the active conversation across page changes for the
 * floating chat (sessionStorage — this tab only, gone when it closes). It is
 * a convenience: storage that is blocked or full is simply ignored.
 */

function readStored(key: string | undefined): string | null {
  if (key === undefined) return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string | undefined, value: string | null): void {
  if (key === undefined) return
  try {
    if (value === null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, value)
  } catch {
    /* storage unavailable — nothing to keep */
  }
}

export interface AiChat {
  conversationId: string | null
  title: string
  messages: AiMessage[]
  sending: boolean
  loading: boolean
  error: string
  setError: (message: string) => void
  /** Resolves true when sent; false when it failed (the text is handed back). */
  send: (text: string) => Promise<boolean>
  open: (id: string) => Promise<void>
  startNew: () => void
}

export function useAiChat(options: { persistKey?: string; onSent?: (conversationId: string) => void } = {}): AiChat {
  const { persistKey, onSent } = options
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)

  const open = useCallback(
    async (id: string) => {
      setLoading(true)
      setError('')
      try {
        const c = await aiService.getConversation(id)
        setConversationId(c.id)
        setTitle(c.title)
        setMessages(c.messages)
        writeStored(persistKey, c.id)
      } catch (err) {
        // A stored conversation that no longer exists is not an error to show.
        if (readStored(persistKey) === id) writeStored(persistKey, null)
        else setError((err as ApiError).message || 'Could not open that conversation.')
        setConversationId(null)
        setMessages([])
      } finally {
        setLoading(false)
      }
    },
    [persistKey],
  )

  useEffect(() => {
    const stored = readStored(persistKey)
    if (stored !== null) void open(stored)
  }, [persistKey, open])

  const startNew = useCallback(() => {
    setConversationId(null)
    setTitle('')
    setMessages([])
    setError('')
    writeStored(persistKey, null)
  }, [persistKey])

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const content = text.trim()
      if (content === '' || busy.current) return false
      busy.current = true
      setError('')
      setSending(true)
      const optimistic: AiMessage = {
        id: `tmp-${Date.now()}`,
        role: 'User',
        content,
        isPlaceholder: false,
        kind: 'Model',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimistic])
      try {
        const res = await aiService.sendMessage(content, conversationId)
        setMessages(res.messages)
        if (res.conversationId !== conversationId) {
          setConversationId(res.conversationId)
          setTitle(content.length > 60 ? `${content.slice(0, 57)}…` : content)
        }
        writeStored(persistKey, res.conversationId)
        onSent?.(res.conversationId)
        return true
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setError((err as ApiError).message || 'Could not send that. Please try again.')
        return false
      } finally {
        busy.current = false
        setSending(false)
      }
    },
    [conversationId, persistKey, onSent],
  )

  return { conversationId, title, messages, sending, loading, error, setError, send, open, startNew }
}
