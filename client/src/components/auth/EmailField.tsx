import { Mail } from 'lucide-react'

/**
 * The email input for OTP sign-in.
 *
 * ⚠️ Deliberately a SIBLING of `MobileNumberField`, not a polymorphic field.
 * That component hard-codes the India pill, the 🇮🇳 `+91` overlay, its left
 * padding sized for that overlay, `inputMode="numeric"` and a live formatter —
 * none of which an email wants. Sharing the prop shape lets `Login.tsx` swap
 * the two without changing the call site; merging them would produce a widget
 * full of `channel === …` branches.
 *
 * Touch target and iOS zoom-prevention come free: `index.css`'s
 * `max-width: 767px` rule forces `min-height: 44px` and `font-size: 16px` on
 * every input.
 */
interface EmailFieldProps {
  id: string
  value: string
  onChange: (next: string) => void
  error?: string
  hint?: string
  label?: string
  autoFocus?: boolean
  disabled?: boolean
}

export default function EmailField({
  id, value, onChange, error, hint = 'Use the email address registered for you',
  label = 'Email address', autoFocus = false, disabled = false,
}: EmailFieldProps) {
  const describedBy = `${id}-hint`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-muted">
        {label}
      </label>
      <div className="group relative">
        <Mail
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-ink-subtle transition-colors group-focus-within:text-primary-700 sm:left-3.5"
        />
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@example.com"
          aria-invalid={error !== undefined ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-surface-1 py-2.5 pl-10 pr-4 text-base text-ink transition-all duration-200 placeholder:text-ink-subtle hover:border-border focus:border-transparent focus:outline-none focus:ring-2 disabled:opacity-60 sm:pl-11 ${
            error !== undefined
              ? 'border-critical-fg/40 focus:ring-critical-fg/40'
              : 'border-border-soft focus:ring-primary-700/35'
          }`}
        />
      </div>
      {error !== undefined ? (
        <p id={describedBy} role="alert" className="mt-1 text-xs text-critical-fg">
          {error}
        </p>
      ) : (
        <p id={describedBy} className="mt-1 text-xs text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  )
}
