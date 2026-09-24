import { useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * The `<768` bottom sheet.
 *
 * The atlas asks for one in several places — §5.1 makes `Z6` a bottom sheet at
 * `xs`, and `S-06-02`'s responsive line says the same — but the codebase only
 * had a side `Drawer`. A side drawer on a phone is a full-screen takeover with
 * the dismiss control in the least reachable corner; a sheet rises from the
 * thumb and dismisses downward.
 *
 * ⚠️ Same modal contract as `Drawer`: focus trap, scroll lock, focus restore,
 * `Esc` closes. Those are not optional extras — a sheet without a trap leaves a
 * keyboard user tabbing through the page behind it while it covers the screen,
 * and one without focus restore strands them at the top of the document when it
 * closes.
 *
 * ⚠️ Capped at 85vh rather than full height, so the screen behind stays partly
 * visible. On a patient-scoped screen that matters: the `Z3` banner is what
 * catches a wrong-patient error, and a sheet that hides it entirely removes
 * that check at exactly the moment the clinician is reading clinical context.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusables = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
    ;(focusables[0] ?? panel)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // ⚠️ Stops here. Otherwise the screen's own Esc handler also fires and
        // the clinician is navigated away by the keypress that was meant to
        // close the sheet.
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    // Capture, so it runs before screen-level Esc handlers.
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border-soft bg-surface-1"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* The grab handle is decorative; the close button is the control. */}
            <span aria-hidden="true" className="mx-auto mt-2 h-1 w-9 rounded-full bg-border" />
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="focus-ring -m-1 rounded p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
