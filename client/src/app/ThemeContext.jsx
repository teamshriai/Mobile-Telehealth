/**
 * ThemeContext.jsx
 *
 * Light / dark / system theme, applied as a `dark` class on <html>.
 *
 * Two layers, deliberately:
 *
 *   1. localStorage — the immediate layer. Applied before first paint by the
 *      inline script in index.html, so there is no flash of the wrong theme,
 *      and it works on /login and /register where there is no session yet.
 *   2. The account — the cross-device layer. When a profile arrives carrying
 *      `preferences.appearance.theme`, it wins and is written back to
 *      localStorage, so the patient's choice follows them to a new browser.
 *
 * Theme is NOT reset on sign-out, which is a deliberate divergence from
 * AccessibilityContext. Those switches are account-only and reveal a
 * disability, so leaving them applied for the next person on a shared device
 * is a real problem. A theme is a device-level display preference that has to
 * keep working while logged out — resetting it would defeat the sign-in page
 * toggle — and it discloses nothing about the person.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import * as profileService from '../services/profile.service.js'

const STORAGE_KEY = 'strokeai-theme'

const THEME_OPTIONS = ['light', 'dark', 'system']

/** Page ground per theme — kept in sync with --color-bg in index.css. */
const THEME_COLOR = { light: '#E8EDF4', dark: '#14181F' }

const ThemeContext = createContext(null)

const isValidTheme = (v) => THEME_OPTIONS.includes(v)

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(theme) {
  return theme === 'dark' || (theme === 'system' && prefersDark()) ? 'dark' : 'light'
}

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isValidTheme(stored) ? stored : 'system'
  } catch {
    // Private mode / blocked storage — fall back to the OS preference.
    return 'system'
  }
}

function writeStored(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Non-fatal: the theme still applies for this page view.
  }
}

/**
 * Applies the resolved theme to the document. Kept as a module function (not
 * an effect body) so the inline pre-paint script in index.html and this
 * provider stay in visible agreement about what "applying a theme" means.
 */
function applyToDocument(resolved) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])
}

export function ThemeProvider({ children }) {
  const { profile, isAuthenticated } = useAuth()
  const [theme, setThemeState] = useState(readStored)

  // Tracks the last account value we adopted, so a local toggle is not
  // immediately overwritten by the stale profile still held in memory.
  const adoptedServerTheme = useRef(undefined)

  const resolved = useMemo(() => resolve(theme), [theme])

  useEffect(() => {
    applyToDocument(resolved)
  }, [resolved])

  // Follow the OS only while the patient has actually asked us to.
  useEffect(() => {
    if (theme !== 'system') return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyToDocument(resolve('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  // Adopt the account's theme once per distinct value — on sign-in, and on any
  // later reload that genuinely changed it. Guarding on the ref is what stops
  // this from fighting a toggle the patient just made locally.
  useEffect(() => {
    if (profile === null) {
      adoptedServerTheme.current = undefined
      return
    }
    const serverTheme = profile?.preferences?.appearance?.theme
    if (!isValidTheme(serverTheme)) return
    if (adoptedServerTheme.current === serverTheme) return
    adoptedServerTheme.current = serverTheme
    setThemeState(serverTheme)
    writeStored(serverTheme)
  }, [profile])

  const setTheme = useCallback(
    (next) => {
      if (!isValidTheme(next)) return
      setThemeState(next)
      writeStored(next)

      // Best-effort account sync. A patient can be signed in without a patient
      // profile (staff roles have none), in which case this 404s — the local
      // preference is still correct, so the failure is not surfaced.
      if (!isAuthenticated) return
      adoptedServerTheme.current = next
      profileService.updatePreferences({ appearance: { theme: next } }).catch(() => {})
    },
    [isAuthenticated],
  )

  const toggleTheme = useCallback(() => {
    setTheme(resolve(theme) === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme, toggleTheme }),
    [theme, resolved, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
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
