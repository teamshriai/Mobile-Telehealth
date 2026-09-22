/**
 * FormField.jsx
 *
 * A labeled input/select/textarea used across onboarding and profile forms.
 * Accessibility (id/htmlFor/aria-describedby/aria-invalid, role="alert" on
 * the error text) is built in from the start here, rather than retrofitted
 * — the auth forms' InputField needed exactly this fixed after the fact.
 */
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
}) {
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
