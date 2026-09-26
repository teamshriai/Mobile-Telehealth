import { motion } from 'framer-motion'

/**
 * Animated circular progress ring
 * Used for health score, treatment progress, etc.
 */
export interface ProgressRingProps {
  value?: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  sublabel?: string
  animate?: boolean
  showValue?: boolean
  fontSize?: string
}

export default function ProgressRing({
  value = 0,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = 'var(--color-primary-600)',
  trackColor = 'var(--color-surface-3)',
  label,
  sublabel,
  animate = true,
  showValue = true,
  fontSize = 'text-lg',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(Math.max(value / max, 0), 1)
  const offset = circumference * (1 - percentage)

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* SVG ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={animate
            ? { strokeDashoffset: offset }
            : { strokeDashoffset: offset }
          }
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.2,
          }}
        />
      </svg>

      {/* Center label */}
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span className={`font-bold text-ink leading-none ${fontSize}`}>
              {Math.round(value)}
            </span>
          )}
          {label && (
            <span className="text-2xs text-ink-subtle font-medium mt-0.5 leading-none">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-2xs text-ink-subtle mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
