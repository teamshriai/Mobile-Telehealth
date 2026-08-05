/**
 * apiClient.js
 *
 * Centralized Axios instance for all backend communication.
 *
 * Design decisions:
 * - baseURL comes from the VITE_API_BASE_URL env variable.
 * - The request interceptor automatically attaches Bearer JWT from localStorage.
 * - The response interceptor unwraps the { success, message, data } envelope so
 *   callers receive `data` directly on success and a clean Error on failure.
 * - On 401 responses the stored session is cleared and the user is redirected to /login.
 *   This handles expired or invalidated JWTs gracefully without any custom event bus.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // sends cookies if the backend ever sets any
  timeout: 15_000,
})

// ── Request interceptor: attach JWT ────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('oncotrace_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: unwrap envelope / handle errors ─────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the standard { success, message, data, timestamp } envelope.
    // Callers get the inner `data` object directly.
    return response.data?.data
  },
  (error) => {
    const status = error.response?.status
    const payload = error.response?.data

    // Build a descriptive Error from the backend envelope.
    const message =
      payload?.message ??
      error.message ??
      'An unexpected error occurred. Please try again.'

    // Attach the raw field-level errors from Zod validation (if present)
    // so form components can render per-field messages.
    const fieldErrors = payload?.errors ?? null

    // On 401 (expired/invalid token) clear the session and redirect to login.
    if (status === 401) {
      localStorage.removeItem('oncotrace_token')
      localStorage.removeItem('oncotrace_session')
      localStorage.removeItem('oncotrace_user')
      // Use location.replace so the login page is not in history.
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }

    const err = new Error(message)
    err.status = status
    err.fieldErrors = fieldErrors
    return Promise.reject(err)
  },
)

export default apiClient
