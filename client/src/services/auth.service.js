/**
 * auth.service.js
 *
 * Thin wrapper over the auth endpoints. No UI, no routing, no state —
 * callers (AuthContext) own those.
 *
 * Token model (Phase 2): the ACCESS token is held in memory by apiClient; the
 * REFRESH token is an httpOnly cookie this code cannot read by design. Nothing
 * auth-related is written to localStorage any more. The legacy `oncotrace_*`
 * keys are actively purged on load — see clearLegacyStorage().
 */

import apiClient, {
  setAccessToken,
  clearAccessToken as clearToken,
} from '../lib/apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// Legacy cleanup
//
// Before Phase 2 the JWT, a session flag and the user object were persisted to
// localStorage under `oncotrace_*`. Those are now both a stale-data hazard and
// an XSS-readable credential sitting on disk for existing users. Clear them
// once at module load — a one-shot migration, not a permanent code path.
// SAFE TO DELETE once no active user predates the Phase 2 deploy.
// ─────────────────────────────────────────────────────────────────────────────
const LEGACY_KEYS = ['oncotrace_token', 'oncotrace_session', 'oncotrace_user']

function clearLegacyStorage() {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
  } catch {
    // Private mode / storage disabled — nothing to clean up.
  }
}
clearLegacyStorage()

export function clearAccessToken() {
  clearToken()
  clearLegacyStorage()
}

/**
 * Register a new patient account.
 * The form carries `confirmPassword` and `agreed`, which are client-only and
 * rejected by the backend schema — stripped here rather than in the component.
 */
export async function register(formData) {
  const digits = formData.phoneNumber ? formData.phoneNumber.replace(/\D/g, '') : ''
  // Backend expects an Indian mobile; send the last 10 digits so a user who
  // typed the +91 prefix themselves is not rejected for a 12-digit string.
  const local = digits.length > 10 ? digits.slice(-10) : digits

  const payload = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    dateOfBirth: formData.dateOfBirth,
    phoneNumber: local ? `+91 ${local}` : '',
    password: formData.password,
  }

  const { token, user } = await apiClient.post('/auth/register', payload)
  setAccessToken(token)
  return { user }
}

export async function login(credentials) {
  const { token, user } = await apiClient.post('/auth/login', credentials)
  setAccessToken(token)
  return { user }
}

/**
 * Exchange the httpOnly refresh cookie for a new access token.
 * Throws when there is no valid session — the caller treats that as anonymous.
 */
export async function refreshSession() {
  const { token, user } = await apiClient.post('/auth/refresh')
  setAccessToken(token)
  return { user }
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    clearAccessToken()
  }
}

/** Current user + role permissions + patient profile. */
export async function getMe() {
  return apiClient.get('/auth/me')
}

export async function forgotPassword(email) {
  return apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
}

export async function resetPassword(payload) {
  return apiClient.post('/auth/reset-password', payload)
}

/**
 * Change password. The server revokes every session on success, so the caller
 * must treat this as "now signed out" and route to /login.
 */
export async function changePassword(payload) {
  const result = await apiClient.patch('/auth/password', payload)
  clearAccessToken()
  return result
}

export async function deleteAccount(password) {
  const result = await apiClient.delete('/auth/account', { data: { password } })
  clearAccessToken()
  return result
}
