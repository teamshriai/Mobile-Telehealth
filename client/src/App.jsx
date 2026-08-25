import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

/* ── Layout ── */
import AppLayout from './components/layout/AppLayout.jsx'

/* ── Auth Components (moved to components/auth/) ── */
const Login         = lazy(() => import('./components/auth/Login.jsx'))
const Register      = lazy(() => import('./components/auth/Register.jsx'))
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword.jsx'))
const ResetPassword  = lazy(() => import('./components/auth/ResetPassword.jsx'))

/* ── Pages ── */
const LandingPage   = lazy(() => import('./components/landing/LandingPage.jsx'))
const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'))
const Timeline      = lazy(() => import('./pages/Timeline.jsx'))
const MedicalRecords = lazy(() => import('./pages/MedicalRecords.jsx'))
const Reports       = lazy(() => import('./pages/Reports.jsx'))
const Appointments  = lazy(() => import('./pages/Appointments.jsx'))
const Meetings      = lazy(() => import('./pages/Meetings.jsx'))
const AIAssistant   = lazy(() => import('./pages/AIAssistant.jsx'))
const Profile       = lazy(() => import('./pages/Profile.jsx'))
const Settings      = lazy(() => import('./pages/Settings.jsx'))
const NotFound      = lazy(() => import('./pages/NotFound.jsx'))
const LegalPlaceholder = lazy(() => import('./pages/LegalPlaceholder.jsx'))

/* ── Platform demo (public, unauthenticated role previews) ── */
const DemoIndex        = lazy(() => import('./pages/demo/DemoIndex.jsx'))
const DemoCommandCentre = lazy(() => import('./pages/demo/CommandCentre.jsx'))
const DemoAmbulance    = lazy(() => import('./pages/demo/Ambulance.jsx'))
const DemoScanLab      = lazy(() => import('./pages/demo/ScanLab.jsx'))
const DemoAiRadiologist = lazy(() => import('./pages/demo/AiRadiologist.jsx'))
const DemoHospitalHub  = lazy(() => import('./pages/demo/HospitalHub.jsx'))
const DemoTelehealth   = lazy(() => import('./pages/demo/Telehealth.jsx'))

/* ── Auth helpers ── */
const isAuthenticated = () => {
  try {
    return window.localStorage.getItem('oncotrace_session') === 'active'
  } catch {
    return false
  }
}

const ProtectedRoute = ({ children }) =>
  isAuthenticated() ? children : <Navigate to="/landing" replace />

const PublicRoute = ({ children }) =>
  isAuthenticated() ? <Navigate to="/dashboard" replace /> : children

// Same idea as PublicRoute, but renders LandingPage instead of arbitrary
// children — used for "/" and "/landing" so the auth check happens at this
// component's own render time rather than being baked into a route element
// once at App's initial render (which could otherwise go stale and cause a
// redirect loop, e.g. right after an account deletion navigates to "/landing").
const RootRoute = () =>
  isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LandingPage />

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Public routes ── */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/landing" element={<RootRoute />} />
          <Route
            path="/login"
            element={<PublicRoute><Login /></PublicRoute>}
          />
          <Route
            path="/register"
            element={<PublicRoute><Register /></PublicRoute>}
          />
          <Route
            path="/forgot-password"
            element={<PublicRoute><ForgotPassword /></PublicRoute>}
          />
          <Route
            path="/reset-password"
            element={<PublicRoute><ResetPassword /></PublicRoute>}
          />
          <Route path="/terms" element={<LegalPlaceholder title="Terms of Service" />} />
          <Route path="/privacy" element={<LegalPlaceholder title="Privacy Policy" />} />

          {/* ── Platform demo (public role previews, no auth) ── */}
          <Route path="/demo" element={<DemoIndex />} />
          <Route path="/demo/command-centre" element={<DemoCommandCentre />} />
          <Route path="/demo/ambulance" element={<DemoAmbulance />} />
          <Route path="/demo/scan-lab" element={<DemoScanLab />} />
          <Route path="/demo/ai-radiologist" element={<DemoAiRadiologist />} />
          <Route path="/demo/hospital-hub" element={<DemoHospitalHub />} />
          <Route path="/demo/telehealth" element={<DemoTelehealth />} />

          {/* ── Protected routes ── */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
          >
            <Route index                  element={<Dashboard />} />
            <Route path="timeline"        element={<Timeline />} />
            <Route path="medical-records" element={<MedicalRecords />} />
            <Route path="reports"         element={<Reports />} />
            <Route path="appointments"    element={<Appointments />} />
            <Route path="meetings"        element={<Meetings />} />
            <Route path="ai"              element={<AIAssistant />} />
            <Route path="profile"         element={<Profile />} />
            <Route path="settings"        element={<Settings />} />
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div role="status" className="space-y-3">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading your care workspace…</p>
      </div>
    </div>
  )
}
