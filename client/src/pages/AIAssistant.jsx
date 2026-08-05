import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  User,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  FlaskConical,
  Pill,
  Dna,
  Calendar,
  Heart,
  Search,
  ChevronRight,
  Shield,
  TrendingUp,
  AlertTriangle,
  BookOpen,
} from 'lucide-react'
import {
  mockConversations,
  suggestedPrompts,
  aiRecommendations,
  healthSummary,
} from '../data/mockAI.js'
import { mockPatient } from '../data/mockPatients.js'
import SectionTitle from '../components/common/SectionTitle.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import { LoadingDots } from '../components/common/Loader.jsx'

/* ── Page animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

/* ── Icon map for suggested prompts ── */
const PROMPT_ICONS = {
  flask:    FlaskConical,
  pill:     Pill,
  dna:      Dna,
  calendar: Calendar,
  heart:    Heart,
  search:   Search,
}

/* ── Mock AI response generator ── */
const generateMockResponse = (query) => {
  const responses = [
    `Based on your current treatment profile and the latest clinical data, I can provide some insights on that.

Your EGFR Exon 19 deletion is one of the most favorable driver mutations in NSCLC — it's associated with excellent response to Osimertinib, which your ctDNA trend clearly confirms.

**Key points to consider:**
- Your ctDNA has decreased from 0.82% to 0.18% MAF over 12 cycles
- No acquired resistance mutations (T790M, C797S) detected
- Continued monitoring every 4–6 weeks is recommended

Is there a specific aspect you'd like me to elaborate on?`,

    `That's an important question. Let me break it down based on your specific genomic profile.

Your treatment with Osimertinib (Tagrisso) is targeting the EGFR pathway — and your data shows it's working effectively.

**Current status:**
- Treatment response: Partial Response (RECIST 1.1)
- Tumor reduction: 38% from baseline
- Side effect profile: Grade 1 only (well-tolerated)

**Recommendation:** Continue current regimen and maintain scheduled monitoring appointments.

Would you like to know more about potential next steps if resistance develops?`,

    `Great question. Based on your comprehensive genomic profile from Foundation Medicine and your current clinical data, here's what I can tell you.

Your MET Exon 14 co-alteration is being closely monitored. While it hasn't caused resistance yet, it's important to:

1. Continue serial ctDNA monitoring
2. Maintain your scheduled imaging every 3–4 months
3. Discuss the MARIPOSA-2 trial eligibility with Dr. Nair

**Confidence level:** High — based on 847 similar patient profiles in the OncoTrace database.

Is there anything specific about your treatment you'd like to discuss?`,
  ]

  return responses[Math.floor(Math.random() * responses.length)]
}

