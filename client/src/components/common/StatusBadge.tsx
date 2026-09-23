import type { ReactNode } from 'react'

export type StatusBadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'muted' | 'purple' | 'dark'
export type StatusBadgeSize = 'xs' | 'sm' | 'md'

const VARIANTS: Record<StatusBadgeVariant, string> = {
  success: 'bg-success-bg text-success-fg border-success-fg/25',
  danger:  'bg-critical-bg text-critical-fg border-critical-fg/25',
  warning: 'bg-warning-bg text-warning-fg border-warning-fg/25',
  info:    'bg-info-bg text-info-fg border-info-fg/25',
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  muted:   'bg-surface-2 text-ink-subtle border-border-soft',
  purple:  'bg-therapy-bg text-therapy-fg border-therapy-fg/25',
  dark:    'bg-ink text-ink-inverse border-transparent',
}

const SIZES: Record<StatusBadgeSize, string> = {
  xs: 'px-2 py-0.5 text-2xs rounded-md gap-1',
  sm: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
  md: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
}

const DOT_COLORS: Record<StatusBadgeVariant, string> = {
  success: 'bg-success-fg',
  danger:  'bg-critical-fg',
  warning: 'bg-warning-fg',
  info:    'bg-info-fg',
  primary: 'bg-primary-600',
  muted:   'bg-ink-subtle',
  purple:  'bg-therapy-fg',
  dark:    'bg-ink-inverse',
}

export interface StatusBadgeProps {
  children?: ReactNode
  variant?: StatusBadgeVariant
  size?: StatusBadgeSize
  dot?: boolean
  pulse?: boolean
  className?: string
}

export default function StatusBadge({
  children,
  variant = 'primary',
  size = 'sm',
  dot = false,
  pulse = false,
  className = '',
}: StatusBadgeProps) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.primary
  const sizeClass    = SIZES[size]       ?? SIZES.sm
  const dotColor     = DOT_COLORS[variant] ?? DOT_COLORS.primary

  return (
    <span
      className={`
        inline-flex items-center font-semibold border
        whitespace-nowrap select-none
        ${variantClass}
        ${sizeClass}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full flex-shrink-0
            ${dotColor}
            ${pulse ? 'animate-pulse' : ''}
          `}
        />
      )}
      {children}
    </span>
  )
}
