import { useState } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Reusable SearchBar
 * Controlled or uncontrolled
 */

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  size        = 'md',
  className   = '',
  autoFocus   = false,
}) {
  /* Support uncontrolled usage */
  const [internalValue, setInternalValue] = useState('')
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleChange = (e) => {
    if (!isControlled) setInternalValue(e.target.value)
    onChange?.(e.target.value)
  }

  const handleClear = () => {
    if (!isControlled) setInternalValue('')
    onChange?.('')
    onClear?.()
  }

  const SIZES = {
    sm: 'px-3 py-2 pl-8 text-xs rounded-xl',
    md: 'px-4 py-2.5 pl-9 text-sm rounded-xl',
    lg: 'px-4 py-3 pl-10 text-sm rounded-2xl',
  }

  const ICON_SIZES = {
    sm: { size: 13, left: 'left-2.5' },
    md: { size: 14, left: 'left-3' },
    lg: { size: 15, left: 'left-3.5' },
  }

  const { size: iconSize, left } = ICON_SIZES[size] || ICON_SIZES.md

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <Search
        size={iconSize}
        className={`absolute ${left} top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none`}
      />

      <input
        type="text"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`
          w-full bg-white border border-[#E8EDF2]
          text-[#0F172A] placeholder-[#94A3B8]
          transition-all duration-200
          focus:outline-none focus:border-[#2563EB]
          focus:ring-4 focus:ring-[#2563EB]/10
          hover:border-[#94A3B8]
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
                     text-[#94A3B8] hover:text-[#64748B] transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}