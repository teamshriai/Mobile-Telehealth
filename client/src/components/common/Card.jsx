import { motion } from 'framer-motion'

/**
 * Premium Card component
 * Variants: default | elevated | ghost | bordered | gradient
 */

const VARIANTS = {
  default: `
    bg-white/95 border border-[#E8EDF2]
    shadow-[0_1px_2px_0_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.04)]
  `,
  elevated: `
    bg-white/95 border border-[#E8EDF2]
    shadow-[0_18px_45px_0_rgba(15,23,42,0.08)]
  `,
  ghost: `
    bg-[#F8FAFC] border border-[#E8EDF2]
  `,
  bordered: `
    bg-white border-2 border-[#E8EDF2]
  `,
  gradient: `
    border border-[#E8EDF2]
    shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_16px_0_rgba(15,23,42,0.06)]
  `,
  primary: `
    border border-[#BFDBFE]
    shadow-[0_1px_3px_0_rgba(37,99,235,0.08),0_4px_16px_0_rgba(37,99,235,0.08)]
  `,
  /* Level 3 of the material hierarchy — selective, elevated, translucent.
     Reach for this deliberately (AI-insight surfaces, floating panels),
     not as a default replacement for `default`. */
  glass: `
    backdrop-blur-xl border border-white/60
    shadow-[0_20px_60px_0_rgba(15,23,42,0.10)]
  `,
}

const PADDINGS = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
  xl:   'p-6',
}

const RADII = {
  md:  'rounded-xl',
  lg:  'rounded-2xl',
  xl:  'rounded-3xl',
}

export default function Card({
  children,
  variant  = 'default',
  padding  = 'lg',
  radius   = 'md',
  hover    = false,
  animate  = false,
  delay    = 0,
  onClick,
  className = '',
  style     = {},
}) {
  /* Gradient background for gradient variant */
  const gradientStyle = variant === 'gradient'
    ? { background: 'linear-gradient(160deg, #FFFFFF 0%, #EFF6FF 100%)' }
    : variant === 'primary'
    ? { background: 'linear-gradient(160deg, #EFF6FF 0%, #DBEAFE 100%)' }
    : variant === 'glass'
    ? { background: 'rgba(255,255,255,0.72)' }
    : {}

  const baseClasses = `
    ${VARIANTS[variant] || VARIANTS.default}
    ${PADDINGS[padding] || PADDINGS.lg}
    ${RADII[radius] || RADII.lg}
    ${hover ? 'card-hover cursor-pointer' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
        whileHover={hover ? { y: -2 } : {}}
        onClick={onClick}
        className={baseClasses}
        style={{ ...gradientStyle, ...style }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={baseClasses}
      style={{ ...gradientStyle, ...style }}
    >
      {children}
    </div>
  )
}
