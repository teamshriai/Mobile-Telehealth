/**
 * profile.service.ts
 *
 * Thin service layer wrapping the patient-profile API endpoints.
 * Same shape as auth.service.ts: pure async operations, no UI concerns.
 */

import apiClient from '../lib/apiClient'
import type { PatientProfile, PreferencesDto } from '../types/domain'

/** Fetch the authenticated patient's own profile. `profile` is null if it
 *  doesn't exist yet (pre-onboarding). */
export async function getProfile(): Promise<{ profile: PatientProfile | null }> {
  return apiClient.get('/profile')
}

/**
 * The identity/contact/address fields PATCH /profile actually accepts — see
 * profile.validator.ts's updateProfileSchema. Deliberately not
 * `Partial<PatientProfile>`: that type is the READ shape and carries
 * `aadhaarMasked` (server-derived, never written) but not `aadhaarLast4`
 * (write-only — the last 4 digits, never echoed back), and it omits the
 * lifestyle/health-history fields, which are a different endpoint
 * (updateHealthHistory) with different sensitivity.
 */
export type ProfileUpdatePayload = Partial<
  Pick<
    PatientProfile,
    | 'firstName' | 'middleName' | 'lastName' | 'dateOfBirth'
    | 'gender' | 'bloodGroup' | 'maritalStatus'
    | 'abhaId' | 'passportNumber'
    | 'phoneNumber' | 'alternatePhone'
    | 'addressLine1' | 'addressLine2' | 'village' | 'city' | 'district' | 'state' | 'country' | 'postalCode'
    | 'emergencyContactName' | 'emergencyContactPhone' | 'emergencyContactRelation'
  >
> & { aadhaarLast4?: string | null }

/** Partial update — only send the fields that changed. */
export async function updateProfile(
  updates: ProfileUpdatePayload,
): Promise<{ profile: PatientProfile }> {
  return apiClient.patch('/profile', updates)
}

/**
 * Update one or more preference categories (notifications/privacy/
 * accessibility/language). Only send the categories that changed — the
 * server merges them into the existing preferences, it does not replace
 * the whole object.
 */
export async function updatePreferences(
  categories: PreferencesDto,
): Promise<{ profile: PatientProfile }> {
  return apiClient.patch('/profile/preferences', categories)
}

export interface HealthHistoryUpdate {
  knownAllergies?: string | null
  currentMedications?: string | null
  existingDiseases?: string | null
  familyHistory?: string | null
  previousSurgeries?: string | null
  smokingStatus?: string | null
  alcoholStatus?: string | null
  tobaccoStatus?: string | null
  physicalActivity?: string | null
  occupation?: string | null
}

/**
 * Update the patient's health history (medical summary + lifestyle fields).
 * Separate from updateProfile — these are a different task with different
 * sensitivity from contact/identity details.
 */
export async function updateHealthHistory(
  updates: HealthHistoryUpdate,
): Promise<{ profile: PatientProfile }> {
  return apiClient.patch('/profile/health-history', updates)
}

/**
 * Advances past the Required onboarding tier. Recommended/Optional fields
 * remain editable afterwards via updateProfile/updateHealthHistory.
 */
export async function completeOnboarding(): Promise<{ profile: PatientProfile }> {
  return apiClient.post('/profile/onboarding-complete')
}
