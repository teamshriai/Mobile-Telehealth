import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Plus, User, Menu, X } from 'lucide-react'
import { mockConversations } from '../data/mockAI.js'
import { LoadingDots } from '../components/common/Loader.jsx'

const GENERIC_REPLIES = [
  "That's a good question — based on your latest NIHSS trend and care plan, everything points toward steady recovery. I'd confirm the specifics with Dr. Nair at your next visit.",
  "I've noted that in the context of your case. Your current medications and rehab schedule are designed to support exactly this kind of progress — let your care team know if anything changes.",
  "Based on your recovery profile so far, that's consistent with what we'd expect. If symptoms change suddenly, use the emergency alert on your dashboard right away.",
]

function generateReply() {
  return GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)]
}

/* Groups conversations into Today / Yesterday / Earlier, relative to the
   most recently updated conversation rather than the real device date —
   these are illustrative mock dates, same convention the rest of the app's
   mock data already uses. */
function groupConversations(conversations) {
  const sorted = [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  const startOfDay = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x.getTime()
  }
  const referenceDay = sorted.length ? startOfDay(sorted[0].updatedAt) : startOfDay(new Date())
  const yesterday = referenceDay - 86400000

  const groups = { Today: [], Yesterday: [], Earlier: [] }
  sorted.forEach((c) => {
    const day = startOfDay(c.updatedAt)
    if (day === referenceDay) groups.Today.push(c)
    else if (day === yesterday) groups.Yesterday.push(c)
    else groups.Earlier.push(c)
  })
  return groups
}

function renderContent(text) {
  return text.split('\n').map((line, i) => (
    <p key={i} className={i > 0 ? 'mt-2' : ''}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : <span key={j}>{part}</span>
      )}
    </p>
  ))
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-[#2563EB] text-white' : 'bg-[#EDE9FE] text-[#7C3AED]'
        }`}
      >
        {isUser ? <User size={13} /> : <Sparkles size={13} />}
      </span>
      <div
        className={`max-w-[78%] sm:max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-[#2563EB] text-white' : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E8EDF2]'
        }`}
      >
        {renderContent(message.content)}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
        <Sparkles size={13} />
      </span>
      <div className="rounded-xl px-3.5 py-3 bg-[#F8FAFC] border border-[#E8EDF2]">
        <LoadingDots color="#7C3AED" />
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [conversations, setConversations] = useState(mockConversations)
  const [activeId, setActiveId] = useState(mockConversations[0].id)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimerRef = useRef(null)

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const groups = groupConversations(conversations)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length, isTyping])

  useEffect(() => () => clearTimeout(typingTimerRef.current), [])

  const handleNewConversation = () => {
    const newConv = {
      id: `conv-${Date.now()}`,
      title: 'New conversation',
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveId(newConv.id)
    setHistoryOpen(false)
  }

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text || !active) return

    const userMsg = { id: `m-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              title: c.messages.length === 0 ? text.slice(0, 48) : c.title,
              updatedAt: userMsg.timestamp,
            }
          : c
      )
    )
    setInputValue('')
    setIsTyping(true)

    typingTimerRef.current = setTimeout(() => {
      const reply = { id: `m-${Date.now() + 1}`, role: 'assistant', content: generateReply(), timestamp: new Date().toISOString() }
      setConversations((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, reply] } : c))
      )
      setIsTyping(false)
    }, 1100)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] min-h-[420px] gap-4">
      {/* Mobile history backdrop */}
      {historyOpen && (
        <button
          type="button"
          aria-label="Close conversation history"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* History sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 max-w-[85vw] flex-shrink-0 flex flex-col
                    bg-white border border-[#E8EDF2] lg:rounded-xl
                    transition-transform duration-300 lg:translate-x-0
                    ${historyOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#E8EDF2] flex-shrink-0">
          <span className="text-sm font-bold text-[#0F172A]">Conversations</span>
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E8EDF2]
                       px-3 py-2 text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
          >
            <Plus size={14} /> New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
          {Object.entries(groups).filter(([, items]) => items.length > 0).map(([label, items]) => (
            <div key={label}>
              <p className="px-1 mb-1.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest">
                {label}
              </p>
              <div className="space-y-0.5">
                {items.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setActiveId(c.id); setHistoryOpen(false) }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs truncate transition-colors ${
                      c.id === activeId
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-[#E8EDF2] bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#E8EDF2] flex-shrink-0">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Open conversation history"
          >
            <Menu size={16} />
          </button>
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED]">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0F172A] truncate">{active?.title || 'Stroke AI Assistant'}</p>
            <p className="text-[11px] text-[#94A3B8]">Stroke AI</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {(active?.messages ?? []).length === 0 && !isTyping && (
            <div className="h-full flex items-center justify-center text-center px-6">
              <div className="max-w-xs">
                <Sparkles size={22} className="mx-auto mb-2 text-[#CBD5E1]" />
                <p className="text-sm text-[#94A3B8]">
                  Ask about your recovery, medications, or upcoming care — I have access to your care record.
                </p>
              </div>
            </div>
          )}
          {active?.messages.map((m) => <MessageBubble key={m.id} message={m} />)}
          {isTyping && <TypingBubble />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#E8EDF2] p-3 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Stroke AI..."
              className="flex-1 resize-none rounded-xl border border-[#E8EDF2] px-3.5 py-2.5 text-sm
                         text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-colors
                         focus:border-[#93C5FD] focus:ring-4 focus:ring-[#2563EB]/10 max-h-[120px]"
              style={{ minHeight: '44px' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                inputValue.trim()
                  ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                  : 'bg-[#F1F5F9] text-[#CBD5E1] cursor-not-allowed'
              }`}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="mt-2 text-[10.5px] text-[#94A3B8]">
            AI responses are informational only — always consult your care team.
          </p>
        </div>
      </div>
    </div>
  )
}
