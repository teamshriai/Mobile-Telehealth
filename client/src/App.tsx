import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'

import { AuthProvider } from './app/AuthContext'
import { useAuth } from './app/useAuth'
import { AccessibilityProvider } from './app/AccessibilityContext'
import { ThemeProvider } from './app/ThemeContext'
import { RequireAuth, RequireAnonymous } from './app/guards'
import { PatientContextProvider } from './app/PatientContextProvider'
import { ToastProvider } from './components/common/ToastProvider'
import { homeForRole } from './app/roleHome'
import { setSessionExpiredHandler } from './lib/apiClient'
import ErrorBoundary from './components/feedback/ErrorBoundary'
import FullPageLoader from './components/feedback/FullPageLoader'
import AppShell from './components/layout/AppShell'

/* ── Public ── */
const Login          = lazy(() => import('./components/auth/Login'))
const Register       = lazy(() => import('./components/auth/Register'))
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'))
const ResetPassword  = lazy(() => import('./components/auth/ResetPassword'))
const LegalPlaceholder = lazy(() => import('./pages/LegalPlaceholder'))
const NotFound       = lazy(() => import('./pages/NotFound'))

/* ── Patient portal ── */
const PatientHome     = lazy(() => import('./pages/patient/PatientHome'))
const EmergencyPage   = lazy(() => import('./pages/patient/EmergencyPage'))
const AppointmentsPage = lazy(() => import('./pages/patient/AppointmentsPage'))
const MyHealthPage    = lazy(() => import('./pages/patient/MyHealthPage'))
const AiInsightsPage  = lazy(() => import('./pages/patient/AiInsightsPage'))
const CareTeamPage    = lazy(() => import('./pages/patient/CareTeamPage'))
const Profile         = lazy(() => import('./pages/Profile'))
const Settings        = lazy(() => import('./pages/Settings'))

/* ── Onboarding (Patient / Doctor / Hospital Admin) ── */
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage'))

/* ── Clinician portal (UI_ATLAS M-06) ──
    Routes match the atlas exactly: /clinician, /patient/:id/chart,
    /encounter/:id/note. The old /clinic/* paths survive only as redirects
    below, so existing bookmarks do not 404. */
const ClinicianHome      = lazy(() => import('./pages/clinician/ClinicianHome'))
const ClinicianPatients  = lazy(() => import('./pages/clinician/ClinicianPatients'))
const CosignQueue        = lazy(() => import('./pages/clinician/CosignQueue'))
const TemplateManager    = lazy(() => import('./pages/clinician/TemplateManager'))
const BreakGlassReview   = lazy(() => import('./pages/clinician/BreakGlassReview'))

/* Patient-scoped and encounter-scoped trees. Each has a layout route that
   resolves access ONCE — see PatientShell/EncounterShell on why the
   break-glass and denied branches must not be per-screen. */
const PatientShell        = lazy(() => import('./pages/clinician/PatientShell'))
const PatientChart        = lazy(() => import('./pages/clinician/PatientChart'))
const PatientTimeline     = lazy(() => import('./pages/clinician/PatientTimeline'))
const EncounterShell      = lazy(() => import('./pages/clinician/EncounterShell'))
const ConsultationNote    = lazy(() => import('./pages/clinician/ConsultationNote'))
const ProblemList         = lazy(() => import('./pages/clinician/ProblemList'))
const PrescriptionWriter  = lazy(() => import('./pages/clinician/PrescriptionWriter'))
const PatientInstructions = lazy(() => import('./pages/clinician/PatientInstructions'))

/* Availability and Profile are working features that the atlas's M-06 nav has
   no place for. They move to the account menu rather than being deleted. */
const DoctorAvailabilityPage = lazy(() => import('./pages/clinic/DoctorAvailabilityPage'))
const DoctorProfilePage      = lazy(() => import('./pages/clinic/DoctorProfilePage'))

/* ── Hospital Admin portal ── */
const HospitalAdminOverview        = lazy(() => import('./pages/hospitalAdmin/HospitalAdminOverview'))
const HospitalAdminDoctorsPage     = lazy(() => import('./pages/hospitalAdmin/HospitalAdminDoctorsPage'))
const HospitalAdminPatientsPage    = lazy(() => import('./pages/hospitalAdmin/HospitalAdminPatientsPage'))
const HospitalAdminHospitalPage    = lazy(() => import('./pages/hospitalAdmin/HospitalAdminHospitalPage'))
const HospitalAdminAppointmentsPage = lazy(() => import('./pages/hospitalAdmin/HospitalAdminAppointmentsPage'))
const HospitalAdminFeedbackPage    = lazy(() => import('./pages/hospitalAdmin/HospitalAdminFeedbackPage'))

