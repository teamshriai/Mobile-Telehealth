import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

/**
 * Six single-character boxes that behave like one field.
 *
 * ⚠️ THE ACCESSIBILITY TRAP THIS AVOIDS. Split OTP inputs are usually built as
 * six unlabelled boxes that steal focus on every keystroke, which is hostile
 * to screen readers and infuriating with a password manager. So:
 *
 *  - each box carries its own label ("Digit 3 of 6"), never a bare box;
 *  - PASTE fills the whole code from any box, because people paste the code
 *    out of an SMS rather than typing it;
 *  - BACKSPACE on an empty box steps back and clears, which is what every
 *    user expects and what naive implementations get wrong;
 *  - arrow keys move without editing;
 *  - the group is a `role="group"` with an accessible name, so a screen
 *    reader announces what the six boxes collectively are.
 *
 * ⚠️ NO AUTO-SUBMIT. The brief asks for auto-advance but warns against making
 * it frustrating, and auto-submitting on the sixth character means a single
 * mistyped digit fires a failed attempt — against a challenge that allows only
 * five. The user presses Verify.
 */

const LENGTH = 6

interface OtpCodeInputProps {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  /** Announced as the group's accessible name. */
  label?: string
  invalid?: boolean
}

export default function OtpCodeInput({
  value, onChange, disabled = false, label = 'Six-digit code', invalid = false,
}: OtpCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')

  const setAt = (index: number, char: string): void => {
    const next = digits.map((d, i) => (i === index ? char : d)).join('').replace(/\s/g, ' ')
    onChange(next.trimEnd())
  }

  const focus = (index: number): void => {
    refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number): void => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]?.trim() !== '') {
        setAt(index, ' ')
      } else if (index > 0) {
        // ⚠️ Step back AND clear. Moving without clearing leaves the previous
        // digit in place and makes the second backspace look broken.
        setAt(index - 1, ' ')
        focus(index - 1)
      }
      return
    }
    if (e.key === 'ArrowLeft') { e.preventDefault(); focus(index - 1); return }
    if (e.key === 'ArrowRight') { e.preventDefault(); focus(index + 1) }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    // ⚠️ From ANY box, not just the first — someone tabbing back to correct a
    // digit and pasting should still get the whole code.
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (pasted === '') return
    e.preventDefault()
    onChange(pasted)
    focus(pasted.length >= LENGTH ? LENGTH - 1 : pasted.length)
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="flex justify-between gap-2 sm:gap-3"
    >
      {Array.from({ length: LENGTH }, (_, i) => {
        const char = digits[i]?.trim() ?? ''
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            // ⚠️ `text` with a numeric inputMode, not `type="number"` — a
            // number input shows spinners, accepts "e" and "-", and silently
            // drops leading zeros, and roughly a tenth of all codes start
            // with one.
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            value={char}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            aria-invalid={invalid ? 'true' : undefined}
            onPaste={onPaste}
            onKeyDown={(e) => onKeyDown(e, i)}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, '').slice(-1)
              if (digit === '') return
              setAt(i, digit)
              if (i < LENGTH - 1) focus(i + 1)
            }}
            onFocus={(e) => e.target.select()}
            className={`h-14 w-full min-w-0 rounded-xl border bg-surface-1 text-center text-xl font-semibold tabular-nums text-ink transition-all focus:border-transparent focus:outline-none focus:ring-2 disabled:opacity-60 ${
              invalid
                ? 'border-critical-fg/50 focus:ring-critical-fg/40'
                : 'border-border-soft focus:ring-primary-700/35'
            }`}
          />
        )
      })}
    </div>
  )
}
