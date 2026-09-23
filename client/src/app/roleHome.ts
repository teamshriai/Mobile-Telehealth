/**
 * Where each role belongs after signing in.
 *
 * Split out of guards.tsx so that file exports components only — a file
 * mixing a component export with a plain-object export costs every consumer
 * a full reload instead of a fast refresh (react-refresh/only-export-components).
 */
export const ROLE_HOME: Record<string, string> = {
  Patient: '/app',
  Doctor: '/clinician',
  // ⚠️ Without this a Resident falls through to the '/app' default and is
  // sent to the PATIENT portal — a clinician landing in a patient's portal
  // is both broken and alarming.
  Resident: '/clinician',
  // Admin's one working screen this release is the break-glass review queue.
  Admin: '/admin/breakglass-review',
  HealthcareWorker: '/clinician',
  LabTechnician: '/clinician',
  HospitalAdmin: '/hospital-admin',
}

export function homeForRole(role: string | null | undefined): string {
  return (role && ROLE_HOME[role]) ?? '/app'
}
