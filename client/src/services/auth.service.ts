/**
 * auth.service.ts
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
import type { PatientProfile, DoctorProfile, StaffProfile, RoleName, User } from '../types/domain'

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

function clearLegacyStorage(): void {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
  } catch {
    // Private mode / storage disabled — nothing to clean up.
  }
}
clearLegacyStorage()

export function clearAccessToken(): void {
  clearToken()
  clearLegacyStorage()
}

export interface RegisterFormData {
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  phoneNumber: string
  password: string
  role?: RoleName
  agreed: boolean
}

/** Any profile shape /auth/me can return — whichever one exists for the
 *  signed-in user's role (see auth.service.ts's getProfile on the server).
 *  Each portal's pages narrow this to the one shape they actually expect. */
export type MeProfile = PatientProfile | DoctorProfile | StaffProfile | null

export interface MeResponse {
  user: User
  permissions: string[]
  profile: MeProfile
}

/**
 * Register a new account for one of the three self-registering roles
 * (Patient / Doctor / HospitalAdmin — Admin stays seed/ops-created only).
 *
 * The form carries `confirmPassword`, which is client-only and rejected by
 * the backend schema — stripped here rather than in the component.
 *
 * Bug fix: `agreed` (the Terms/Privacy checkbox) used to be stripped here
 * too, even though the server now records it as `termsAcceptedAt`/
 * `termsVersion` — every account's consent was collected and validated by
 * the UI, then silently discarded before the request ever reached the
 * server, leaving no record it happened. It is sent through as-is now.
 */
export async function register(formData: RegisterFormData): Promise<{ user: User }> {
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
    role: formData.role ?? 'Patient',
    agreed: formData.agreed,
  }

  const { token, user } = await apiClient.post<{ token: string; user: User }>(
    '/auth/register',
    payload,
  )
  setAccessToken(token)
  return { user }
}

/**
 * Mobile OTP login — stage 1.
 *
 * ⚠️ The response is deliberately identical whether or not the number is
 * registered, and the client must not try to be cleverer than that. Any
 * branch here on "did it actually send" would rebuild the account-enumeration
 * oracle the server works to avoid.
 */
/** How the code is delivered: SMS only (emailed sign-in codes were withdrawn). */
export type OtpChannel = 'Sms'

export interface OtpChallenge {
  challengeId: string
  /** ⚠️ Server-authoritative. The countdown reads this, not a local timer. */
  expiresAt: string
  resendAvailableAt: string
  channel: OtpChannel
  /**
   * `••••• •3210` — for display only. The full identifier
   * is never echoed back, so a shoulder-surfer learns nothing from the screen.
   */
  maskedIdentifier: string
}

export async function requestOtp(args: {
  channel: OtpChannel
  identifier: string
}): Promise<OtpChallenge> {
  return apiClient.post<OtpChallenge>('/auth/otp/request', args)
}

/**
 * Mobile OTP login — stage 2. On success this IS a login: the server sets the
 * same refresh cookie and returns the same body as password login, so the
 * caller finishes exactly as `login()` does.
 */
export async function verifyOtp(args: {
  challengeId: string
  code: string
}): Promise<{ token: string; user: User }> {
  const data = await apiClient.post<{ token: string; user: User }>('/auth/otp/verify', args)
  setAccessToken(data.token)
  return data
}

export interface LoginCredentials {
  email: string
  password: string
}

export async function login(credentials: LoginCredentials): Promise<{ user: User }> {
  const { token, user } = await apiClient.post<{ token: string; user: User }>(
    '/auth/login',
    credentials,
  )
  setAccessToken(token)
  return { user }
}

/**
 * Exchange the httpOnly refresh cookie for a new access token.
 * Throws when there is no valid session — the caller treats that as anonymous.
 */
export async function refreshSession(): Promise<{ user: User }> {
  const { token, user } = await apiClient.post<{ token: string; user: User }>('/auth/refresh')
  setAccessToken(token)
  return { user }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    clearAccessToken()
  }
}

/** Current user + role permissions + patient profile. */
export async function getMe(): Promise<MeResponse> {
  return apiClient.get('/auth/me')
}

export async function forgotPassword(email: string): Promise<{ message?: string }> {
  return apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
}

export interface ResetPasswordPayload {
  token: string
  password: string
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  return apiClient.post('/auth/reset-password', payload)
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

/**
 * Change password. The server revokes every session on success, so the caller
 * must treat this as "now signed out" and route to /login.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  const result = await apiClient.patch<void>('/auth/password', payload)
  clearAccessToken()
  return result
}

export async function deleteAccount(password: string): Promise<void> {
  const result = await apiClient.delete<void>('/auth/account', { data: { password } })
  clearAccessToken()
  return result
}
