import { useContext } from 'react'
import { AccessibilityContext, type AccessibilityContextValue } from './accessibilityContextObject'

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext)
  // Not throwing: an accessibility preference failing to apply must never be
  // the reason a page fails to render.
  return ctx ?? { settings: {}, applyLocal: () => {} }
}
