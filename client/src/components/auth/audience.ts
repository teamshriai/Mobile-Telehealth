/**
 * Who a sign-in screen is addressed to.
 *
 * ⚠️ THIS IS COPY AND LAYOUT, NEVER AUTHORITY. The entry page asks "who are
 * you?" so each person meets the sign-in method and wording that fits them.
 * The value is never sent to the server: after sign-in, the ROLE ON THE
 * ACCOUNT decides the portal. A doctor who taps "Patient" and signs in still
 * lands in the Clinician Portal, and a patient who taps "Doctor" gains nothing.
 *
 * Kept out of the component files because Fast Refresh cannot hot-swap a
 * module that mixes components with other exports.
 */
export type Audience = 'patient' | 'clinician' | 'hospital'

export function parseAudience(raw: string | null): Audience | null {
  return raw === 'patient' || raw === 'clinician' || raw === 'hospital' ? raw : null
}

export const AUDIENCE_COPY: Record<Audience, { title: string; blurb: string; signInHeading: string }> = {
  patient: {
    title: 'Patient',
    blurb: 'Access your health records, appointments, medicines, care team and telehealth.',
    signInHeading: 'Patient sign in',
  },
  clinician: {
    title: 'Doctor / Clinician',
    blurb: 'Manage patients, encounters, clinical documentation and care.',
    signInHeading: 'Clinician sign in',
  },
  hospital: {
    title: 'Hospital Administrator',
    blurb: 'Manage your hospital, clinicians, patients and operational workflows.',
    signInHeading: 'Hospital administrator sign in',
  },
}

/** Only patients sign in by one-time code; staff use email + password. */
export function audienceUsesOtp(a: Audience): boolean {
  return a === 'patient'
}
