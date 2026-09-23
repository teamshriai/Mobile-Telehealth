import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './themeContextObject'

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  // Not throwing, for the same reason AccessibilityContext does not: a display
  // preference failing to resolve must never be why a page refuses to render.
  return (
    ctx ?? {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
    }
  )
}
