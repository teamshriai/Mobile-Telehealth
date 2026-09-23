import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { ReactNode, MouseEventHandler } from 'react'

/**
 * Premium Button component
 * Variants: primary | secondary | ghost | danger | outline
 * Sizes: sm | md | lg
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: `
    bg-primary-600 text-on-primary border-transparent
    hover:bg-primary-700
    shadow-[0_1px_3px_0_rgba(37,99,235,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(37,99,235,0.35)]
  `,
  secondary: `
    bg-primary-50 text-primary-700 border-primary-200
    hover:bg-primary-100 hover:border-primary-300
  `,
  ghost: `
    bg-transparent text-ink-subtle border-transparent
    hover:bg-surface-2 hover:text-ink
  `,
  danger: `
    bg-danger text-on-primary border-transparent
    hover:bg-danger-fg
    shadow-[0_1px_3px_0_rgba(220,38,38,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(220,38,38,0.3)]
  `,
  outline: `
    bg-surface-1 text-ink border-border-soft
    hover:bg-surface-2 hover:border-border-strong
  `,
  success: `
    bg-success-fg text-on-primary border-transparent
    hover:bg-success-fg
    shadow-[0_1px_3px_0_rgba(22,163,74,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(22,163,74,0.3)]
  `,
}

// Every size carries a minimum height, because padding alone does not
// guarantee one: `sm` rendered at 31px tall, well under the 44px a finger
// needs. A measured sweep at 320px and 390px found real controls failing this.
//
// `xs` is the one deliberate exception — 36px, for controls that sit inside
// dense table rows and metadata strips where a 44px button would break the
// line box. Do not use it for a primary action on a touch surface.
const SIZES: Record<ButtonSize, string> = {
  xs: 'min-h-9 px-3 py-1.5 text-xs rounded-lg gap-1.5',
  sm: 'min-h-11 px-3.5 py-2 text-xs rounded-lg gap-1.5',
  md: 'min-h-11 px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'min-h-12 px-5 py-2.5 text-sm rounded-xl gap-2',
  xl: 'min-h-14 px-8 py-4 text-base rounded-2xl gap-3',
}

export interface ButtonProps {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
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
        focus:outline-none focus:ring-4 focus:ring-primary-600/15
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
