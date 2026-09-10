import { AlertTriangle, CheckCircle2, Inbox, Info, RefreshCw } from 'lucide-react'

/**
 * Shared Loading / Empty / Error / Success states.
 *
 * Phase 1 found EmptyState.jsx existed and was used by ZERO files, while
 * Timeline, Reports and Appointments each hand-rolled their own — and four
 * other pages had none at all. These are the canonical versions; pages should
 * not invent new ones.
 */

/* ── Loading ──────────────────────────────────────────────────────────────── */

export function Spinner({ size = 20, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-[2.5px] border-[#E8EDF2] border-t-[#2563EB] ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

/** Inline loading block for a card or panel that is fetching. */
export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}
    >
      <Spinner size={26} />
      <p className="text-sm font-medium text-[#475569]">{label}</p>
    </div>
  )
}

/**
 * Skeleton placeholder. Prefer this over a spinner when the shape of the
 * result is known — it avoids the layout shift a spinner causes on resolve.
 */
export function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return <div aria-hidden="true" className={`skeleton ${rounded} ${className}`} />
}

export function SkeletonText({ lines = 3, className = '' }) {
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

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]"
      >
        <Icon size={22} className="text-[#64748B]" />
      </span>
      <p className="text-base font-semibold text-[#0F172A]">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#475569]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ── Error ────────────────────────────────────────────────────────────────── */

/**
 * Inline error for a failed fetch. `onRetry` renders a retry affordance —
 * always offer one where the action is genuinely repeatable.
 */
export function ErrorState({
  title = 'Could not load this',
  description = 'Something went wrong. Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FBEAE7]"
      >
        <AlertTriangle size={22} className="text-[#A33A28]" />
      </span>
      <p className="text-base font-semibold text-[#0F172A]">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#475569]">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9]"
        >
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  )
}

/* ── Inline banners ───────────────────────────────────────────────────────── */

const BANNER_TONES = {
  // Note: `error` uses the critical palette, not the emergency red. Red is
  // reserved for the emergency action so it does not become wallpaper.
  error:   { bg: '#FBEAE7', fg: '#A33A28', Icon: AlertTriangle, role: 'alert' },
  success: { bg: '#E6F0EE', fg: '#2F6B5E', Icon: CheckCircle2,  role: 'status' },
  warning: { bg: '#FBF0E2', fg: '#8A5A1B', Icon: AlertTriangle, role: 'status' },
  info:    { bg: '#E8EFF6', fg: '#33608A', Icon: Info,          role: 'status' },
}

/**
 * Form/section-level feedback banner.
 *
 * aria-live is set so a screen reader announces the result of a submit. Phase 1
 * found async outcomes were rendered silently, so a non-sighted user pressing
 * "Save" received no confirmation at all.
 */
export function Banner({ tone = 'info', title, children, className = '' }) {
  const { bg, fg, Icon, role } = BANNER_TONES[tone] ?? BANNER_TONES.info

  return (
    <div
      role={role}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 ${className}`}
      style={{ background: bg }}
    >
      <Icon size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" style={{ color: fg }} />
      <div className="min-w-0 text-sm leading-relaxed" style={{ color: fg }}>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  )
}
