/**
 * Avatar component
 * Supports initials, gradient backgrounds, sizes, status indicators
 */

const SIZES = {
  xs:  { container: 'w-6 h-6',   text: 'text-[9px]' },
  sm:  { container: 'w-8 h-8',   text: 'text-[10px]' },
  md:  { container: 'w-10 h-10', text: 'text-xs' },
  lg:  { container: 'w-12 h-12', text: 'text-sm' },
  xl:  { container: 'w-16 h-16', text: 'text-base' },
  '2xl':{ container: 'w-20 h-20', text: 'text-xl' },
  '3xl':{ container: 'w-24 h-24', text: 'text-2xl' },
}

const STATUS_COLORS = {
  online:  'bg-success-fg',
  away:    'bg-warning-fg',
  busy:    'bg-danger',
  offline: 'bg-border-strong',
}

/* Generate a consistent gradient from a string */
const getGradient = (name = '') => {
  const gradients = [
    'linear-gradient(135deg, var(--color-accent-sky-fg), var(--color-primary-500))',
    'linear-gradient(135deg, var(--color-therapy-fg), var(--color-accent-clay-fg))',
    'linear-gradient(135deg, var(--color-accent-teal-fg), var(--color-success-fg))',
    'linear-gradient(135deg, var(--color-accent-sand-fg), var(--color-warning-fg))',
    'linear-gradient(135deg, var(--color-accent-clay-fg), var(--color-critical-fg))',
    'linear-gradient(135deg, var(--color-info-fg), var(--color-accent-sky-fg))',
  ]
  // '' .charCodeAt(0) is NaN, so an empty/falsy name (the default prop value)
  // previously indexed gradients[NaN] -> undefined -> no background at all.
  // Falling back to a fixed gradient keeps every avatar visually valid.
  const code = name ? name.charCodeAt(0) : 0
  const index = code % gradients.length
  return gradients[index]
}

export default function Avatar({
  name      = '',
  src,
  size      = 'md',
  status,
  rounded   = 'full',
  className = '',
}) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const { container, text } = SIZES[size] || SIZES.md

  const radiusClass = rounded === 'full'
    ? 'rounded-full'
    : rounded === 'xl'
    ? 'rounded-xl'
    : 'rounded-xl'

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {src ? (
        /* Image avatar */
        <img
          src={src}
          alt={name}
          className={`${container} ${radiusClass} object-cover`}
        />
      ) : (
        /* Initials avatar */
        <div
          className={`
            ${container} ${radiusClass}
            flex items-center justify-center
            text-on-primary font-bold select-none
            ${text}
          `}
          style={{ background: getGradient(name) }}
        >
          {initials}
        </div>
      )}

      {/* Status indicator */}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            w-2.5 h-2.5 rounded-full
            border-2 border-surface-1
            ${STATUS_COLORS[status] || STATUS_COLORS.offline}
          `}
        />
      )}
    </div>
  )
}