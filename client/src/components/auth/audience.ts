import { Building2, FlaskConical, GraduationCap, HeartHandshake, ShieldCheck, Stethoscope } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RoleName } from '../../types/domain'

/**
 * Who a sign-in screen is addressed to: the two doors on the entry page.
 *
 * ⚠️ THIS IS COPY AND LAYOUT, NEVER AUTHORITY. The entry page asks "Patient or
 * Hospital?" — and the Hospital screen "Which role defines you best?" — so each
 * person meets the sign-in method and wording that fits them. None of it is
 * sent to the server: the login payload is email + password (or a one-time
 * code), and after sign-in the ROLE ON THE ACCOUNT decides the portal. A doctor
 * who signs in through "Patient" still lands in the Clinician Portal, and a
 * patient who picks "Doctor" gains nothing.
 *
 * Kept out of the component files because Fast Refresh cannot hot-swap a
 * module that mixes components with other exports.
 */
export type Audience = 'patient' | 'hospital'

/**
 * `?as=` → a door. `clinician` was the Doctor / Clinician door until 26 Sep
 * 2026; old bookmarks and links still work, and now open the Hospital door.
 */
export function parseAudience(raw: string | null): Audience | null {
  if (raw === 'patient') return 'patient'
  if (raw === 'hospital' || raw === 'clinician') return 'hospital'
  return null
}

export const AUDIENCE_COPY: Record<Audience, { title: string; blurb: string; signInHeading: string }> = {
  patient: {
    title: 'Patient',
    blurb: 'Access your health records, appointments, medicines, care team and telehealth.',
    signInHeading: 'Patient sign in',
  },
  hospital: {
    title: 'Hospital',
    blurb: 'For doctors, nurses, lab staff and administrators — patients, clinical care and hospital operations.',
    signInHeading: 'Hospital sign in',
  },
}

export type HospitalRoleId = 'doctor' | 'resident' | 'nurse' | 'lab' | 'hospital-admin' | 'platform-admin'

export interface HospitalRole {
  id: HospitalRoleId
  /** The server role this option describes — for matching, never for sending. */
  role: RoleName
  label: string
  description: string
  icon: LucideIcon
  /**
   * Whether this kind of account can be created from the sign-in screen. Only
   * a hospital administrator can: everyone else on the Hospital side is added
   * by their hospital administrator (Add team member) and sets a password from
   * the emailed link.
   */
  selfSignUp: boolean
}

/**
 * Every hospital-side role the backend has today (`RoleName` in
 * server/prisma/schema.prisma). There is no pharmacy role yet; when one exists
 * it is one more entry here.
 *
 * Labels avoid "/" — a screen reader reads it aloud as "slash".
 */
export const HOSPITAL_ROLES: readonly HospitalRole[] = [
  {
    id: 'doctor',
    role: 'Doctor',
    label: 'Doctor',
    description: 'Consultants and specialists who see patients.',
    icon: Stethoscope,
    selfSignUp: false,
  },
  {
    id: 'resident',
    role: 'Resident',
    label: 'Resident doctor',
    description: 'Doctors in training, supervised by a consultant.',
    icon: GraduationCap,
    selfSignUp: false,
  },
  {
    id: 'nurse',
    role: 'HealthcareWorker',
    label: 'Nurse or healthcare worker',
    description: 'Nursing and clinical support staff.',
    icon: HeartHandshake,
    selfSignUp: false,
  },
  {
    id: 'lab',
    role: 'LabTechnician',
    label: 'Lab technician',
    description: 'Laboratory and diagnostics staff.',
    icon: FlaskConical,
    selfSignUp: false,
  },
  {
    id: 'hospital-admin',
    role: 'HospitalAdmin',
    label: 'Hospital administrator',
    description: 'Runs the hospital’s account and adds its doctors and staff.',
    icon: Building2,
    selfSignUp: true,
  },
  {
    id: 'platform-admin',
    role: 'Admin',
    label: 'Platform administrator',
    description: 'SHRI HEALTH team only.',
    icon: ShieldCheck,
    selfSignUp: false,
  },
]

export function parseHospitalRole(raw: string | null | undefined): HospitalRoleId | null {
  return HOSPITAL_ROLES.find((r) => r.id === raw)?.id ?? null
}

export function hospitalRoleById(id: HospitalRoleId | null): HospitalRole | null {
  return HOSPITAL_ROLES.find((r) => r.id === id) ?? null
}
