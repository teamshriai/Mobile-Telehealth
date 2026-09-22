import { Navigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext.jsx'
import PatientOnboarding from './PatientOnboarding.jsx'
import DoctorOnboarding from './DoctorOnboarding.jsx'
import HospitalAdminOnboarding from './HospitalAdminOnboarding.jsx'

/**
 * Dispatches to the role-specific onboarding flow. Mounted once at
 * /onboarding — RequireAuth (see guards.jsx) sends any authenticated user
 * with an incomplete Required tier here, and it stays reachable afterwards
 * for Recommended/Optional fields.
 */
export default function OnboardingPage() {
  const { role } = useAuth()

  if (role === 'Doctor') return <DoctorOnboarding />
  if (role === 'HospitalAdmin') return <HospitalAdminOnboarding />
  if (role === 'Patient') return <PatientOnboarding />

  // Admin/HealthcareWorker/LabTechnician have no onboarding flow (see
  // ONBOARDABLE_ROLES in guards.jsx) — this route should be unreachable for
  // them, but redirect home rather than render nothing if it ever is.
  return <Navigate to="/" replace />
}
