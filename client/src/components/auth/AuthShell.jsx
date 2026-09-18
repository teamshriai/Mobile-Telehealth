import { motion, useReducedMotion } from 'framer-motion'
import ThemeToggle from '../common/ThemeToggle.jsx'

/**
 * The shared frame for sign in, sign up, forgot password and reset password.
 *
 * All four pages previously carried their own copy of this — the same ground,
 * the same dot grid, the same three blobs, and a private
 * `INK/LINK/MUTED/ACCENT_BAR` token block whose values matched nothing in
 * index.css. Four copies is also why the theme toggle needed one home rather
 * than four insertions.
 *
 * The blobs were saturated indigo/violet/pink; they are now the pastel accent
 * tokens, so they stay soft in light and do not glare on the dark ground.
 */

function DotGrid() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="auth-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          {/* currentColor picks up the token from the parent, so the grid
              lightens on the dark ground instead of disappearing. */}
          <circle cx="1.5" cy="1.5" r="1.2" fill="currentColor" fillOpacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-dots)" />
    </svg>
  )
}

const BLOBS = [
  {
    className:
      'w-64 h-64 sm:w-80 sm:h-80 lg:w-[420px] lg:h-[420px] -top-20 -left-20 opacity-50',
    background:
      'radial-gradient(circle, var(--color-accent-sky) 0%, var(--color-primary-50) 60%, transparent 100%)',
    animate: { scale: [1, 1.08, 1], x: [0, 10, 0], y: [0, -6, 0] },
    duration: 9,
    delay: 0,
  },
  {
    className:
      'w-52 h-52 sm:w-64 sm:h-64 lg:w-[340px] lg:h-[340px] -bottom-14 -right-14 opacity-50',
    background:
      'radial-gradient(circle, var(--color-accent-teal) 0%, var(--color-accent-sage) 55%, transparent 100%)',
    animate: { scale: [1, 1.12, 1], x: [0, -12, 0], y: [0, 8, 0] },
    duration: 10,
    delay: 1,
  },
  {
    className: 'w-36 h-36 sm:w-48 sm:h-48 lg:w-64 lg:h-64 top-1/2 -right-8 opacity-40',
    background:
      'radial-gradient(circle, var(--color-accent-clay) 0%, var(--color-accent-sand) 100%)',
    animate: { scale: [1, 1.06, 1], y: [0, -10, 0] },
    duration: 7,
    delay: 2,
  },
]

export default function AuthShell({ children }) {
  // Three blobs looping forever is exactly the kind of ambient motion someone
  // with a vestibular disorder turns the preference on for.
  const reduceMotion = useReducedMotion()

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg p-3 font-sans sm:p-4 lg:p-6">
      <div className="text-border-strong">
        <DotGrid />
      </div>

      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-full blur-3xl ${blob.className}`}
          style={{ background: blob.background }}
          animate={reduceMotion ? undefined : blob.animate}
          transition={
            reduceMotion
              ? undefined
              : { duration: blob.duration, delay: blob.delay, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      ))}

      {/* Above the card in stacking order, and placed before it in the DOM so
          keyboard focus reaches the theme switch without tabbing the form. */}
      <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
        <ThemeToggle />
      </div>

      {children}
    </main>
  )
}