export default function AIAssistant() {
  const [messages,    setMessages]    = useState(mockConversations)
  const [inputValue,  setInputValue]  = useState('')
  const [isTyping,    setIsTyping]    = useState(false)
  const [copiedId,    setCopiedId]    = useState(null)
  const [activePanel, setActivePanel] = useState('chat')

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const chatContainerRef = useRef(null)
  const responseTimersRef = useRef([])

  /* ── Auto scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => () => {
    responseTimersRef.current.forEach((timer) => clearTimeout(timer))
  }, [])

  /* ── Send message ── */
  const handleSend = (text) => {
    const query = text || inputValue.trim()
    if (!query) return

    /* Add user message */
    const userMsg = {
      id:        `msg-${Date.now()}-user`,
      role:      'user',
      content:   query,
      timestamp: new Date().toISOString(),
      type:      'question',
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    /* Simulate AI typing delay */
    const delay = 1200 + Math.random() * 800
    const timer = setTimeout(() => {
      const aiMsg = {
        id:        `msg-${Date.now()}-ai`,
        role:      'assistant',
        content:   generateMockResponse(query),
        timestamp: new Date().toISOString(),
        type:      'answer',
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, delay)
    responseTimersRef.current.push(timer)
  }

  /* ── Handle enter key ── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── Copy message ── */
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  /* ── Clear conversation ── */
  const handleClear = () => {
    setMessages(mockConversations.slice(0, 1))
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-[1300px] mx-auto h-[calc(100vh-8rem)]
                 flex flex-col gap-0"
    >
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1
              className="text-xl font-bold text-[#0F172A]"
              style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}
            >
              AI Health Assistant
            </h1>
            <p className="text-xs text-[#64748B]">
              Powered by OncoTrace AI — Clinical context aware
            </p>
          </div>
        </div>

        {/* Panel toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-xl border border-[#E8EDF2]">
          {[
            { id: 'chat',    label: 'Chat' },
            { id: 'insights',label: 'Insights' },
            { id: 'summary', label: 'Summary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`
                px-4 py-2 rounded-lg text-xs font-semibold
                transition-all duration-200
                ${activePanel === tab.id
                  ? 'bg-white text-[#0F172A] shadow-sm border border-[#E8EDF2]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Chat panel ── */}
        <AnimatePresence mode="wait">
          {activePanel === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col min-w-0 min-h-0"
            >
              <ChatPanel
                messages={messages}
                isTyping={isTyping}
                inputValue={inputValue}
                copiedId={copiedId}
                messagesEndRef={messagesEndRef}
                chatContainerRef={chatContainerRef}
                inputRef={inputRef}
                onSend={handleSend}
                onInputChange={setInputValue}
                onKeyDown={handleKeyDown}
                onCopy={handleCopy}
                onClear={handleClear}
              />
            </motion.div>
          )}

          {activePanel === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 overflow-y-auto"
            >
              <InsightsPanel
                recommendations={aiRecommendations}
                onAskAI={(q) => {
                  setActivePanel('chat')
                  setTimeout(() => handleSend(q), 300)
                }}
              />
            </motion.div>
          )}

          {activePanel === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 overflow-y-auto"
            >
              <SummaryPanel summary={healthSummary} patient={mockPatient} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Right sidebar ── */}
        <div className="w-72 flex-shrink-0 hidden xl:flex flex-col gap-4 overflow-y-auto">
          <SuggestedPrompts
            prompts={suggestedPrompts}
            onSelect={(p) => handleSend(p.label)}
          />
          <ContextCard patient={mockPatient} />
          <DisclaimerCard />
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   CHAT PANEL
───────────────────────────────────────────── */
function ChatPanel({
  messages, isTyping, inputValue, copiedId,
  messagesEndRef, chatContainerRef, inputRef,
  onSend, onInputChange, onKeyDown, onCopy, onClear,
}) {
  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#E8EDF2] overflow-hidden"
         style={{ boxShadow: '0 4px 24px 0 rgba(15,23,42,0.08)' }}>

      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-4
                      border-b border-[#E8EDF2] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6]
                            flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                             bg-[#16A34A] border-2 border-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0F172A]">OncoTrace AI</p>
            <p className="text-[10px] text-[#94A3B8]">Clinical AI — Context aware</p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                     text-xs text-[#64748B] hover:text-[#0F172A]
                     hover:bg-[#F1F5F9] transition-all duration-200"
        >
          <RefreshCw size={12} />
          New Chat
        </button>
      </div>

      {/* Messages container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-5 px-5 py-5"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              copiedId={copiedId}
              onCopy={onCopy}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-[#E8EDF2]
                      bg-[#FAFBFC]">
        {/* Quick prompt pills */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[
            'Explain my ctDNA results',
            'Side effects to watch for',
            'My next steps',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSend(prompt)}
              className="px-3 py-1.5 rounded-full bg-white border border-[#E8EDF2]
                         text-xs text-[#64748B] font-medium whitespace-nowrap
                         hover:border-[#2563EB] hover:text-[#2563EB]
                         transition-all duration-200 flex-shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about your results, treatment, or genomic data..."
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-[#E8EDF2]
                         bg-white text-sm text-[#0F172A] placeholder-[#94A3B8]
                         resize-none focus:outline-none focus:border-[#7C3AED]
                         focus:ring-4 focus:ring-[#7C3AED]/10
                         transition-all duration-200 leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => onSend()}
            disabled={!inputValue.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center
                       flex-shrink-0 transition-all duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: inputValue.trim()
                ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
                : '#F1F5F9',
            }}
          >
            <Send
              size={15}
              className={inputValue.trim() ? 'text-white' : 'text-[#94A3B8]'}
            />
          </motion.button>
        </div>

        <p className="text-[10px] text-[#94A3B8] text-center mt-2">
          AI responses are informational only — always consult your care team.
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   CHAT MESSAGE
───────────────────────────────────────────── */
function ChatMessage({ message, copiedId, onCopy }) {
  const isAI      = message.role === 'assistant'
  const isCopied  = copiedId === message.id
  const [liked,   setLiked]   = useState(null)

  /* ── Render markdown-like bold text ── */
  const renderContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[#0F172A]">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isAI ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6]
                          flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6]
                          flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1.5 max-w-[75%] ${isAI ? '' : 'items-end'}`}>
        <div
          className={`
            px-4 py-3.5 rounded-2xl text-sm leading-relaxed
            ${isAI
              ? 'bg-[#F8FAFC] border border-[#E8EDF2] text-[#0F172A] rounded-tl-sm'
              : 'text-white rounded-tr-sm'
            }
          `}
          style={!isAI ? {
            background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
          } : {}}
        >
          {/* Format message with line breaks */}
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={`${i > 0 ? 'mt-2' : ''} leading-relaxed`}>
              {renderContent(line)}
            </p>
          ))}
        </div>

        {/* Timestamp + actions */}
        <div className={`flex items-center gap-2 px-1 ${isAI ? '' : 'flex-row-reverse'}`}>
          <span className="text-[10px] text-[#CBD5E1]">
            {new Date(message.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>

          {/* AI message actions */}
          {isAI && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onCopy(message.id, message.content)}
                className="w-5 h-5 flex items-center justify-center rounded-md
                           text-[#CBD5E1] hover:text-[#64748B] transition-colors"
              >
                <Copy size={10} />
              </button>
              <button
                onClick={() => setLiked(true)}
                className={`w-5 h-5 flex items-center justify-center rounded-md
                           transition-colors
                           ${liked === true
                             ? 'text-[#16A34A]'
                             : 'text-[#CBD5E1] hover:text-[#64748B]'
                           }`}
              >
                <ThumbsUp size={10} />
              </button>
              <button
                onClick={() => setLiked(false)}
                className={`w-5 h-5 flex items-center justify-center rounded-md
                           transition-colors
                           ${liked === false
                             ? 'text-[#DC2626]'
                             : 'text-[#CBD5E1] hover:text-[#64748B]'
                           }`}
              >
                <ThumbsDown size={10} />
              </button>
              {isCopied && (
                <span className="text-[10px] text-[#16A34A] font-medium ml-1">
                  Copied
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   TYPING INDICATOR
───────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6]
                      flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="px-4 py-3.5 bg-[#F8FAFC] border border-[#E8EDF2]
                      rounded-2xl rounded-tl-sm flex items-center gap-2">
        <LoadingDots color="#7C3AED" />
        <span className="text-xs text-[#94A3B8] font-medium">
          Analyzing your health data...
        </span>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   SUGGESTED PROMPTS SIDEBAR
───────────────────────────────────────────── */
function SuggestedPrompts({ prompts, onSelect }) {
  return (
    <div className="bg-white rounded-3xl border border-[#E8EDF2] p-5"
         style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}>
      <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-4">
        Suggested Questions
      </p>
      <div className="space-y-2">
        {prompts.map((prompt) => {
          const Icon = PROMPT_ICONS[prompt.icon] || Sparkles
          return (
            <motion.button
              key={prompt.id}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.15 }}
              onClick={() => onSelect(prompt)}
              className="w-full flex items-center gap-3 p-3 rounded-xl
                         bg-[#FAFBFC] border border-[#E8EDF2]
                         hover:border-[#7C3AED]/30 hover:bg-[#F5F3FF]
                         text-left transition-all duration-200 group"
            >
              <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center
                              justify-center flex-shrink-0
                              group-hover:bg-[#DDD6FE] transition-colors">
                <Icon size={13} className="text-[#7C3AED]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase
                              tracking-wider leading-none mb-0.5">
                  {prompt.category}
                </p>
                <p className="text-xs text-[#0F172A] font-medium leading-snug
                              group-hover:text-[#7C3AED] transition-colors">
                  {prompt.label}
                </p>
              </div>
              <ChevronRight
                size={12}
                className="text-[#CBD5E1] group-hover:text-[#7C3AED]
                           transition-colors flex-shrink-0"
              />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   CONTEXT CARD
───────────────────────────────────────────── */
function ContextCard({ patient }) {
  return (
    <div className="bg-white rounded-3xl border border-[#E8EDF2] p-5"
         style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}>
      <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-4">
        Active Context
      </p>

      <div className="space-y-3">
        <ContextItem label="Patient" value={patient.personalInfo.fullName} />
        <ContextItem label="Diagnosis" value={patient.medical.primaryDiagnosis} />
        <ContextItem label="Stage" value={patient.medical.stage} />
        <ContextItem label="Current Rx" value="Osimertinib 80mg QD" />
        <ContextItem label="Last ctDNA" value={`${patient.ctDNA.current}% MAF`} />
        <ContextItem label="Cycle" value={`${patient.treatment.cycle} / ${patient.treatment.totalCycles}`} />
      </div>

      <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          <p className="text-[10px] text-[#64748B] font-medium">
            AI has access to your full clinical context
          </p>
        </div>
      </div>
    </div>
  )
}

function ContextItem({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] text-[#94A3B8] font-medium flex-shrink-0">{label}</p>
      <p className="text-[10px] font-semibold text-[#0F172A] text-right leading-snug">
        {value}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   DISCLAIMER CARD
───────────────────────────────────────────── */
function DisclaimerCard() {
  return (
    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-3xl p-4">
      <div className="flex items-start gap-2">
        <Shield size={14} className="text-[#D97706] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-bold text-[#92400E] mb-1">
            Medical Disclaimer
          </p>
          <p className="text-[10px] text-[#78350F] leading-relaxed">
            AI responses are for informational purposes only and do not
            constitute medical advice. Always consult Dr. Priya Nair or
            your care team before making any clinical decisions.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   INSIGHTS PANEL
───────────────────────────────────────────── */
function InsightsPanel({ recommendations, onAskAI }) {
  const PRIORITY_CONFIG = {
    high:   { label: 'High Priority',   color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
    medium: { label: 'Medium Priority', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    low:    { label: 'Low Priority',    color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#0F172A] mb-1"
            style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.01em' }}>
          AI Recommendations
        </h2>
        <p className="text-sm text-[#64748B]">
          Personalized insights based on your clinical data and genomic profile.
        </p>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, i) => {
          const priority = PRIORITY_CONFIG[rec.priority]
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl border border-[#E8EDF2] p-5"
              style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                    style={{
                      backgroundColor: priority.bg,
                      color: priority.color,
                      borderColor: priority.border,
                    }}
                  >
                    {priority.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold
                                   bg-[#F1F5F9] text-[#64748B] border border-[#E8EDF2]">
                    {rec.category}
                  </span>
                </div>

                {/* Confidence */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <TrendingUp size={11} className="text-[#16A34A]" />
                  <span className="text-[10px] font-bold text-[#16A34A]">
                    {rec.confidence}% confidence
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3
                className="text-sm font-bold text-[#0F172A] mb-2"
                style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
              >
                {rec.title}
              </h3>

              {/* Summary */}
              <p className="text-xs text-[#64748B] leading-relaxed mb-4">
                {rec.summary}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAskAI(`Tell me more about: ${rec.title}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                             bg-[#EDE9FE] text-[#7C3AED] text-xs font-semibold
                             hover:bg-[#DDD6FE] transition-colors"
                >
                  <Sparkles size={12} />
                  Ask AI
                </button>
                <span className="text-[10px] text-[#94A3B8]">
                  Generated {new Date(rec.generated).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SUMMARY PANEL
───────────────────────────────────────────── */
function SummaryPanel({ summary, patient }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#0F172A] mb-1"
            style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.01em' }}>
          Health Summary
        </h2>
        <p className="text-sm text-[#64748B]">
          AI-generated overview of your current oncology status.
        </p>
      </div>

      {/* Overall status */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)' }}
      >
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-bold text-[#14532D]">
              {summary.overallStatus}
            </p>
            <p className="text-sm text-[#166534] mt-1 leading-relaxed">
              {summary.headline}
            </p>
          </div>
        </div>
      </div>

      {/* Key points */}
      <SummarySection
        title="Key Observations"
        icon={<BookOpen size={14} className="text-[#2563EB]" />}
        bg="#EFF6FF"
      >
        {summary.keyPoints.map((point, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#DBEAFE] flex items-center
                            justify-center flex-shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-[#2563EB]">{i + 1}</span>
            </div>
            <p className="text-sm text-[#0F172A] leading-relaxed">{point}</p>
          </div>
        ))}
      </SummarySection>

      {/* Risk factors */}
      <SummarySection
        title="Monitor Closely"
        icon={<AlertTriangle size={14} className="text-[#D97706]" />}
        bg="#FEF3C7"
      >
        {summary.riskFactors.map((risk, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <AlertTriangle size={13} className="text-[#D97706] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#0F172A] leading-relaxed">{risk}</p>
          </div>
        ))}
      </SummarySection>

      {/* Positive factors */}
      <SummarySection
        title="Positive Indicators"
        icon={<TrendingUp size={14} className="text-[#16A34A]" />}
        bg="#DCFCE7"
      >
        {summary.positiveFactors.map((factor, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] flex-shrink-0 mt-2" />
            <p className="text-sm text-[#0F172A] leading-relaxed">{factor}</p>
          </div>
        ))}
      </SummarySection>

      {/* Next steps */}
      <div className="bg-white rounded-2xl border border-[#E8EDF2] p-5"
           style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={14} className="text-[#2563EB]" />
          <p className="text-sm font-bold text-[#0F172A]">Next Steps</p>
        </div>
        <div className="space-y-2">
          {summary.nextSteps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl
                         bg-[#F8FAFC] border border-[#E8EDF2]"
            >
              <div className="w-6 h-6 rounded-full bg-[#EFF6FF] border border-[#BFDBFE]
                              flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-[#2563EB]">{i + 1}</span>
              </div>
              <p className="text-xs font-semibold text-[#0F172A]">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Generation timestamp */}
      <p className="text-[10px] text-center text-[#94A3B8]">
        Generated by OncoTrace AI on{' '}
        {new Date(summary.generated).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })}
        {' '}— For informational purposes only
      </p>
    </div>
  )
}

/* ── Summary section wrapper ── */
function SummarySection({ title, icon, bg, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF2] p-5"
         style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          {icon}
        </div>
        <p className="text-sm font-bold text-[#0F172A]">{title}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
