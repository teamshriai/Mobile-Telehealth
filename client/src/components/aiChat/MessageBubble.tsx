import type { ReactElement, ReactNode } from 'react'
import { Phone, Sparkles } from 'lucide-react'
import type { AiMessage } from '../../types/domain'
import ReplyText from './ReplyText'
import { MODEL_WRAP, TURN_STYLE } from './turnStyles'

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

/**
 * One turn of the conversation. A generated reply is formatted (ReplyText);
 * every fixed server message is shown exactly as written, in its own style,
 * so it can never be mistaken for the model's words.
 */
export default function MessageBubble({
  m,
  actions,
  onNavigate,
  compact = false,
}: {
  m: AiMessage
  /** Extra controls under an assistant turn (copy, …). */
  actions?: ReactNode
  /** Called when a source chip is followed — the floating panel closes. */
  onNavigate?: () => void
  compact?: boolean
}): ReactElement {
  const isUser = m.role === 'User'
  const special = !isUser ? TURN_STYLE[m.kind] : undefined
  const isModel = !isUser && special === undefined
  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : ''}`} data-testid={isUser ? 'chat-question' : 'chat-reply'} data-kind={m.kind}>
      {!isUser && !compact && (
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${
            special ? special.iconClass : 'bg-accent-sky text-accent-sky-fg'
          }`}
        >
          {special ? <special.icon size={13} /> : <Sparkles size={13} />}
        </span>
      )}

      <div className={`group/msg min-w-0 ${compact ? 'max-w-[92%]' : 'max-w-[85%]'}`}>
        {isModel ? (
          <div id={`msg-body-${m.id}`} className={MODEL_WRAP}>
            <ReplyText text={m.content} onNavigate={onNavigate} />
          </div>
        ) : (
          <p
            id={`msg-body-${m.id}`}
            role={special?.role}
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
              isUser ? 'rounded-lg rounded-br-sm bg-primary-600 px-3.5 py-2.5 text-on-primary' : special?.wrapClass
            }`}
          >
            {m.content}
          </p>
        )}

        {special?.showCallButton && (
          <a
            href="tel:108"
            className="focus-ring mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-danger-fg"
          >
            <Phone size={15} aria-hidden="true" /> Call 108 — Ambulance
          </a>
        )}

        <div className={`mt-1 flex items-center gap-2 px-0.5 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-2xs text-ink-subtle">{m.id.startsWith('tmp-') ? 'Sending…' : timeOfDay(m.createdAt)}</span>
          {!isUser && actions}
        </div>
      </div>
    </div>
  )
}
