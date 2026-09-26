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

/**
 * Where the API lives.
 *
 * ⚠️ LAN HOSTING. `http://localhost:5000` is correct on the developer's own
 * machine and wrong on every other device: opened from a phone on the same
 * Wi-Fi, `localhost` resolves to *the phone*, so the page loads and then every
 * request fails against nothing. Since the API is served from the same host as
 * the dev server, only on a different port, the honest default is to follow
 * whatever host the page was actually loaded from.
 *
 * Precedence, and it matters:
 *  1. `VITE_API_BASE_URL` wins outright — an explicit setting is never
 *     second-guessed, which is what staging and production builds rely on.
 *  2. Anything else — `localhost`, `127.0.0.1`, a LAN IP, a `.local` name —
 *     keeps the page's own host and scheme and swaps the port.
 *
 * ⚠️ THE API ORIGIN MUST STAY SAME-SITE WITH THE PAGE, and that is the whole
 * reason this is one rule rather than a localhost special case. This function
 * used to fold `127.0.0.1` into a hard-coded `http://localhost:5000`, which
 * looks harmless and is not: `127.0.0.1` and `localhost` are **different
 * sites**, and the refresh cookie is `sameSite: 'lax'`, which browsers do not
 * send on a cross-site XHR at all. A developer who typed `127.0.0.1` therefore
 * got a silent refresh that 401'd, `onSessionExpired()`, and a bounce to
 * `/login` roughly every fifteen minutes — with nothing in the console naming
 * the cause. Port never affects same-site; host does. Keep the host.
 *
 * ⚠️ The scheme is inherited, not assumed. Hard-coding `http:` here would make
 * an https-served page issue mixed-content requests that the browser blocks.
 */
const API_PORT: string = import.meta.env.VITE_API_PORT ?? '5000'

function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL
  if (typeof explicit === 'string' && explicit !== '') return explicit

  // SSR/test contexts have no `window`; fall back to the historical default.
  if (typeof window === 'undefined') return `http://localhost:${API_PORT}`

  // One rule, no host special-cases — see the same-site note above.
  // `location.hostname` keeps IPv6 brackets (`[::1]`, `[2001:db8::1]`), which
  // is exactly what a URL authority needs, so this is correct for IPv6 too.
  const { hostname, protocol } = window.location
  return `${protocol}//${hostname}:${API_PORT}`
}

const BASE_URL: string = resolveApiBaseUrl()

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
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout',
  // ⚠️ A wrong OTP legitimately returns 401. Without these, the interceptor
  // would read that as an expired access token, fire a silent refresh and
  // replay the guess — burning a second attempt against a 5-attempt cap for
  // every one the user actually made.
  '/auth/otp/request',
  '/auth/otp/verify'] as const

axiosInstance.interceptors.response.use(
  (response) => {
    /**
     * ⚠️ THE ENVELOPE IS CHECKED, NOT ASSUMED.
     *
     * Every endpoint answers `{ success, message, data }` and this unwraps to
     * `data`. When something upstream answers with anything else — a proxy
     * error page, a captive portal's HTML, a truncated body, a misconfigured
     * gateway — `response.data?.data` is `undefined`, and the caller's
     * `const { patients } = await apiClient.get(...)` then throws
     * "Cannot destructure property 'patients' of '(intermediate value)' as it
     * is undefined".
     *
     * That string was reaching the screen. A clinician was shown a JavaScript
     * internal as if it were an explanation, and it leaks implementation
     * detail while telling them nothing they can act on. Catching the shape
     * here fixes it once for all ~60 call sites instead of at each one.
     *
     * ⚠️ `data` IS OPTIONAL IN THE CONTRACT, not merely nullable.
     * `ApiResponseBuilder.success(message)` with no payload sets
     * `data: undefined`, which `JSON.stringify` DROPS — so "Password changed",
     * "Draft discarded", "Doctor verified", the G4 "Override recorded" and a
     * dozen more arrive as `{ success: true, message }` with no `data` key.
     * This check used to require the key, and every one of those successes
     * was shown to the user as "the server sent a response this app could not
     * read" — while the action had in fact succeeded on the server. The
     * server's own header (`utils/apiResponse.ts`) says `data?`.
     *
     * So the envelope is recognised by `data` OR by `success === true`. A
     * proxy page or captive portal still fails: HTML is not an object, and a
     * foreign JSON body carries neither.
     */
    // ⚠️ Binary responses (a patient's own voice-note audio) have no envelope
    // by definition; the caller asked for bytes and gets bytes. Only a request
    // that explicitly set `responseType: 'blob'` takes this path.
    if (response.config.responseType === 'blob') return response.data as never

    const body: unknown = response.data
    const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null
    const envelopeOk = record !== null && ('data' in record || record.success === true)

    if (!envelopeOk) {
      // A real Error, so `instanceof Error` and stack traces keep working —
      // the same shape the error branch below produces.
      const err = new Error(
        'The server sent a response this app could not read. It may be a proxy or captive '
        + 'portal answering instead of the API. Try again, and check you are on the right network.',
      ) as ApiError
      err.status = response.status
      err.fieldErrors = null
      err.requestId = null
      return Promise.reject(err)
    }
    return (body as { data: unknown }).data as never
  },
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

/**
 * `fetch` with the same session as apiClient — for responses that must be
 * STREAMED (imaging frames), which axios in the browser cannot do.
 *
 * Same bearer token, same single-flight refresh: a 401 refreshes once and
 * retries; a second 401 ends the session exactly as apiClient does. A non-OK
 * response is rejected with the server's own message as an ApiError.
 */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${BASE_URL}/api/v1${path}`
  const run = (token: string | null): Promise<Response> =>
    fetch(url, {
      ...init,
      credentials: 'include',
      headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
  let res = await run(accessToken)
  if (res.status === 401) {
    const token = await refreshAccessToken().catch(() => null)
    if (token) res = await run(token)
    if (res.status === 401) {
      clearAccessToken()
      onSessionExpired()
    }
  }
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      /* not JSON */
    }
    const err = new Error(message) as ApiError
    err.status = res.status
    err.requestId = res.headers.get('x-request-id')
    throw err
  }
  return res
}

const apiClient = axiosInstance as unknown as ApiClient

export default apiClient
