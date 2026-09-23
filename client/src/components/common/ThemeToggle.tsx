import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../app/useTheme'

/**
 * Dark-mode switch for the top bar and the auth pages.
 *
 * `role="switch"` + `aria-checked` rather than a plain button: this is an
 * on/off control, and that pairing is what makes a screen reader announce the
 * current state rather than just the label. The sun/moon icons are decorative
 * — the state is carried by `aria-checked` and the label, never by colour or
 * icon alone.
 *
 * Settings keeps the fuller light/dark/system picker. This one deliberately
 * only flips between light and dark: a three-way cycle in a header gives no
 * hint of what the next press will do. Pressing it from `system` resolves to
 * the opposite of whatever the OS is currently showing, which is what someone
 * reaching for it actually wants.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={`focus-ring tap-target group relative inline-flex items-center rounded-full
                  border border-border bg-surface-2 transition-colors
                  hover:border-border-strong ${className}`}
    >
      {/* Fixed 56×32 track inside the 44px tap target — the target is the
          button itself, so the visible switch can stay compact. */}
      <span
        aria-hidden="true"
        className="relative m-1 flex h-8 w-14 items-center rounded-full"
      >
        {/* Knob. Transform-only animation: cheap, and it is what the
            reduce-motion rules in index.css already clamp. */}
        <span
          className={`absolute z-10 flex h-6 w-6 items-center justify-center rounded-full
                      bg-surface-1 shadow-card transition-transform duration-200 ease-out
                      ${isDark ? 'translate-x-7' : 'translate-x-1'}`}
        >
          {isDark ? (
            <Moon size={13} className="text-primary-500" strokeWidth={2.5} />
          ) : (
            <Sun size={13} className="text-warning-fg" strokeWidth={2.5} />
          )}
        </span>

        {/* Both glyphs stay on the track so the control reads as a two-state
            switch at a glance, not a mystery pill. */}
        <Sun
          size={12}
          className={`absolute left-1.5 transition-opacity ${isDark ? 'opacity-40' : 'opacity-0'} text-ink-subtle`}
        />
        <Moon
          size={12}
          className={`absolute right-1.5 transition-opacity ${isDark ? 'opacity-0' : 'opacity-40'} text-ink-subtle`}
        />
      </span>
    </button>
  )
}
