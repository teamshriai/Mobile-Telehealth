import { createContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (next: Theme) => void
  toggleTheme: () => void
}

/** Split from ThemeContext.tsx for the same reason as authContextObject.ts —
 *  see that file's comment. */
export const ThemeContext = createContext<ThemeContextValue | null>(null)
