import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import * as authService from '../services/auth.service'

/**
 * AuthContext — the single source of truth for "who is signed in".
 *
 * Phase 1 found useAuth() was a per-component useState hook, so every call
 * site held an independent copy of the user and signing out in the sidebar
 * notified nobody. One provider fixes that.
 *
 * It also owns the ACCESS TOKEN, deliberately in memory rather than
 * localStorage: an XSS payload can read localStorage but cannot read a
 * closure variable. The refresh token lives in an httpOnly cookie the script
 * cannot touch at all, so a page reload restores the session by calling
 * /auth/refresh rather than by persisting a credential to disk.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState([])
  /**
   * The patient's profile row (name, DOB, etc.) from whichever call last
   * populated the session — /auth/me on bootstrap, or the response to
   * login/register/reloadUser. Consumed by AccessibilityContext to read
   * saved accessibility preferences.
   *
   * Bug fix: this field did not exist until now. applySession received a
   * `nextProfile` argument and used it only to derive `user.name`, then
   * discarded it — so AccessibilityContext's `const { profile } = useAuth()`
   * always destructured `undefined`, and a patient's saved largeText/
   * highContrast/reduceMotion preferences never survived a page reload. The
   * CSS rules that respond to those preferences were correct; there was
   * simply nothing feeding them the saved values on mount.
   */
  const [profile, setProfile] = useState(null)
  /** 'checking' until the initial silent refresh settles — see bootstrap below. */
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState(null)
  /**
   * True while login/register is in flight. Bug fix: Login.jsx and
   * Register.jsx have always destructured `loading` from this context, but
   * nothing here ever provided it — so the submit button's spinner/disabled
   * state never activated, and a slow network let a patient submit a login
   * or registration form more than once.
   */
  const [loading, setLoading] = useState(false)

  // Guards against React 18 StrictMode double-invoking the bootstrap effect.
  // Because refresh ROTATES the token, a second concurrent call would replay
  // an already-revoked token and trip server-side reuse detection, signing the
  // user out at startup.
  //
  // The guard must NOT be paired with a `cancelled` flag in the cleanup: under
  // StrictMode the first mount's cleanup runs immediately, so a cancel flag
  // would suppress the only state update while the ref stops the second mount
  // from retrying — leaving status pinned at 'checking' and the entire app
  // stuck behind the session spinner forever. So this effect deliberately
  // completes and commits its result even after unmount. Setting state on an
  // unmounted component is a no-op warning at worst; a permanently blank app
  // is not.
  const bootstrapped = useRef(false)

  const applySession = useCallback((nextUser, nextPermissions, nextProfile) => {
    // /auth/me's `user` is identity-only (email, role — never a name, by
    // design: identity and profile are separate concerns, see the profile
    // module's own header comment). The account menu still needs something
    // better than an email to greet the patient with, so the display name is
    // derived here, once, from whichever profile came back with this
    // response — never fetched again just to fill in a label.
    const displayName = nextProfile
      ? [nextProfile.firstName, nextProfile.lastName].filter(Boolean).join(' ') || undefined
      : undefined

    setUser(nextUser ? { ...nextUser, name: displayName } : null)
    setPermissions(nextPermissions ?? [])
    setProfile(nextProfile ?? null)
    setStatus(nextUser ? 'authenticated' : 'anonymous')
  }, [])

  const clearSession = useCallback(() => {
    authService.clearAccessToken()
    setUser(null)
    setPermissions([])
    setProfile(null)
    setStatus('anonymous')
  }, [])

  /**
   * On mount, try to restore a session from the refresh cookie.
   * A 401 here is the normal "not signed in" path, not an error worth showing.
   */
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    ;(async () => {
      try {
        const { user: u } = await authService.refreshSession()
        const me = await authService.getMe()
        applySession(me?.user ?? u, me?.permissions, me?.profile)
      } catch {
        // Every failure path lands here — no cookie (the normal first-visit
        // case), an expired session, a rate limit, or the API being
        // unreachable. All mean "render as signed out". The status MUST leave
        // 'checking' on every path, or even the public pages never appear.
        clearSession()
      }
    })()
  }, [applySession, clearSession])

  const login = useCallback(async (credentials) => {
    setError(null)
    setLoading(true)
    try {
      await authService.login(credentials)
      const me = await authService.getMe()
      applySession(me.user, me.permissions, me.profile)
      // Returned directly (not read back off context state) so the caller
      // can route correctly on this very call — reading context state here
      // would race the setState calls inside applySession above.
      return {
        success: true,
        role: me.user?.role,
        needsOnboarding: !me.profile?.onboardingCompletedAt,
      }
    } catch (err) {
      setError({ message: err.message, fieldErrors: err.fieldErrors ?? null })
      return { success: false, fieldErrors: err.fieldErrors ?? null }
    } finally {
      setLoading(false)
    }
  }, [applySession])

  const register = useCallback(async (formData) => {
    setError(null)
    setLoading(true)
    try {
      await authService.register(formData)
      const me = await authService.getMe()
      applySession(me.user, me.permissions, me.profile)
      return {
        success: true,
        role: me.user?.role,
        needsOnboarding: !me.profile?.onboardingCompletedAt,
      }
    } catch (err) {
      setError({ message: err.message, fieldErrors: err.fieldErrors ?? null })
      return { success: false, fieldErrors: err.fieldErrors ?? null }
    } finally {
      setLoading(false)
    }
  }, [applySession])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      // Clear locally even if the network call failed — the user asked to
      // leave, and the refresh cookie is scoped so the server session is the
      // only thing that could linger.
      clearSession()
    }
  }, [clearSession])

  /** Re-read the user (e.g. after a profile edit changes the display name). */
  const reloadUser = useCallback(async () => {
    try {
      const me = await authService.getMe()
      applySession(me.user, me.permissions, me.profile)
    } catch {
      clearSession()
    }
  }, [applySession, clearSession])

  const value = useMemo(() => ({
    user,
    permissions,
    profile,
    status,
    error,
    loading,
    isAuthenticated: status === 'authenticated',
    isChecking: status === 'checking',
    role: user?.role ?? null,
    /**
     * True once a role-specific profile exists but its Required-onboarding
     * tier is not yet complete. `profile` is null for a role with no
     * profile at all (should not happen post-registration) — treated the
     * same as "needs onboarding" rather than crashing a guard on it.
     */
    needsOnboarding: status === 'authenticated' && !profile?.onboardingCompletedAt,
    /** UI gating only — the server re-checks every request. */
    can: (permission) => permissions.includes(permission),
    login,
    register,
    logout,
    /**
     * Ends the session locally without a server round-trip — for the case
     * where the server has ALREADY declared the session over (a refresh
     * failure apiClient could not recover from). Bug fix: previously only
     * apiClient's own in-memory token was cleared here; AuthContext's user/
     * status stayed stale at 'authenticated', so `RequireAnonymous` on the
     * login page it was redirected to bounced the user straight back,
     * producing an unrecoverable redirect loop. See SessionExpiryBridge in
     * App.jsx, the only caller.
     */
    endSession: clearSession,
    reloadUser,
    clearError: () => setError(null),
  }), [user, permissions, profile, status, error, loading, login, register, logout, clearSession, reloadUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used within <AuthProvider>. Wrap the app in App.jsx.')
  }
  return ctx
}
