import { useState, type ChangeEvent } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Reusable SearchBar
 * Controlled or uncontrolled
 */
export type SearchBarSize = 'sm' | 'md' | 'lg'

export interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  onClear?: () => void
  size?: SearchBarSize
  className?: string
  autoFocus?: boolean
}

const SIZES: Record<SearchBarSize, string> = {
  sm: 'px-3 py-2 pl-8 text-xs rounded-xl',
  md: 'px-4 py-2.5 pl-9 text-sm rounded-xl',
  lg: 'px-4 py-3 pl-10 text-sm rounded-xl',
}

const ICON_SIZES: Record<SearchBarSize, { size: number; left: string }> = {
  sm: { size: 13, left: 'left-2.5' },
  md: { size: 14, left: 'left-3' },
  lg: { size: 15, left: 'left-3.5' },
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  size = 'md',
  className = '',
  autoFocus = false,
}: SearchBarProps) {
  /* Support uncontrolled usage */
  const [internalValue, setInternalValue] = useState('')
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalValue(e.target.value)
    onChange?.(e.target.value)
  }

  const handleClear = () => {
    if (!isControlled) setInternalValue('')
    onChange?.('')
    onClear?.()
  }

  const { size: iconSize, left } = ICON_SIZES[size] || ICON_SIZES.md

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <Search
        size={iconSize}
        className={`absolute ${left} top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none`}
      />

      <input
        type="text"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`
          w-full bg-surface-1 border border-border-soft
          text-ink placeholder-ink-subtle
          transition-all duration-200
          focus:outline-none focus:border-primary-600
          focus:ring-4 focus:ring-primary-600/10
          hover:border-border-strong
          ${SIZES[size] || SIZES.md}
          ${currentValue ? 'pr-8' : ''}
        `}
      />

      {/* Clear button */}
      {currentValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2
                     text-ink-subtle hover:text-ink-subtle transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
