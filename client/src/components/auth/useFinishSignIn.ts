import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { homeForRole } from '../../app/roleHome'
import type { AuthResult } from '../../app/authContextObject'

/**
 * A return path from router state, or null.
 *
 * Router state cannot be set by an outside link — `guards.tsx` puts the
 * attempted pathname there — but a path is still checked before it is
 * navigated to: same-origin absolute paths only, never `//host` or `/\host`.
 * There is deliberately no `?next=` query parameter to check instead.
 */
export function safeReturnPath(from: unknown): string | null {
  if (typeof from !== 'string') return null
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) return null
  return from
}

/**
 * Where a successful sign-in goes — the ONE implementation, shared by the
 * Patient and Hospital panels so the two cannot drift apart:
 *
 *   1. unfinished onboarding → /onboarding
 *   2. the page a guard sent them from
 *   3. the home of the ACCOUNT's role — never where the chosen door pointed
 */
export function useFinishSignIn(): (result: AuthResult) => void {
  const navigate = useNavigate()
  const location = useLocation()
  const from = safeReturnPath((location.state as { from?: unknown } | null)?.from)

  return useCallback(
    (result: AuthResult) => {
      if (!result.success) return
      navigate(result.needsOnboarding ? '/onboarding' : (from ?? homeForRole(result.role ?? null)), { replace: true })
    },
    [navigate, from],
  )
}
