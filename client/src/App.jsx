import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'

import { AuthProvider, useAuth } from './app/AuthContext.jsx'
import { AccessibilityProvider } from './app/AccessibilityContext.jsx'
import { ThemeProvider } from './app/ThemeContext.jsx'
import { RequireAuth, RequireAnonymous, homeForRole } from './app/guards.jsx'
import { setSessionExpiredHandler } from './lib/apiClient'
import ErrorBoundary from './components/feedback/ErrorBoundary.jsx'
import FullPageLoader from './components/feedback/FullPageLoader.jsx'
import PatientLayout from './components/layout/PatientLayout.jsx'

/* ── Public ── */
const Login          = lazy(() => import('./components/auth/Login.jsx'))
const Register       = lazy(() => import('./components/auth/Register.jsx'))
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword.jsx'))
const ResetPassword  = lazy(() => import('./components/auth/ResetPassword.jsx'))
const LegalPlaceholder = lazy(() => import('./pages/LegalPlaceholder.jsx'))
const NotFound       = lazy(() => import('./pages/NotFound.jsx'))

/* ── Patient portal ── */
const PatientHome     = lazy(() => import('./pages/patient/PatientHome.jsx'))
const EmergencyPage   = lazy(() => import('./pages/patient/EmergencyPage.jsx'))
const AppointmentsPage = lazy(() => import('./pages/patient/AppointmentsPage.jsx'))
const MyHealthPage    = lazy(() => import('./pages/patient/MyHealthPage.jsx'))
const AiInsightsPage  = lazy(() => import('./pages/patient/AiInsightsPage.jsx'))
const CareTeamPage    = lazy(() => import('./pages/patient/CareTeamPage.jsx'))
const Profile         = lazy(() => import('./pages/Profile.jsx'))
const Settings        = lazy(() => import('./pages/Settings.jsx'))

/* ── Doctor / Admin: architecture only, no fabricated UI ── */
const PortalComingSoon = lazy(() => import('./pages/portal/PortalComingSoon.jsx'))

/**
 * Wires apiClient's "session is irrecoverably over" signal to a real redirect.
 *
 * apiClient cannot import the router (it would be a cycle, and it is not a
 * component), so it exposes a handler slot that this component fills.
 */
function SessionExpiryBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (!window.location.pathname.startsWith('/login')) {
        navigate('/login', { replace: true, state: { expired: true } })
      }
    })
    return () => setSessionExpiredHandler(() => {})
  }, [navigate])

  return null
}

/**
 * Resolves "/" by session. With the marketing page gone the root is not a page
 * of its own: a visitor belongs on sign-in, and someone already signed in
 * belongs in their portal rather than being bounced through /login's guard.
 */
function RootRedirect() {
  const { isChecking, isAuthenticated, role } = useAuth()

  if (isChecking) return <FullPageLoader label="Loading Stroke AI…" />
  return <Navigate to={isAuthenticated ? homeForRole(role) : '/login'} replace />
}

/** Sends an already-authenticated visitor to the portal their role belongs to. */
function RoleHomeRedirect() {
  const { isChecking, isAuthenticated, role } = useAuth()

  if (isChecking) return <FullPageLoader label="Checking your session…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={homeForRole(role)} replace />
}

export default function App() {
  return (
    // Outermost boundary: catches a throw in a layout or provider, where there
    // is no inner boundary left to handle it.
    <ErrorBoundary label="app-root">
      {/* framer-motion drives animation from JS, so the `prefers-reduced-motion`
          rules in index.css never reached it — only the CSS animations honoured
          the preference. `reducedMotion="user"` makes every motion component in
          the app respect it, which matters on a product whose users include
          people with vestibular symptoms after a stroke. */}
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          {/* Inside AuthProvider: it reads the profile the session provides.
              Above the routes so a preference applies to every page, not just
              the one the patient happened to be on when they set it.

              ThemeProvider sits here for the same reason, and specifically
              above the routes rather than inside PatientLayout: the auth pages
              are routed here too, so this is what puts the theme switch on the
              sign-in and sign-up screens. */}
          <ThemeProvider>
            <AccessibilityProvider>
              <SessionExpiryBridge />
              <Suspense fallback={<FullPageLoader label="Loading Stroke AI…" />}>
                <Routes>
                  {/* ── Public ──
                      There is no marketing page in this app, so "/" is not a
                      destination — it resolves to wherever the visitor
                      actually belongs. /landing is kept as a redirect only so
                      existing bookmarks and emailed links do not 404. */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/landing" element={<Navigate to="/" replace />} />

                  <Route path="/login"           element={<RequireAnonymous><Login /></RequireAnonymous>} />
                  <Route path="/register"        element={<RequireAnonymous><Register /></RequireAnonymous>} />
                  <Route path="/forgot-password" element={<RequireAnonymous><ForgotPassword /></RequireAnonymous>} />
                  <Route path="/reset-password"  element={<RequireAnonymous><ResetPassword /></RequireAnonymous>} />

                  <Route path="/terms"   element={<LegalPlaceholder title="Terms of Service" />} />
                  <Route path="/privacy" element={<LegalPlaceholder title="Privacy Policy" />} />

                  {/* ── Patient portal (role: Patient) ── */}
                  <Route
                    path="/app"
                    element={
                      <RequireAuth roles={['Patient']}>
                        <PatientLayout />
                      </RequireAuth>
                    }
                  >
                    <Route index                element={<PatientHome />} />
                    <Route path="appointments"  element={<AppointmentsPage />} />
                    <Route path="medicines"     element={<MedicinesRoute />} />
                    <Route path="health"        element={<MyHealthPage />} />
                    <Route path="ai-insights"   element={<AiInsightsPage />} />
                    <Route path="care-team"     element={<CareTeamPage />} />
                    <Route path="emergency"     element={<EmergencyPage />} />
                    <Route path="profile"       element={<Profile />} />
                    <Route path="settings"      element={<Settings />} />
                  </Route>

                  {/* ── Doctor portal (role: Doctor, HealthcareWorker, LabTechnician) ── */}
                  <Route
                    path="/clinic/*"
                    element={
                      <RequireAuth roles={['Doctor', 'HealthcareWorker', 'LabTechnician']}>
                        <PortalComingSoon portal="Doctor" />
                      </RequireAuth>
                    }
                  />

                  {/* ── Admin portal (role: Admin) ── */}
                  <Route
                    path="/admin/*"
                    element={
                      <RequireAuth roles={['Admin']}>
                        <PortalComingSoon portal="Admin" />
                      </RequireAuth>
                    }
                  />

                  {/* Legacy /dashboard/* links (bookmarks, emails) → the new portal.
                      Removing them outright would 404 every existing bookmark. */}
                  <Route path="/dashboard/profile"  element={<Navigate to="/app/profile" replace />} />
                  <Route path="/dashboard/settings" element={<Navigate to="/app/settings" replace />} />
                  <Route path="/dashboard/*"        element={<RoleHomeRedirect />} />
                  <Route path="/dashboard"          element={<RoleHomeRedirect />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AccessibilityProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  )
}

/* Named wrappers so each lazy module chunk stays separate and the route table
   above reads as a list of destinations rather than of imports. */
const Modules = {
  // Medicines has no backing Medication model — stays an honest placeholder.
  Medicines: lazy(() => import('./pages/patient/modules.jsx').then((m) => ({ default: m.MedicinesPage }))),
}

function MedicinesRoute() { return <Modules.Medicines /> }
