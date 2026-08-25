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
