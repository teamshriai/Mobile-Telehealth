/**
 * apiClient.ts
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
 *
 * ⚠️ THE TYPING TRAP THIS FILE EXISTS TO AVOID. The response interceptor
 * below returns `response.data.data` — the unwrapped payload, not an
 * AxiosResponse. So `AxiosInstance`'s own types (`Promise<AxiosResponse<T>>`)
 * are wrong at every call site in the app. `ApiClient` below is a
 * hand-written interface that describes what this instance actually returns
 * at runtime, and the axios instance is cast to it once, here, rather than
 * every one of the ~60 call sites re-asserting the unwrap themselves.
 */

import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '../types/api'

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

// ── In-memory access token ───────────────────────────────────────────────────
let accessToken: string | null = null

export function setAccessToken(token: string | null | undefined): void {
  accessToken = token ?? null
}
export function getAccessToken(): string | null {
  return accessToken
}
export function clearAccessToken(): void {
  accessToken = null
}

/** Called by AuthContext when the session ends irrecoverably. */
let onSessionExpired: () => void = () => {}
export function setSessionExpiredHandler(fn: () => void): void {
  onSessionExpired = fn
}

/** The request config augmented with the single-flight-retry marker this
 *  file stamps onto it — a local intersection rather than a global axios
 *  module augmentation, since nothing outside this file reads or writes it. */
type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

/** What every method on the shared instance actually resolves to at runtime:
 *  the unwrapped payload `T`, never an `AxiosResponse`. `data` is optional on
 *  read/delete-style calls the same way it is on a real axios instance. */
export interface ApiClient {
  get<T>(url: string, config?: object): Promise<T>
  delete<T = void>(url: string, config?: object): Promise<T>
  post<T>(url: string, data?: unknown, config?: object): Promise<T>
  put<T>(url: string, data?: unknown, config?: object): Promise<T>
  patch<T>(url: string, data?: unknown, config?: object): Promise<T>
}

const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // Required for the httpOnly refresh cookie to be sent at all.
  withCredentials: true,
  timeout: 15_000,
})

axiosInstance.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// ── Single-flight refresh ────────────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise === null) {
    // A bare axios call, not apiClient: routing it through the instance would
    // re-enter this interceptor on failure and recurse.
    refreshPromise = axios
      .post(`${BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true, timeout: 15_000 })
      .then((res) => {
        const token: string | null = res.data?.data?.token ?? null
        setAccessToken(token)
        return token
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/** Endpoints where a 401 is a legitimate answer, not an expired session. */
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'] as const

axiosInstance.interceptors.response.use(
  (response) => response.data?.data,
  async (error) => {
    const status: number | undefined = error.response?.status
    const original: RetryableConfig = error.config ?? {}
    const url: string = original.url ?? ''

    const isRetryable =
      status === 401 &&
      original._retried !== true &&
      !NO_RETRY_PATHS.some((p) => url.includes(p))

    if (isRetryable) {
      original._retried = true
      try {
        const token = await refreshAccessToken()
        if (token) {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` } as never
          return axiosInstance(original)
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
    ) as ApiError
    err.status = status
    // Zod field errors, so forms can render per-field messages.
    err.fieldErrors = payload?.errors ?? null
    // Server-issued correlation id, mirrored from the X-Request-Id header.
    // Surfaced in ErrorState so a patient reporting a failure has a reference
    // to quote and support has an exact string to grep the logs for.
    err.requestId = payload?.requestId ?? error.response?.headers?.['x-request-id'] ?? null
    // ⚠️ Carried through so a caller can tell "you may break glass" from
    // "no". Dropping it here would silently collapse a recoverable refusal
    // into a dead end, and the clinician would never be offered the
    // emergency path the server just held open for them.
    err.breakGlass = payload?.breakGlass === true
      if (typeof payload?.shriPatientId === 'string') err.shriPatientId = payload.shriPatientId
    return Promise.reject(err)
  },
)

const apiClient = axiosInstance as unknown as ApiClient

export default apiClient
