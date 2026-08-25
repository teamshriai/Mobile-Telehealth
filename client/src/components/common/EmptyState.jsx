import { motion } from 'framer-motion'
import Button from './Button.jsx'

/**
 * EmptyState — shown when a list or section has no data
 */

export default function EmptyState({
  icon,
  title       = 'Nothing here yet',
  description = 'No data available to display.',
  action,
  actionLabel = 'Get started',
  onAction,
  size        = 'md',
  className   = '',
}) {
  const SIZES = {
    sm: { icon: 'w-10 h-10', title: 'text-sm', desc: 'text-xs', py: 'py-8' },
    md: { icon: 'w-14 h-14', title: 'text-base', desc: 'text-sm', py: 'py-12' },
    lg: { icon: 'w-16 h-16', title: 'text-lg', desc: 'text-sm', py: 'py-16' },
  }

  const s = SIZES[size] || SIZES.md

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center text-center ${s.py} ${className}`}
    >
      {/* Icon container */}
      {icon && (
        <div
          className={`
            ${s.icon} rounded-xl bg-[#F1F5F9] border border-[#E8EDF2]
            flex items-center justify-center mb-4 text-[#94A3B8]
          `}
        >
          {icon}
        </div>
      )}

      {/* Text */}
      <h3 className={`font-semibold text-[#0F172A] ${s.title}`}
          style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}>
        {title}
      </h3>
      <p className={`text-[#64748B] mt-1.5 max-w-xs leading-relaxed ${s.desc}`}>
        {description}
      </p>

      {/* Action */}
      {(action || onAction) && (
        <div className="mt-5">
          {action || (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}