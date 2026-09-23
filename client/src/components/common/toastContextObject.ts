import { createContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  tone: ToastTone
  message: string
}

export interface ToastContextValue {
  /** Announce something. Returns the toast id so a caller can dismiss early. */
  notify: (message: string, tone?: ToastTone) => string
  dismiss: (id: string) => void
}

/** Split from the provider component for react-refresh/only-export-components,
 *  the same three-way split AuthContext and ThemeContext already use. */
export const ToastContext = createContext<ToastContextValue | null>(null)