/* ── HealthcareWorker/LabTechnician/Admin: architecture only, no fabricated UI ── */
const PortalComingSoon = lazy(() => import('./pages/portal/PortalComingSoon'))

/**
 * `/clinician` is reachable by four roles, but only Doctor and Resident have a
 * real workspace (see PortalComingSoon.tsx on why HealthcareWorker and
 * LabTechnician stay on the placeholder — their modules M-14/M-15 are not in
 * this release, and GP-02 says a module you cannot enter is absent, not
 * disabled). Branching here — rather than two competing route trees both
 * matching "/clinician" — avoids React Router picking whichever one happens to
 * rank first regardless of which role is actually signed in.
 */
const CLINICAL_AUTHORS = new Set(['Doctor', 'Resident'])

/** Roles allowed past the door at all. Narrower than CLINICAL_AUTHORS is wide:
 *  these four may reach /clinician, but only the two above see a workspace. */
const CLINICIAN_ROLES = ['Doctor', 'Resident', 'HealthcareWorker', 'LabTechnician']

function ClinicianPortalGate() {
  const { role } = useAuth()
  if (!CLINICAL_AUTHORS.has(role ?? '')) return <PortalComingSoon />
  return <AppShell />
}

/**
 * Wires apiClient's "session is irrecoverably over" signal to a real redirect.
 *
 * apiClient cannot import the router (it would be a cycle, and it is not a
 * component), so it exposes a handler slot that this component fills.
 */
function SessionExpiryBridge() {
  const navigate = useNavigate()
  const { endSession } = useAuth()

  useEffect(() => {
    setSessionExpiredHandler(() => {
      // Bug fix: this used to only navigate, leaving AuthContext's user/
      // status stale at 'authenticated'. RequireAnonymous would then see an
      // "authenticated" user on the very /login page it was just sent to
      // and redirect straight back to the portal, which immediately re-fired
      // the same failing request — an unrecoverable loop. Clearing the
      // session here first is what makes /login actually render.
      endSession()
      if (!window.location.pathname.startsWith('/login')) {
        navigate('/login', { replace: true, state: { expired: true } })
      }
    })
    return () => setSessionExpiredHandler(() => {})
  }, [navigate, endSession])

  return null
}

/**
 * Resolves "/" by session. With the marketing page gone the root is not a page
 * of its own: a visitor belongs on sign-in, and someone already signed in
 * belongs in their portal rather than being bounced through /login's guard.
 */
function RootRedirect() {
  const { isChecking, isAuthenticated, role, needsOnboarding } = useAuth()

  if (isChecking) return <FullPageLoader label="Loading Stroke AI…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={needsOnboarding ? '/onboarding' : homeForRole(role)} replace />
}

