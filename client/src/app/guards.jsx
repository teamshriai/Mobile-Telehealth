import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import FullPageLoader from '../components/feedback/FullPageLoader.jsx'

/**
 * Route guards.
 *
 * These are a UX affordance ONLY — they decide what to render, never what a
 * user is allowed to have. Every protected endpoint re-authorises server-side.
 * A user who edits their role in memory gets a different screen and exactly
 * the same 403s.
 *
 * Phase 1 found the old guard read `localStorage.oncotrace_session === 'active'`
 * and never inspected the token or its expiry. Now the source of truth is
 * AuthContext, whose state comes from a server round-trip.
 */

/** Where each role belongs after signing in. */
export const ROLE_HOME = {
  Patient: '/app',
  Doctor: '/clinic',
  Admin: '/admin',
  HealthcareWorker: '/clinic',
  LabTechnician: '/clinic',
  HospitalAdmin: '/hospital-admin',
}

export function homeForRole(role) {
  return ROLE_HOME[role] ?? '/app'
}

/** Roles that have a real onboarding flow at /onboarding. Admin,
 *  HealthcareWorker and LabTechnician are seed/ops-created only today (see
 *  auth architecture notes) — they never need to be routed there. */
const ONBOARDABLE_ROLES = ['Patient', 'Doctor', 'HospitalAdmin']

/**
 * Requires a signed-in user. Optionally restricts to specific roles.
 *
 * While the initial refresh is in flight we must render a loader rather than
 * redirect: bouncing to /login on first paint and back again once the session
 * resolves is a visible flash and loses the requested URL.
 */
export function RequireAuth({ children, roles }) {
  const { isAuthenticated, isChecking, role, needsOnboarding } = useAuth()
  const location = useLocation()

  if (isChecking) return <FullPageLoader label="Checking your session…" />

  if (!isAuthenticated) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(role)) {
    // Signed in, wrong portal. Send them to their own rather than showing a
    // 403 — it is not an error, they are just in the wrong place.
    return <Navigate to={homeForRole(role)} replace />
  }

  // Required-tier onboarding not yet complete: redirect into it rather than
  // the portal, UNLESS this IS the onboarding route (which also renders
  // under RequireAuth) or the role has no onboarding flow at all. Once
  // onboarding is complete this never fires again — the route stays freely
  // reachable afterwards for filling in Recommended/Optional fields.
  if (
    needsOnboarding &&
    ONBOARDABLE_ROLES.includes(role) &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

/**
 * For pages that only make sense signed OUT (login, register, reset).
 * An authenticated user landing here goes to their role's home.
 */
export function RequireAnonymous({ children }) {
  const { isAuthenticated, isChecking, role } = useAuth()

  if (isChecking) return <FullPageLoader label="Checking your session…" />
  if (isAuthenticated) return <Navigate to={homeForRole(role)} replace />

  return children
}
