import { Phone } from 'lucide-react'
import { formatMobileInput } from './mobileFormat'

/**
 * The `+91` mobile input.
 *
 * ⚠️ LIFTED, NOT REWRITTEN. This control, its live formatter and its
 * validation already existed inside `Register.tsx` and were the only properly
 * built phone input in the product — India pill, flag, dial-code divider,
 * `inputMode="numeric"` so a phone shows a number pad, and
 * `autoComplete="tel-national"` so the browser can fill it. Rebuilding it for
 * the login screen would have produced a second, subtly different widget and
 * two places for the validation to drift.
 *
 * ⚠️ Touch target comes free: `index.css`'s `max-width: 767px` rule forces
 * `min-height: 44px` and `font-size: max(16px, 1em)` on every input, the
 * latter being what stops iOS Safari zooming the viewport on focus.
 */

interface MobileNumberFieldProps {
  id: string
  value: string
  onChange: (next: string) => void
  error?: string
  hint?: string
  label?: string
  autoFocus?: boolean
  disabled?: boolean
}

export default function MobileNumberField({
  id, value, onChange, error, hint = 'Enter your 10-digit Indian mobile number',
  label = 'Mobile number', autoFocus = false, disabled = false,
}: MobileNumberFieldProps) {
  const describedBy = `${id}-hint`
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-muted">
          {label}
        </label>
        <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-2xs font-medium text-primary-700">
          India (+91)
        </span>
      </div>
      <div className="group relative">
        <Phone
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-ink-subtle transition-colors group-focus-within:text-primary-700 sm:left-3.5"
        />
        <div className="pointer-events-none absolute left-9 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5 text-sm font-semibold text-ink-muted sm:left-10">
          <span aria-hidden="true">🇮🇳</span>
          <span>+91</span>
          <span className="font-normal text-ink-subtle">|</span>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          maxLength={11}
          autoComplete="tel-national"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(formatMobileInput(e.target.value))}
          placeholder="98765 43210"
          aria-invalid={error !== undefined ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-surface-1 py-2.5 pl-24 pr-4 text-base text-ink transition-all duration-200 placeholder:text-ink-subtle hover:border-border focus:border-transparent focus:outline-none focus:ring-2 disabled:opacity-60 sm:pl-28 ${
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