/** Sends an already-authenticated visitor to the portal their role belongs to. */
function RoleHomeRedirect() {
  const { isChecking, isAuthenticated, role, needsOnboarding } = useAuth()

  if (isChecking) return <FullPageLoader label="Checking your session…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={needsOnboarding ? '/onboarding' : homeForRole(role)} replace />
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
              {/* ToastProvider and PatientContextProvider sit above the route
                  table, not inside a layout: the Z3 patient banner is rendered
                  by AppShell but PUBLISHED by whichever /patient/* or
                  /encounter/* screen is mounted, so the store has to outlive
                  both. */}
              <ToastProvider>
              <PatientContextProvider>
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

                  {/* ── Onboarding (role: Patient, Doctor, HospitalAdmin) ──
                      Reachable by any authenticated role with a real
                      onboarding flow — RequireAuth itself decides whether to
                      redirect a signed-in visitor here (see needsOnboarding
                      in guards.tsx), this route just has to allow them in. */}
                  <Route
                    path="/onboarding"
                    element={
                      <RequireAuth roles={['Patient', 'Doctor', 'HospitalAdmin']}>
                        <OnboardingPage />
                      </RequireAuth>
                    }
                  />

                  {/* ── Patient portal (role: Patient) ── */}
                  <Route
                    path="/app"
                    element={
                      <RequireAuth roles={['Patient']}>
                        <AppShell />
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

                  {/* ── Clinician portal (Doctor, Resident; placeholder for
                      HealthcareWorker/LabTechnician) ── */}
                  <Route
                    path="/clinician"
                    element={
                      <RequireAuth roles={CLINICIAN_ROLES}>
                        <ClinicianPortalGate />
                      </RequireAuth>
                    }
                  >
                    <Route index               element={<ClinicianHome />} />
                    <Route path="patients"     element={<ClinicianPatients />} />
                    <Route path="cosign"       element={<CosignQueue />} />
                    <Route path="templates"    element={<TemplateManager />} />
                    <Route path="availability" element={<DoctorAvailabilityPage />} />
                    <Route path="profile"      element={<DoctorProfilePage />} />
                  </Route>

                  {/* ── Patient-scoped clinical record (atlas routes) ──
                      Top-level rather than nested under /clinician: a chart is
                      about a patient, not about a portal, and the atlas paths
                      are /patient/:id/* exactly. */}
                  <Route
                    path="/patient/:shriPatientId"
                    element={
                      <RequireAuth roles={CLINICIAN_ROLES}>
                        <AppShell />
                      </RequireAuth>
                    }
                  >
                    <Route element={<PatientShell />}>
                      <Route index             element={<Navigate to="chart" replace />} />
                      <Route path="chart"      element={<PatientChart />} />
                      <Route path="timeline"   element={<PatientTimeline />} />
                    </Route>
                  </Route>

                  {/* ── Encounter-scoped consultation workspace ── */}
                  <Route
                    path="/encounter/:visitId"
                    element={
                      <RequireAuth roles={CLINICIAN_ROLES}>
                        <AppShell />
                      </RequireAuth>
                    }
                  >
                    <Route element={<EncounterShell />}>
                      <Route index                element={<Navigate to="note" replace />} />
                      <Route path="note"          element={<ConsultationNote />} />
                      <Route path="problems"      element={<ProblemList />} />
                      <Route path="rx"            element={<PrescriptionWriter />} />
                      <Route path="instructions"  element={<PatientInstructions />} />
                    </Route>
                  </Route>

                  {/* Legacy /clinic/* links → the atlas routes. Same reasoning
                      as the /dashboard/* redirects below. */}
                  <Route path="/clinic/patients"     element={<Navigate to="/clinician/patients" replace />} />
                  <Route path="/clinic/availability" element={<Navigate to="/clinician/availability" replace />} />
                  <Route path="/clinic/profile"      element={<Navigate to="/clinician/profile" replace />} />
                  <Route path="/clinic/*"            element={<Navigate to="/clinician" replace />} />
                  <Route path="/clinic"              element={<Navigate to="/clinician" replace />} />

                  {/* ── Hospital Admin portal (role: HospitalAdmin) ── */}
                  <Route
                    path="/hospital-admin"
                    element={
                      <RequireAuth roles={['HospitalAdmin']}>
                        <AppShell />
                      </RequireAuth>
                    }
                  >
                    <Route index              element={<HospitalAdminOverview />} />
                    <Route path="doctors"     element={<HospitalAdminDoctorsPage />} />
                    <Route path="patients"    element={<HospitalAdminPatientsPage />} />
                    <Route path="hospital"    element={<HospitalAdminHospitalPage />} />
                    <Route path="appointments" element={<HospitalAdminAppointmentsPage />} />
                    <Route path="feedback"    element={<HospitalAdminFeedbackPage />} />
                  </Route>

                  {/* ── Admin portal (role: Admin) ──
                      ⚠️ Emergency-access review lives HERE, not in the
                      clinician portal, because `breakglass:review:any` is held
                      by Admin — a role with no clinical read at all. That is
                      the point: reviewing THAT an access happened must never
                      require the reviewer to see what was accessed. The
                      specific route is declared before the catch-all, which
                      still lands on the honest placeholder. */}
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth roles={['Admin']}>
                        <AppShell />
                      </RequireAuth>
                    }
                  >
                    <Route path="breakglass-review" element={<BreakGlassReview />} />
                  </Route>
                  <Route
                    path="/admin/*"
                    element={
                      <RequireAuth roles={['Admin']}>
                        <PortalComingSoon />
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
              </PatientContextProvider>
              </ToastProvider>
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
  Medicines: lazy(() => import('./pages/patient/modules').then((m) => ({ default: m.MedicinesPage }))),
}

function MedicinesRoute() { return <Modules.Medicines /> }
