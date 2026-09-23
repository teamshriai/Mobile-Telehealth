import { useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Drawer — the `Z8` side sheet.
 *
 * Extracted from `AppShell`'s private `NavDrawer`, which was the only
 * implementation in the codebase with a real focus trap, scroll lock and
 * focus restore. A second, weaker copy had already appeared in DoctorHome
 * (`WhyDrawer`: no trap, no scroll lock, no restore) — which is what happens
 * when a primitive stays private.
 *
 * Used for every ARC responsive rule that says "becomes a drawer below
 * 1280": the ARC-07 basket, the ARC-08 detail pane, the ARC-25 event detail.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  /** Right by default; left is for navigation. */
  side?: 'left' | 'right'
  widthClass?: string
  children?: ReactNode
  footer?: ReactNode
}

export default function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  widthClass = 'w-full max-w-md',
  children,
  footer,
}: DrawerProps) {
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

    const onKeyDown = (e: KeyboardEvent): void => {
      // ⚠️ Closes only the TOPMOST overlay. A drawer opened over a modal must
      // not close both (UI_ATLAS ARC-15 keyboard rule), so this stops
      // propagation rather than letting the event bubble to another handler.
      if (e.key === 'Escape') {
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

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      // Always restore — dismissing must never strand focus on a node that
      // no longer exists.
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex" style={{ justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
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
            className={`relative flex h-full flex-col border-border-soft bg-surface-1 shadow-card-lg ${widthClass} ${
              side === 'right' ? 'border-l' : 'border-r'
            }`}
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
              <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="focus-ring tap-target -mr-2 rounded-lg text-ink-muted hover:bg-surface-2"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

            {footer && (
              <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-border-soft px-4 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
