/**
 * AccessibilityContext.tsx
 *
 * Applies the patient's saved accessibility preferences to the document.
 *
 * These three switches have existed in Settings since Phase 1, have always
 * validated and persisted correctly, and until now were read by nothing at
 * all — the patient toggled them, saw the toggle move, and the portal did not
 * change. A control that appears to work and does not is the same class of
 * defect as fabricated data: it tells the user something untrue.
 *
 * Implementation is a `data-*` attribute on <html> plus CSS. No component
 * subscribes to this, nothing re-renders on change, and the styling stays in
 * index.css where the rest of the design system lives.
 *
 * Applied optimistically: Settings calls `applyLocal()` the instant a toggle
 * moves, so the change is visible before the PATCH resolves. If the save
 * fails, the next profile load puts it back.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import type { PatientProfile } from '../types/domain'
import {
  AccessibilityContext,
  ACCESSIBILITY_KEYS,
  type AccessibilityKey,
  type AccessibilitySettings,
} from './accessibilityContextObject'

/**
 * The preferences that have a real implementation. `screenReader`,
 * `keyboardNav` and `focusIndicators` are deliberately absent — see the note
 * in Settings.tsx. Adding a key here without a matching CSS rule would
 * recreate exactly the problem this file exists to fix.
 */
const ATTRIBUTE_BY_KEY: Record<AccessibilityKey, string> = {
  largeText: 'data-large-text',
  highContrast: 'data-high-contrast',
  reduceMotion: 'data-reduce-motion',
}

function applyToDocument(settings: AccessibilitySettings): void {
  const root = document.documentElement
  ACCESSIBILITY_KEYS.forEach((key) => {
    const attr = ATTRIBUTE_BY_KEY[key]
    if (settings[key]) root.setAttribute(attr, 'true')
    else root.removeAttribute(attr)
  })
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [overrides, setOverrides] = useState<AccessibilitySettings>({})

  // The server's copy, narrowed to the keys we can actually honour.
  const saved = useMemo<AccessibilitySettings>(() => {
    // Accessibility preferences are a Patient-profile-only field today (see
    // the header comment) — `profile` is typed across every role, so this
    // narrows to the one shape that actually carries it.
    const patientProfile = profile as PatientProfile | null
    const source = (patientProfile?.preferences?.accessibility ?? {}) as Record<string, unknown>
    const acc: AccessibilitySettings = {}
    ACCESSIBILITY_KEYS.forEach((key) => {
      acc[key] = source[key] === true
    })
    return acc
  }, [profile])

  // A local override wins until the profile reloads with the saved value —
  // that is what makes the toggle feel instant.
  const settings = useMemo<AccessibilitySettings>(() => ({ ...saved, ...overrides }), [saved, overrides])

  useEffect(() => {
    applyToDocument(settings)
  }, [settings])

  // Once the server confirms the value we optimistically applied, drop the
  // override so the profile is the single source of truth again.
  useEffect(() => {
    setOverrides((current) => {
      const stale = (Object.keys(current) as AccessibilityKey[]).filter(
        (k) => current[k] === saved[k],
      )
      if (stale.length === 0) return current
      const next = { ...current }
      stale.forEach((k) => delete next[k])
      return next
    })
  }, [saved])

  // Signing out must not leave the next person on a shared device with a
  // stranger's display settings.
  useEffect(() => {
    if (profile === null) applyToDocument({})
  }, [profile])

  const applyLocal = useCallback((key: AccessibilityKey, value: boolean) => {
    if (!ACCESSIBILITY_KEYS.includes(key)) return
    setOverrides((current) => ({ ...current, [key]: value === true }))
  }, [])

  const value = useMemo(() => ({ settings, applyLocal }), [settings, applyLocal])

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}
