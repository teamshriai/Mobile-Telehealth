import { AlertTriangle, CheckCircle2, Inbox, Info, RefreshCw } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import type { ApiError } from '../../types/api'

/**
 * Shared Loading / Empty / Error / Success states.
 *
 * Phase 1 found EmptyState.jsx existed and was used by ZERO files, while
 * Timeline, Reports and Appointments each hand-rolled their own — and four
 * other pages had none at all. These are the canonical versions; pages should
 * not invent new ones.
 */

type IconType = ComponentType<LucideProps>

/* ── Loading ──────────────────────────────────────────────────────────────── */

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-[2.5px] border-border-soft border-t-primary-600 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

/** Inline loading block for a card or panel that is fetching. */
export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}
    >
      <Spinner size={26} />
      <p className="text-sm font-medium text-ink-muted">{label}</p>
    </div>
  )
}

/**
 * Skeleton placeholder. Prefer this over a spinner when the shape of the
 * result is known — it avoids the layout shift a spinner causes on resolve.
 */
export function Skeleton({ className = '', rounded = 'rounded-lg' }: { className?: string; rounded?: string }) {
  return <div aria-hidden="true" className={`skeleton ${rounded} ${className}`} />
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          // Last line short, as real paragraphs are — a full-width final line
          // reads as a table row rather than prose.
          rounded="rounded"
        />
      ))}
    </div>
  )
}

/* ── Empty ────────────────────────────────────────────────────────────────── */

export interface EmptyStateProps {
  icon?: IconType
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2"
      >
        <Icon size={22} className="text-ink-subtle" />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ── Error ────────────────────────────────────────────────────────────────── */

/**
 * The support reference for a failed request. Deliberately understated: it is
 * useful when someone rings up about a failure and noise the rest of the time.
 * Monospaced and selectable, because its whole job is being copied accurately.
 */
export function ReferenceId({ id, className = '' }: { id?: string | null; className?: string }) {
  if (!id) return null
  return (
    <p className={`text-xs text-ink-subtle ${className}`}>
      Reference:{' '}
      <span className="select-all font-mono text-ink-subtle">{id}</span>
    </p>
  )
}

export interface ErrorStateProps {
  title?: ReactNode
  /** Either a plain message string, or the ApiError apiClient rejected with —
   *  passing the error object directly means a page never has to hold the
   *  requestId in a second piece of state just to display it. */
  description?: string | ApiError | null
  onRetry?: () => void
  /**
   * The server's correlation id for the failed request. Rendered as a quiet
   * reference line so a patient can quote it to support. It identifies a
   * request, not a person, and contains no health information — safe to show
   * on screen and safe to read out over a phone.
   *
   * Usually you do not pass this directly: give `description` the caught
   * error object instead of `err.message` and the id is picked up from it.
   */
  requestId?: string | null
  className?: string
}

/**
 * Inline error for a failed fetch. `onRetry` renders a retry affordance —
 * always offer one where the action is genuinely repeatable.
 */
export function ErrorState({
  title = 'Could not load this',
  description = 'Something went wrong. Please try again.',
  onRetry,
  requestId,
  className = '',
}: ErrorStateProps) {
  // Accepts either a string (the long-standing call style) or the Error that
  // apiClient rejected with. Taking the object means a page does not have to
  // hold the requestId in a second piece of state just to display it.
  const isErrorObject = description !== null && typeof description === 'object'
  const message = isErrorObject
    ? (description.message ?? 'Something went wrong. Please try again.')
    : description
  const reference = requestId ?? (isErrorObject ? description.requestId : null)

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-critical-bg"
      >
        <AlertTriangle size={22} className="text-critical-fg" />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-2"
        >
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
      {reference && <ReferenceId id={reference} className="mt-5" />}
    </div>
  )
}

/* ── Inline banners ───────────────────────────────────────────────────────── */

export type BannerTone = 'error' | 'success' | 'warning' | 'info'

// Classes, not inline `style`: an inline colour cannot follow a CSS variable,
// so the previous version of this map was invisible to the theme and would
// have stayed light-on-light in dark mode.
const BANNER_TONES: Record<BannerTone, { cls: string; Icon: IconType; role: 'alert' | 'status' }> = {
  // Note: `error` uses the critical palette, not the emergency red. Red is
  // reserved for the emergency action so it does not become wallpaper.
  error:   { cls: 'bg-critical-bg text-critical-fg', Icon: AlertTriangle, role: 'alert'  },
  success: { cls: 'bg-success-bg  text-success-fg',  Icon: CheckCircle2,  role: 'status' },
  warning: { cls: 'bg-warning-bg  text-warning-fg',  Icon: AlertTriangle, role: 'status' },
  info:    { cls: 'bg-info-bg     text-info-fg',     Icon: Info,          role: 'status' },
}

export interface BannerProps {
  tone?: BannerTone
  title?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * Form/section-level feedback banner.
 *
 * aria-live is set so a screen reader announces the result of a submit. Phase 1
 * found async outcomes were rendered silently, so a non-sighted user pressing
 * "Save" received no confirmation at all.
 */
export function Banner({ tone = 'info', title, children, className = '' }: BannerProps) {
  const { cls, Icon, role } = BANNER_TONES[tone] ?? BANNER_TONES.info

  return (
    <div
      role={role}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 ${cls} ${className}`}
    >
      <Icon size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0 text-sm leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  )
}
