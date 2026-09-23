import { createContext } from 'react'

export const ACCESSIBILITY_KEYS = ['largeText', 'highContrast', 'reduceMotion'] as const
export type AccessibilityKey = (typeof ACCESSIBILITY_KEYS)[number]

export type AccessibilitySettings = Partial<Record<AccessibilityKey, boolean>>

export interface AccessibilityContextValue {
  settings: AccessibilitySettings
  applyLocal: (key: AccessibilityKey, value: boolean) => void
}

/** Split from AccessibilityContext.tsx for the same reason as
 *  authContextObject.ts — see that file's comment. */
export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)
