/**
 * apiClient.js
 *
 * The single axios instance. Nothing else in the app imports axios.
 *
 * Phase 2 changes:
 *  - The access token lives in a module-scoped variable, NOT localStorage.
 *    An XSS payload can read localStorage; it cannot read this closure.
 *  - A 401 no longer means "log out". It first attempts a silent refresh
 *    against the httpOnly cookie and replays the original request. Only if
 *    that fails is the session actually over. This is what makes a
 *    15-minute access token invisible to the patient.
 *  - Concurrent 401s share ONE refresh call. Without this, five parallel
 *    requests would fire five refreshes; because refresh rotates the token,
 *    four would replay a revoked token and trip reuse detection, logging the
 *    user out — the exact opposite of the intent.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

// ── In-memory access token ───────────────────────────────────────────────────
let accessToken = null

export function setAccessToken(token) { accessToken = token ?? null }
export function getAccessToken() { return accessToken }
export function clearAccessToken() { accessToken = null }

/** Called by AuthContext when the session ends irrecoverably. */
let onSessionExpired = () => {}
export function setSessionExpiredHandler(fn) { onSessionExpired = fn }

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // Required for the httpOnly refresh cookie to be sent at all.
  withCredentials: true,
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// ── Single-flight refresh ────────────────────────────────────────────────────
let refreshPromise = null

function refreshAccessToken() {
  if (refreshPromise === null) {
    // A bare axios call, not apiClient: routing it through the instance would
    // re-enter this interceptor on failure and recurse.
    refreshPromise = axios
      .post(`${BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true, timeout: 15_000 })
      .then((res) => {
        const token = res.data?.data?.token ?? null
        setAccessToken(token)
        return token
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

/** Endpoints where a 401 is a legitimate answer, not an expired session. */
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']

apiClient.interceptors.response.use(
  (response) => response.data?.data,
  async (error) => {
    const status = error.response?.status
    const original = error.config ?? {}
    const url = original.url ?? ''

    const isRetryable =
      status === 401 &&
      original._retried !== true &&
      !NO_RETRY_PATHS.some((p) => url.includes(p))

    if (isRetryable) {
      original._retried = true
      try {
        const token = await refreshAccessToken()
        if (token) {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` }
          return apiClient(original)
        }
      } catch {
        // Fall through to the session-ended path below.
      }
      clearAccessToken()
      onSessionExpired()
    }

    const payload = error.response?.data
    const err = new Error(
      payload?.message ?? error.message ?? 'Something went wrong. Please try again.',
    )
    err.status = status
    // Zod field errors, so forms can render per-field messages.
    err.fieldErrors = payload?.errors ?? null
    // Server-issued correlation id, mirrored from the X-Request-Id header.
    // Surfaced in ErrorState so a patient reporting a failure has a reference
    // to quote and support has an exact string to grep the logs for.
    err.requestId = payload?.requestId ?? error.response?.headers?.['x-request-id'] ?? null
    return Promise.reject(err)
  },
)

export default apiClient
