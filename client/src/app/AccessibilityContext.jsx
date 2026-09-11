/**
 * AccessibilityContext.jsx
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

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

/**
 * The preferences that have a real implementation. `screenReader`,
 * `keyboardNav` and `focusIndicators` are deliberately absent — see the note
 * in Settings.jsx. Adding a key here without a matching CSS rule would
 * recreate exactly the problem this file exists to fix.
 */
export const ACCESSIBILITY_KEYS = ['largeText', 'highContrast', 'reduceMotion']

const ATTRIBUTE_BY_KEY = {
  largeText: 'data-large-text',
  highContrast: 'data-high-contrast',
  reduceMotion: 'data-reduce-motion',
}

const AccessibilityContext = createContext(null)

function applyToDocument(settings) {
  const root = document.documentElement
  ACCESSIBILITY_KEYS.forEach((key) => {
    const attr = ATTRIBUTE_BY_KEY[key]
    if (settings[key]) root.setAttribute(attr, 'true')
    else root.removeAttribute(attr)
  })
}

export function AccessibilityProvider({ children }) {
  const { profile } = useAuth()
  const [overrides, setOverrides] = useState({})

  // The server's copy, narrowed to the keys we can actually honour.
  const saved = useMemo(() => {
    const source = profile?.preferences?.accessibility ?? {}
    return ACCESSIBILITY_KEYS.reduce((acc, key) => {
      acc[key] = source[key] === true
      return acc
    }, {})
  }, [profile])

  // A local override wins until the profile reloads with the saved value —
  // that is what makes the toggle feel instant.
  const settings = useMemo(() => ({ ...saved, ...overrides }), [saved, overrides])

  useEffect(() => {
    applyToDocument(settings)
  }, [settings])

  // Once the server confirms the value we optimistically applied, drop the
  // override so the profile is the single source of truth again.
  useEffect(() => {
    setOverrides((current) => {
      const stale = Object.keys(current).filter((k) => current[k] === saved[k])
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

  const applyLocal = useCallback((key, value) => {
    if (!ACCESSIBILITY_KEYS.includes(key)) return
    setOverrides((current) => ({ ...current, [key]: value === true }))
  }, [])

  const value = useMemo(() => ({ settings, applyLocal }), [settings, applyLocal])

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  // Not throwing: an accessibility preference failing to apply must never be
  // the reason a page fails to render.
  return ctx ?? { settings: {}, applyLocal: () => {} }
}
