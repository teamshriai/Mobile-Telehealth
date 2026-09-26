import type { ComponentType } from 'react'
import { Clock, Info, ShieldAlert, Siren } from 'lucide-react'
import type { AiMessageKind } from '../../types/domain'

/**
 * How each kind of assistant turn looks.
 *
 * Every assistant turn carries `kind`, set by the server (AiMessageKind in
 * server/prisma/schema.prisma). Rendering it distinctly is what lets a
 * patient always tell what did and did not come from the model: a fixed
 * safety message must never look identical to a generated answer. 'Model'
 * has no entry — it is the ordinary reply.
 */
export interface TurnStyle {
  icon: ComponentType<{ size?: number }>
  iconClass: string
  wrapClass: string
  role: 'alert' | 'status'
  showCallButton: boolean
}

const quiet = (icon: TurnStyle['icon'], tone: string): TurnStyle => ({
  icon,
  iconClass: `bg-surface-2 ${tone}`,
  wrapClass: `rounded-lg rounded-bl-sm bg-surface-2 px-3.5 py-2.5 ${tone}`,
  role: 'status',
  showCallButton: false,
})

export const TURN_STYLE: Partial<Record<AiMessageKind, TurnStyle>> = {
  SafetyInterlock: {
    icon: Siren,
    iconClass: 'bg-critical-bg text-critical-fg',
    wrapClass: 'rounded-lg border border-critical-fg/30 bg-critical-bg px-3.5 py-3 text-critical-fg',
    role: 'alert',
    showCallButton: true,
  },
  SafetyBlocked: {
    icon: ShieldAlert,
    iconClass: 'bg-warning-bg text-warning-fg',
    wrapClass: 'rounded-lg rounded-bl-sm bg-warning-bg px-3.5 py-2.5 text-warning-fg',
    role: 'status',
    showCallButton: false,
  },
  BudgetDeferred: quiet(Clock, 'text-ink-subtle'),
  ProviderUnavailable: quiet(Clock, 'text-ink-subtle'),
  PolicyBlocked: quiet(Info, 'text-ink-subtle'),
  Placeholder: quiet(Info, 'text-ink-muted'),
}

/** The ordinary generated reply. */
export const MODEL_WRAP = 'rounded-lg rounded-bl-sm bg-surface-2 px-3.5 py-2.5 text-ink'
