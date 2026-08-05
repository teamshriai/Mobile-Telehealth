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
  online:  'bg-[#16A34A]',
  away:    'bg-[#F59E0B]',
  busy:    'bg-[#DC2626]',
  offline: 'bg-[#94A3B8]',
}

/* Generate a consistent gradient from a string */
const getGradient = (name = '') => {
  const gradients = [
    'linear-gradient(135deg, #2563EB, #3B82F6)',
    'linear-gradient(135deg, #7C3AED, #8B5CF6)',
    'linear-gradient(135deg, #059669, #10B981)',
    'linear-gradient(135deg, #D97706, #F59E0B)',
    'linear-gradient(135deg, #DC2626, #EF4444)',
    'linear-gradient(135deg, #0284C7, #38BDF8)',
  ]
  const index = name.charCodeAt(0) % gradients.length
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
    : 'rounded-2xl'

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
            text-white font-bold select-none
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
            border-2 border-white
            ${STATUS_COLORS[status] || STATUS_COLORS.offline}
          `}
        />
      )}
    </div>
  )
}