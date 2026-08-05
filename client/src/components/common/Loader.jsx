import { motion } from 'framer-motion'

/**
 * Loader component
 * Variants: spinner | skeleton | pulse | dots | page
 */

/* ── Skeleton line ── */
export function SkeletonLine({ width = 'full', height = 'h-4' }) {
  const widthClass = width === 'full' ? 'w-full'
    : width === '3/4' ? 'w-3/4'
    : width === '1/2' ? 'w-1/2'
    : width === '1/3' ? 'w-1/3'
    : width === '2/3' ? 'w-2/3'
    : 'w-full'

  return (
    <div className={`skeleton ${widthClass} ${height} rounded-lg`} />
  )
}

/* ── Skeleton card ── */
export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E8EDF2] p-5 space-y-3 ${className}`}>
      <SkeletonLine height="h-4" width="1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          height="h-3"
          width={i === lines - 1 ? '2/3' : 'full'}
        />
      ))}
    </div>
  )
}

/* ── Spinning loader ── */
export function Spinner({ size = 20, color = '#2563EB', className = '' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle
        className="opacity-20"
        cx="12" cy="12" r="10"
        stroke={color}
        strokeWidth="3"
      />
      <path
        className="opacity-80"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

/* ── Animated dots ── */
export function LoadingDots({ color = '#2563EB' }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ── Full page loader ── */
export function PageLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center
                    bg-[#FAFBFC] z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}
        >
          <svg width="28" height="28" viewBox="0 0 18 18" fill="none">
            <path d="M4 9C4 6.239 6.239 4 9 4C11.761 4 14 6.239 14 9"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="9" cy="9" r="2" fill="white" />
            <path d="M9 11L9 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p
            className="text-sm font-semibold text-[#0F172A]"
            style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
          >
            OncoTrace AI
          </p>
          <LoadingDots />
        </div>
      </motion.div>
    </div>
  )
}

/* ── Default export ── */
export default function Loader({ variant = 'spinner', ...props }) {
  if (variant === 'skeleton-card') return <SkeletonCard {...props} />
  if (variant === 'skeleton-line') return <SkeletonLine {...props} />
  if (variant === 'dots')    return <LoadingDots {...props} />
  if (variant === 'page')    return <PageLoader />
  return <Spinner {...props} />
}