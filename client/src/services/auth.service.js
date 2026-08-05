/**
 * auth.service.js
 *
 * Thin service layer wrapping the auth API endpoints.
 *
 * Each function is a pure async operation:
 * - No UI concerns, no routing, no state management.
 * - Throws errors that callers (page components) catch and display.
 *
 * Token storage strategy:
 * - JWT is stored in localStorage under 'oncotrace_token'.
 * - 'oncotrace_session' flag is set to 'active' so App.jsx's existing
 *   isAuthenticated() guard continues working unchanged.
 * - 'oncotrace_user' stores the sanitized user object for quick reads.
 */

import apiClient from '../lib/apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────────────────────

function persistSession(token, user) {
  localStorage.setItem('oncotrace_token', token)
  localStorage.setItem('oncotrace_session', 'active')
  localStorage.setItem('oncotrace_user', JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem('oncotrace_token')
  localStorage.removeItem('oncotrace_session')
  localStorage.removeItem('oncotrace_user')
}

// ─────────────────────────────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new patient account.
 *
 * Field transformation: the frontend form has `aadhaar`, `confirmPassword`, and
 * `agreed` which are client-only and not in the backend RegisterDto schema.
 * We strip them here rather than touching the form.
 *
 * @param {object} formData - Full Register form state
 * @returns {{ token: string, user: object }}
 */
export async function register(formData) {
  // Build the backend-compatible payload (strips frontend-only fields).
  const payload = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    dateOfBirth: formData.dateOfBirth,
    password: formData.password,
    // gender is optional in the schema; skip if not collected.
  }

  // apiClient response interceptor unwraps the envelope → returns { token, user }
  const { token, user } = await apiClient.post('/auth/register', payload)
  user.name = `${formData.firstName} ${formData.lastName}`
  persistSession(token, user)
  return { token, user }
}

/**
 * Authenticate an existing user.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {{ token: string, user: object }}
 */
export async function login(credentials) {
  const { token, user } = await apiClient.post('/auth/login', credentials)
  
  // Set token temporarily so the request interceptor will attach it for getMe
  localStorage.setItem('oncotrace_token', token)
  
  try {
    const res = await getMe()
    if (res?.profile) {
      user.name = `${res.profile.firstName} ${res.profile.lastName}`
    }
  } catch (err) {
    console.error('Failed to fetch profile details on login:', err)
  }
  
  persistSession(token, user)
  return { token, user }
}

/**
 * Log out the current user.
 *
 * Calls POST /auth/logout (which records the audit log on the server)
 * then clears the local session regardless of the response.
 */
export async function logout() {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // Swallow errors (token may have already expired); still clear locally.
  } finally {
    clearSession()
  }
}

/**
 * Fetch the currently authenticated user + patient profile.
 *
 * @returns {{ user: object, profile: object|null }}
 */
export async function getMe() {
  return apiClient.get('/auth/me')
}

/**
 * Read the stored user from localStorage (synchronous, no network).
 * Returns null if no session exists.
 *
 * @returns {object|null}
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('oncotrace_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
