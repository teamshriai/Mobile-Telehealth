import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Premium Modal component
 * Sizes: sm | md | lg | xl | full
 */

const SIZES = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  '2xl':'max-w-3xl',
  full: 'max-w-5xl',
}

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
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`
              relative w-full bg-white rounded-3xl
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
                      className="text-base font-bold text-[#0F172A] leading-snug"
                      style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.01em' }}
                    >
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-[#64748B]">{subtitle}</p>
                  )}
                </div>

                {closeable && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-xl
                               text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9]
                               transition-all duration-200 flex-shrink-0 ml-4"
                  >
                    <X size={15} />
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