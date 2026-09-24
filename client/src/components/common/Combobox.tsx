import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useDismissable } from '../../app/useDismissable'

/**
 * Combobox — the async typeahead behind patient search, ICD-10 coding and
 * the drug formulary.
 *
 * ⚠️ THE RULE THAT SHAPES THIS COMPONENT (UI_ATLAS ARC-17): *"Typing is
 * never blocked by an in-flight query."* The input is fully controlled by
 * the caller and never disabled, never cleared and never re-ordered while a
 * request is outstanding. A search box that stutters mid-word is one a
 * clinician abandons for paper.
 *
 * ARIA combobox pattern: the INPUT owns `role="combobox"` and
 * `aria-activedescendant`; focus never leaves it, so arrow keys move the
 * highlight without moving focus.
 */

interface ComboboxProps<T> {
  label: string
  /** Controlled query text. */
  value: string
  onValueChange: (next: string) => void
  options: T[]
  optionKey: (option: T) => string
  renderOption: (option: T) => ReactNode
  onSelect: (option: T) => void
  placeholder?: string
  /** Shown as a spinner INSIDE the field — never as a disabled state. */
  loading?: boolean
  /** Explains an empty result list. */
  emptyMessage?: string
  hint?: string
  error?: string
  autoFocus?: boolean
  /**
   * Lets a parent focus the field — `S-06-07`'s `/` shortcut, per the atlas's
   * keyboard row. Optional, and the component keeps its own internal ref
   * either way, so nothing depends on a caller supplying one.
   */
  inputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
}

export default function Combobox<T>({
  label,
  value,
  onValueChange,
  options,
  optionKey,
  renderOption,
  onSelect,
  placeholder,
  loading = false,
  emptyMessage = 'No matches.',
  hint,
  error,
  autoFocus = false,
  inputRef: externalRef,
  className = '',
}: ComboboxProps<T>) {
  const baseId = useId()
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const ownRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef ?? ownRef
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])
  useDismissable({ open, onClose: close, triggerRef: inputRef, panelRef })

  const choose = (option: T): void => {
    onSelect(option)
    setOpen(false)
    setHighlighted(0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlighted((h) => Math.min(h + 1, Math.max(options.length - 1, 0)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      const option = options[highlighted]
      if (open && option !== undefined) {
        e.preventDefault()
        choose(option)
      }
      return
    }
    if (e.key === 'Escape') {
      // Stops at this overlay only, per the ARC-15 Esc rule.
      e.stopPropagation()
      setOpen(false)
    }
  }

  const listboxId = `${baseId}-listbox`
  const activeId = options[highlighted] !== undefined
    ? `${baseId}-opt-${optionKey(options[highlighted])}`
    : undefined

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={`${baseId}-input`} className="mb-1.5 block text-sm font-medium text-ink-muted">
        {label}
      </label>

      <div className="relative">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
        />
        <input
          id={`${baseId}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open ? activeId : undefined}
          aria-describedby={hint !== undefined ? `${baseId}-hint` : undefined}
          aria-invalid={error !== undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onValueChange(e.target.value)
            setOpen(true)
            setHighlighted(0)
          }}
          onFocus={() => { if (value.length > 0) setOpen(true) }}
          onKeyDown={onKeyDown}
          className={`focus-ring w-full rounded-lg border bg-surface-1 py-2 pl-9 pr-9 text-sm text-ink placeholder:text-ink-subtle ${
            error !== undefined ? 'border-critical-fg/40' : 'border-border-soft'
          }`}
        />
        {/* ⚠️ The spinner sits beside the text, not over it, and the input
            stays enabled — see the component header. */}
        {loading && (
          <Loader2
            size={15}
            aria-hidden="true"
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-subtle"
          />
        )}
      </div>

      {hint !== undefined && error === undefined && (
        <p id={`${baseId}-hint`} className="mt-1 text-xs text-ink-subtle">{hint}</p>
      )}
      {error !== undefined && (
        <p role="alert" className="mt-1 text-xs text-critical-fg">{error}</p>
      )}

      {/* Screen-reader announcement of result count, polite so it never
          interrupts typing. */}
      <span aria-live="polite" className="sr-only">
        {open ? `${options.length} ${options.length === 1 ? 'result' : 'results'}` : ''}
      </span>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface-1 shadow-card-lg"
        >
          <ul id={listboxId} role="listbox" aria-label={label}>
            {options.length === 0 && !loading && (
              <li className="px-3 py-3 text-xs text-ink-subtle">{emptyMessage}</li>
            )}
            {options.map((option, index) => {
              const key = optionKey(option)
              return (
                <li
                  key={key}
                  id={`${baseId}-opt-${key}`}
                  role="option"
                  aria-selected={index === highlighted}
                  onMouseEnter={() => setHighlighted(index)}
                  onMouseDown={(e) => {
                    // mousedown, not click — click fires after blur, which
                    // would close the panel before the selection lands.
                    e.preventDefault()
                    choose(option)
                  }}
                  className={`clinical-row cursor-pointer px-3 py-2 text-sm ${
                    index === highlighted ? 'bg-primary-50 text-primary-700' : 'text-ink'
                  }`}
                >
                  {renderOption(option)}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
