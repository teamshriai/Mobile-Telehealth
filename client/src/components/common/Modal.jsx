import { useEffect, useId, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Modal — dialog / sm | md | lg | xl | full.
 *
 * Phase 1 (P4) found this component had no role="dialog", no aria-modal, no
 * focus trap and no focus restoration — a screen-reader user was never told
 * they were in a dialog, and a keyboard user could Tab straight out of it into
 * the page behind. All four are fixed here before any Phase 3 confirmation
 * flow (e.g. cancelling an appointment) reuses it.
 */

const SIZES = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  '2xl':'max-w-3xl',
  full: 'max-w-5xl',
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size      = 'md',
  closeable = true,
  className = '',
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  /** The element focus returns to when the dialog closes. */
  const previouslyFocused = useRef(null)

  /* Lock body scroll when open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  /* Close on Escape key */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && closeable) onClose?.()
    }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, closeable, onClose])

  /*
   * Focus management: move focus INTO the dialog on open, trap Tab inside it
   * while open, and restore focus to whatever triggered it on close. Without
   * this, a keyboard user tabbing past the last visible control lands back on
   * the page behind a modal that is still open.
   */
  useEffect(() => {
    if (!isOpen) return undefined

    previouslyFocused.current = document.activeElement

    const panel = panelRef.current
    const focusables = panel ? Array.from(panel.querySelectorAll(FOCUSABLE)) : []
    ;(focusables[0] ?? panel)?.focus()

    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus to whatever opened the dialog — never leave focus on a
      // now-invisible element.
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#0F172A]/40"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={closeable ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`
              focus-ring relative w-full bg-white rounded-xl
              border border-[#E8EDF2] overflow-hidden
              shadow-[0_20px_60px_0_rgba(15,23,42,0.18)]
              ${SIZES[size] || SIZES.md}
              ${className}
            `}
          >
            {/* Header */}
            {(title || closeable) && (
              <div className="flex items-start justify-between px-6 pt-6 pb-0">
                <div className="space-y-0.5">
                  {title && (
                    <h3
                      id={titleId}
                      className="text-base font-semibold text-[#0F172A] leading-snug tracking-tight"
                    >
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-sm text-[#64748B]">{subtitle}</p>
                  )}
                </div>

                {closeable && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="focus-ring tap-target flex items-center justify-center rounded-lg
                               text-[#64748B] hover:bg-[#F1F5F9]
                               transition-colors flex-shrink-0 ml-4"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 pb-6 pt-0 flex items-center justify-end gap-3 border-t border-[#F1F5F9] mt-2 pt-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
