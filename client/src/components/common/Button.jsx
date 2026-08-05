import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

/**
 * Premium Button component
 * Variants: primary | secondary | ghost | danger | outline
 * Sizes: sm | md | lg
 */

const VARIANTS = {
  primary: `
    bg-[#2563EB] text-white border-transparent
    hover:bg-[#1D4ED8]
    shadow-[0_1px_3px_0_rgba(37,99,235,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(37,99,235,0.35)]
  `,
  secondary: `
    bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]
    hover:bg-[#DBEAFE] hover:border-[#93C5FD]
  `,
  ghost: `
    bg-transparent text-[#64748B] border-transparent
    hover:bg-[#F1F5F9] hover:text-[#0F172A]
  `,
  danger: `
    bg-[#DC2626] text-white border-transparent
    hover:bg-[#B91C1C]
    shadow-[0_1px_3px_0_rgba(220,38,38,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(220,38,38,0.3)]
  `,
  outline: `
    bg-white text-[#0F172A] border-[#E8EDF2]
    hover:bg-[#F8FAFC] hover:border-[#94A3B8]
  `,
  success: `
    bg-[#16A34A] text-white border-transparent
    hover:bg-[#15803D]
    shadow-[0_1px_3px_0_rgba(22,163,74,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(22,163,74,0.3)]
  `,
}

const SIZES = {
  xs: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  xl: 'px-8 py-4 text-base rounded-2xl gap-3',
}

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  icon,
  iconRight,
  loading  = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type     = 'button',
  className = '',
}) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      className={`
        inline-flex items-center justify-center
        font-semibold border
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {/* Left icon or loading spinner */}
      {loading ? (
        <Loader2 size={14} className="animate-spin flex-shrink-0" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}

      {/* Label */}
      {children && <span>{children}</span>}

      {/* Right icon */}
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </motion.button>
  )
}
