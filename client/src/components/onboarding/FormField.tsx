import type { ChangeEvent, ReactNode } from 'react'

/**
 * FormField.tsx
 *
 * A labeled input/select/textarea used across onboarding and profile forms.
 * Accessibility (id/htmlFor/aria-describedby/aria-invalid, role="alert" on
 * the error text) is built in from the start here, rather than retrofitted
 * — the auth forms' InputField needed exactly this fixed after the fact.
 *
 * `as` picks the rendered element; the remaining native attributes are
 * shared across all three rather than typed per-element, since callers
 * switch `as` without changing which attributes they pass (`value`,
 * `onChange`, `required`, …) and the underlying elements' event types are
 * otherwise incompatible with each other for spreading purposes.
 */

type FormFieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

export interface FormFieldProps {
  label: string
  name: string
  hint?: string
  error?: string
  required?: boolean
  as?: 'input' | 'select' | 'textarea'
  children?: ReactNode
  className?: string
  value?: string | number
  defaultValue?: string | number
  placeholder?: string
  type?: string
  min?: string | number
  max?: string | number
  step?: string | number
  rows?: number
  multiple?: boolean
  disabled?: boolean
  autoComplete?: string
  autoFocus?: boolean
  onChange?: (e: ChangeEvent<FormFieldElement>) => void
  onBlur?: (e: ChangeEvent<FormFieldElement>) => void
}

export default function FormField({
  label,
  name,
  hint,
  error,
  required = false,
  as = 'input',
  children,
  className = '',
  ...inputProps
}: FormFieldProps) {
  const id = `field-${name}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const sharedClasses = `w-full rounded-lg border bg-surface-1 px-3.5 py-2.5 text-sm text-ink
    placeholder:text-ink-subtle transition-colors duration-150
    focus:outline-none focus:ring-2 focus:border-transparent
    ${error ? 'border-critical-fg/40 focus:ring-critical-fg/35' : 'border-border-soft focus:ring-primary-700/30'}
    ${className}`

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink-muted">
        {label}
        {required && <span aria-hidden="true" className="text-critical-fg">*</span>}
        {!required && <span className="text-xs font-normal text-ink-subtle">(optional)</span>}
      </label>

      {as === 'select' ? (
        <select
          id={id}
          name={name}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={sharedClasses}
          {...inputProps}
        >
          {children}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={sharedClasses}
          {...inputProps}
        />
      ) : (
        <input
          id={id}
          name={name}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={sharedClasses}
          {...inputProps}
        />
      )}

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-critical-fg">
          {error}
        </p>
      )}
    </div>
  )
}
