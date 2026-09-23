import { Check, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import BrandMark from '../common/BrandMark'
import { useAuth } from '../../app/useAuth'

const TIERS = [
  { key: 'required', label: 'Required' },
  { key: 'recommended', label: 'Recommended' },
  { key: 'optional', label: 'Optional' },
]

interface OnboardingShellProps {
  title: string
  subtitle?: string
  activeTier: string
  unlockedTiers: string[]
  onSelectTier: (tier: string) => void
  children?: ReactNode
  footer?: ReactNode
}

/**
 * The shared onboarding chrome for all three roles: a stepper across the
 * Required/Recommended/Optional tiers (the brief's own split — never one
 * giant mandatory form), a title/subtitle slot, the tier's content, and a
 * footer for the tier's own action buttons (labels differ per tier, so the
 * parent owns them rather than this shell guessing).
 */
export default function OnboardingShell({
  title,
  subtitle,
  activeTier,
  unlockedTiers,
  onSelectTier,
  children,
  footer,
}: OnboardingShellProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex h-16 items-center gap-2.5 border-b border-border-soft bg-surface-1 px-4 sm:px-6">
        <BrandMark size={16} />
        <span className="text-[15px] font-bold tracking-tight text-ink">Stroke AI</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="focus-ring tap-target ml-auto inline-flex items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2"
        >
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}

        <nav aria-label="Onboarding progress" className="mt-6">
          <ol className="flex items-center gap-2">
            {TIERS.map((tier, index) => {
              const isUnlocked = unlockedTiers.includes(tier.key)
              const isActive = activeTier === tier.key
              const isComplete = unlockedTiers.includes(tier.key) && activeTier !== tier.key && index < TIERS.findIndex((t) => t.key === activeTier)
              return (
                <li key={tier.key} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => onSelectTier(tier.key)}
                    aria-current={isActive ? 'step' : undefined}
                    className={`focus-ring flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors
                      ${isActive
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : isUnlocked
                          ? 'border-border-soft bg-surface-1 text-ink-muted hover:bg-surface-2'
                          : 'cursor-not-allowed border-border-soft bg-surface-2 text-ink-subtle opacity-60'}`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-2xs
                        ${isComplete ? 'bg-success-fg text-on-primary' : isActive ? 'bg-primary-600 text-on-primary' : 'bg-surface-3 text-ink-subtle'}`}
                    >
                      {isComplete ? <Check size={12} strokeWidth={3} /> : index + 1}
                    </span>
                    {tier.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="mt-6 rounded-xl border border-border-soft bg-surface-1 p-5 sm:p-6">
          {children}
        </div>

        {footer && <div className="mt-5 flex items-center justify-end gap-3">{footer}</div>}
      </main>
    </div>
  )
}
