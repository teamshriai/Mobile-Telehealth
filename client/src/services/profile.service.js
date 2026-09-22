/**
 * profile.service.js
 *
 * Thin service layer wrapping the patient-profile API endpoints.
 * Same shape as auth.service.js: pure async operations, no UI concerns.
 */

import apiClient from '../lib/apiClient'

/**
 * Fetch the authenticated patient's own profile.
 *
 * @returns {{ profile: object|null }} profile is null if it doesn't exist yet
 */
export async function getProfile() {
  return apiClient.get('/profile')
}

/**
 * Update the authenticated patient's own profile. Partial update — only
 * send the fields that changed.
 *
 * @param {object} updates
 * @returns {{ profile: object }}
 */
export async function updateProfile(updates) {
  return apiClient.patch('/profile', updates)
}

/**
 * Update one or more preference categories (notifications/privacy/
 * accessibility/language). Only send the categories that changed — the
 * server merges them into the existing preferences, it does not replace
 * the whole object.
 *
 * @param {{ notifications?: object, privacy?: object, accessibility?: object, language?: object }} categories
 * @returns {{ profile: object }}
 */
export async function updatePreferences(categories) {
  return apiClient.patch('/profile/preferences', categories)
}

/**
 * Update the patient's health history (medical summary + lifestyle fields).
 * Separate from updateProfile — these are a different task with different
 * sensitivity from contact/identity details.
 *
 * @param {{ knownAllergies?, currentMedications?, existingDiseases?, familyHistory?, previousSurgeries?, smokingStatus?, alcoholStatus?, tobaccoStatus?, physicalActivity?, occupation? }} updates
 * @returns {{ profile: object }}
 */
export async function updateHealthHistory(updates) {
  return apiClient.patch('/profile/health-history', updates)
}

/**
 * Advances past the Required onboarding tier. Recommended/Optional fields
 * remain editable afterwards via updateProfile/updateHealthHistory.
 *
 * @returns {{ profile: object }}
 */
export async function completeOnboarding() {
  return apiClient.post('/profile/onboarding-complete')
}
