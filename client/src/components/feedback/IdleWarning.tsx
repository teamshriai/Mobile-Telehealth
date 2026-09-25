import { useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

/**
 * The "you're about to be signed out" notice.
 *
 * Rendered as an assertive live region rather than a focus-trapping dialog on
 * purpose. A modal that steals focus would interrupt someone mid-sentence in a
 * form — and any keystroke they make is itself the activity that cancels the
 * timeout, so trapping them is both hostile and unnecessary. The notice is
 * announced, visible, and dismissible; carrying on typing dismisses it too.
 */
export interface IdleWarningProps {
  secondsLeft: number
  onStayActive: () => void
}

export default function IdleWarning({ secondsLeft, onStayActive }: IdleWarningProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Move focus to the button only for keyboard users already in the page
  // chrome — but not away from a text field someone is typing in.
  useEffect(() => {
    const active = document.activeElement
    const isTyping =
      active instanceof HTMLElement &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable)

    if (!isTyping) buttonRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-body"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-4 sm:left-auto sm:right-6 sm:bottom-6 sm:px-0"
    >
      <div className="mx-auto w-full max-w-sm rounded-xl border border-border-soft bg-surface-1 p-4 shadow-lg sm:mx-0">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-warning-bg"
          >
            <Clock size={18} className="text-warning-fg" />
          </span>

          <div className="min-w-0 flex-1">
            <p id="idle-warning-title" className="text-sm font-semibold text-ink">
              You&rsquo;ll be signed out shortly
            </p>
            <p id="idle-warning-body" className="mt-1 text-sm leading-relaxed text-ink-muted">
              For your privacy, we sign you out after a period of inactivity.
              {' '}
              {secondsLeft > 0
                ? `About ${secondsLeft} second${secondsLeft === 1 ? '' : 's'} left.`
                : 'Signing out now.'}
            </p>

            <button
              ref={buttonRef}
              type="button"
              onClick={onStayActive}
              className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-700"
            >
              Stay signed in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
