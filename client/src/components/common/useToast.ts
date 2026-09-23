import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from './toastContextObject'

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (ctx === null) {
    throw new Error('useToast must be used within <ToastProvider>. Wrap the app in App.tsx.')
  }
  return ctx
}
