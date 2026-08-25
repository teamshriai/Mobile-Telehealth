import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "oncotrace-theme"

function applyThemeClass(theme) {
  const root = document.documentElement
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", isDark)
}

/**
 * Per-device theme preference — 'light' | 'dark' | 'system'. Persisted to
 * localStorage only (not sensitive, no reason to round-trip through the
 * backend or encrypt it). Note: only a couple of components currently use
 * Tailwind's `dark:` variant, so switching this has limited visible effect
 * today — it's a real, correctly-wired mechanism, not a claim that the
 * whole dashboard has a finished dark theme.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "light"
    return localStorage.getItem(STORAGE_KEY) || "light"
  })

  useEffect(() => {
    applyThemeClass(theme)
    localStorage.setItem(STORAGE_KEY, theme)

    if (theme !== "system") return undefined

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyThemeClass("system")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = useCallback((next) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  )

  return { theme, setTheme, toggleTheme }
}
