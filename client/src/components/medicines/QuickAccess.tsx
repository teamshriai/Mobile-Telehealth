import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideProps } from 'lucide-react'
import { ListChecks, Printer, RefreshCcw, Sparkles } from 'lucide-react'
import IconTile from '../common/IconTile'
import type { IconTone } from '../common/iconTones'
import { askAboutUrl } from './medicineVisuals'

/**
 * The four jobs people open this page for, one tap each: tick off today's
 * doses, ask for a refill, print the list, ask the assistant.
 */
const ACTION =
  'focus-ring flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl border border-border-soft bg-surface-1 px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:border-border-strong hover:bg-surface-2'

function Body({ icon, tone, children, badge }: { icon: ComponentType<LucideProps>; tone: IconTone; children: ReactNode; badge?: ReactNode }) {
  return (
    <>
      <IconTile icon={icon} tone={tone} size="sm" />
      <span className="min-w-0 flex-1 leading-tight">{children}</span>
      {badge}
    </>
  )
}

export default function QuickAccess({
  remainingToday,
  refillsDue,
  onToday,
  onRefills,
}: {
  remainingToday: number
  refillsDue: number
  onToday: () => void
  onRefills: () => void
}) {
  return (
    <div role="group" aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-print="hide">
      <button type="button" onClick={onToday} className={ACTION}>
        <Body
          icon={ListChecks}
          tone="green"
          badge={remainingToday > 0 ? (
            <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success-fg tabular-nums">
              {remainingToday}<span className="sr-only"> not marked yet</span>
            </span>
          ) : undefined}
        >
          Today&rsquo;s doses
        </Body>
      </button>
      <button type="button" onClick={onRefills} className={ACTION}>
        <Body
          icon={RefreshCcw}
          tone="amber"
          badge={refillsDue > 0 ? (
            <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-warning-bg px-2 py-0.5 text-2xs font-semibold text-warning-fg tabular-nums">
              {refillsDue}<span className="sr-only"> due soon</span>
            </span>
          ) : undefined}
        >
          Refills
        </Body>
      </button>
      <button type="button" onClick={() => window.print()} className={ACTION}>
        <Body icon={Printer} tone="gray">Print list</Body>
      </button>
      <Link to={askAboutUrl('Explain my current medicines in simple words.')} className={ACTION}>
        <Body icon={Sparkles} tone="violet">Ask AI</Body>
      </Link>
    </div>
  )
}
