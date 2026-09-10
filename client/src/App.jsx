import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'

import { AuthProvider, useAuth } from './app/AuthContext.jsx'
import { RequireAuth, RequireAnonymous, homeForRole } from './app/guards.jsx'
import { setSessionExpiredHandler } from './lib/apiClient'
import ErrorBoundary from './components/feedback/ErrorBoundary.jsx'
import FullPageLoader from './components/feedback/FullPageLoader.jsx'
import PatientLayout from './components/layout/PatientLayout.jsx'

/* ── Public ── */
const LandingPage    = lazy(() => import('./components/landing/LandingPage.jsx'))
const Login          = lazy(() => import('./components/auth/Login.jsx'))
const Register       = lazy(() => import('./components/auth/Register.jsx'))
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword.jsx'))
const ResetPassword  = lazy(() => import('./components/auth/ResetPassword.jsx'))
const LegalPlaceholder = lazy(() => import('./pages/LegalPlaceholder.jsx'))
const NotFound       = lazy(() => import('./pages/NotFound.jsx'))

/* ── Platform demo (public, explicitly badged as a preview) ── */
const DemoIndex         = lazy(() => import('./pages/demo/DemoIndex.jsx'))
const DemoCommandCentre = lazy(() => import('./pages/demo/CommandCentre.jsx'))
const DemoAmbulance     = lazy(() => import('./pages/demo/Ambulance.jsx'))
const DemoScanLab       = lazy(() => import('./pages/demo/ScanLab.jsx'))
const DemoAiRadiologist = lazy(() => import('./pages/demo/AiRadiologist.jsx'))
const DemoHospitalHub   = lazy(() => import('./pages/demo/HospitalHub.jsx'))
const DemoTelehealth    = lazy(() => import('./pages/demo/Telehealth.jsx'))

/* ── Patient portal ── */
const PatientHome     = lazy(() => import('./pages/patient/PatientHome.jsx'))
const EmergencyPage   = lazy(() => import('./pages/patient/EmergencyPage.jsx'))
const AppointmentsPage = lazy(() => import('./pages/patient/AppointmentsPage.jsx'))
const MyHealthPage    = lazy(() => import('./pages/patient/MyHealthPage.jsx'))
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
      <BrowserRouter>
        <AuthProvider>
          <SessionExpiryBridge />
          <Suspense fallback={<FullPageLoader label="Loading Stroke AI…" />}>
            <Routes>
              {/* ── Public ── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<Navigate to="/" replace />} />

              <Route path="/login"           element={<RequireAnonymous><Login /></RequireAnonymous>} />
              <Route path="/register"        element={<RequireAnonymous><Register /></RequireAnonymous>} />
              <Route path="/forgot-password" element={<RequireAnonymous><ForgotPassword /></RequireAnonymous>} />
              <Route path="/reset-password"  element={<RequireAnonymous><ResetPassword /></RequireAnonymous>} />

              <Route path="/terms"   element={<LegalPlaceholder title="Terms of Service" />} />
              <Route path="/privacy" element={<LegalPlaceholder title="Privacy Policy" />} />

              {/* ── Platform demo ── */}
              <Route path="/demo"                  element={<DemoIndex />} />
              <Route path="/demo/command-centre"   element={<DemoCommandCentre />} />
              <Route path="/demo/ambulance"        element={<DemoAmbulance />} />
              <Route path="/demo/scan-lab"         element={<DemoScanLab />} />
              <Route path="/demo/ai-radiologist"   element={<DemoAiRadiologist />} />
              <Route path="/demo/hospital-hub"     element={<DemoHospitalHub />} />
              <Route path="/demo/telehealth"       element={<DemoTelehealth />} />

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
        </AuthProvider>
      </BrowserRouter>
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
