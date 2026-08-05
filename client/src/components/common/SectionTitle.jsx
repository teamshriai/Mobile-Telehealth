/**
 * SectionTitle — consistent section headings
 * Used throughout all pages for visual rhythm
 */

export default function SectionTitle({
  title,
  subtitle,
  action,
  size    = 'md',
  className = '',
}) {
  const titleSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg font-semibold',
    xl: 'text-xl font-semibold',
  }

  const subtitleSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-sm',
  }

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="space-y-0.5 min-w-0">
        <h2
          className={`text-[#0F172A] tracking-tight ${titleSizes[size] || titleSizes.md}`}
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className={`text-[#64748B] ${subtitleSizes[size] || subtitleSizes.md}`}>
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
