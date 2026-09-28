import { useId } from 'react'

/**
 * The assistant's mark: a small robot with a speech bubble.
 *
 * Minimal and one colour — it draws in `currentColor`, so it takes whatever
 * text colour its container gives it: white on the blue corner button, blue
 * on white, and the matching tones in dark mode. The eyes, smile and dots
 * are cut out, and a thin gap separates the bubble from the head, so the
 * mark stays crisp on any background rather than relying on a fill colour.
 *
 * The same drawing is `public/robot-chat-icon.svg` (for use as an image) —
 * change both together.
 *
 * Decorative by default; the button or heading beside it carries the name.
 */
const BUBBLE = 'M23 19h3a4.75 4.75 0 0 1 0 9.5h-2.9l-4.6 2.8 1-3.3A4.75 4.75 0 0 1 23 19z'

export default function AssistantMark({ size = 24, className }: { size?: number; className?: string }) {
  // Mask ids must be unique per instance: the mark can appear several times
  // on one page, and a reference into a hidden copy may not paint.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const gap = `am-gap-${uid}`
  const face = `am-face-${uid}`
  const dots = `am-dots-${uid}`

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <mask id={gap} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <path d={BUBBLE} fill="#000" stroke="#000" strokeWidth="3.2" strokeLinejoin="round" />
        </mask>
        <mask id={face} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <path
            d="M8.9 15.1q1.2-1.65 2.4 0M14.7 15.1q1.2-1.65 2.4 0M11.5 17.4q1.5 1.05 3 0"
            stroke="#000"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </mask>
        <mask id={dots} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="21.6" cy="23.75" r="1.1" fill="#000" />
          <circle cx="24.75" cy="23.75" r="1.1" fill="#000" />
          <circle cx="27.9" cy="23.75" r="1.1" fill="#000" />
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#${gap})`}>
        <circle cx="13" cy="3.4" r="1.6" />
        <rect x="12.25" y="4.5" width="1.5" height="3.2" rx="0.4" />
        <rect x="0.9" y="11.75" width="2.6" height="5.5" rx="1.3" />
        <rect x="22.5" y="11.75" width="2.6" height="5.5" rx="1.3" />
        <rect x="3.5" y="7.6" width="19" height="15" rx="7.5" fill="none" stroke="currentColor" strokeWidth="2.1" />
        <rect x="6.7" y="10.8" width="12.6" height="8.6" rx="4.3" mask={`url(#${face})`} />
      </g>
      <path d={BUBBLE} fill="currentColor" mask={`url(#${dots})`} />
    </svg>
  )
}
