import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { ToastContext, type Toast, type ToastTone } from './toastContextObject'

/**
 * Toasts — the app had no way at all to confirm an async action, so every
 * screen invented an inline "Saved" chip.
 *
 * ⚠️ THE SAFETY RULE THIS OBEYS (UI_ATLAS §5.7): a notification MUST NOT
 * STEAL FOCUS. *"Stealing focus mid-dictation or mid-dose-entry is a safety
 * hazard."* So this renders into a single polite `aria-live` region and
 * never calls `.focus()`, never renders a dialog, and never traps.
 *
 * It follows that a toast can only ever be an ANNOUNCEMENT. Anything a
 * clinician must actually act on belongs in a `Banner` on the screen or a
 * `ConfirmDialog` — never here, where it disappears on a timer.
 */

const DISMISS_AFTER_MS = 5000

const TONES: Record<ToastTone, { cls: string; Icon: typeof Info }> = {
  success: { cls: 'border-success-fg/30 bg-success-bg text-success-fg', Icon: CheckCircle2 },
  error: { cls: 'border-critical-fg/30 bg-critical-bg text-critical-fg', Icon: AlertTriangle },
  info: { cls: 'border-info-fg/30 bg-info-bg text-info-fg', Icon: Info },
}

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success'): string => {
      counter.current += 1
      const id = `toast-${counter.current}`
      setToasts((current) => [...current, { id, tone, message }])
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* ⚠️ `role="status"` + `aria-live="polite"`, never "assertive" — see
          the header. pointer-events-none on the stack so a toast can never
          swallow a click meant for the screen underneath. */}
      <div
        role="status"
        aria-live="polite"
        className="safe-inset-b pointer-events-none fixed right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { cls, Icon } = TONES[toast.tone]
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-card-lg ${cls}`}
              >
                <Icon size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
                <p className="min-w-0 flex-1 text-sm leading-relaxed">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="focus-ring -mr-1 flex-shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
