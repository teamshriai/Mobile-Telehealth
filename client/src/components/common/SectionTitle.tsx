/**
 * SectionTitle — consistent section headings
 * Used throughout all pages for visual rhythm
 */
import type { ReactNode } from 'react'

export interface SectionTitleProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const TITLE_SIZES: Record<string, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-lg font-semibold',
  xl: 'text-xl font-semibold',
}

const SUBTITLE_SIZES: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-sm',
}

export default function SectionTitle({
  title,
  subtitle,
  action,
  size = 'md',
  className = '',
}: SectionTitleProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="space-y-0.5 min-w-0">
        <h2
          className={`text-ink tracking-tight ${TITLE_SIZES[size] || TITLE_SIZES.md}`}
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className={`text-ink-subtle ${SUBTITLE_SIZES[size] || SUBTITLE_SIZES.md}`}>
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
