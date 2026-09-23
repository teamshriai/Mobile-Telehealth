/**
 * The API response envelope, mirrored from the server's
 * `server/src/utils/apiResponse.ts`. Every endpoint replies with exactly one
 * of these two shapes — kept as a hand-copied mirror rather than a shared
 * package because the two apps deploy independently and a build-time package
 * link would couple their release trains for no benefit this size of team.
 * If the two drift, `apiClient`'s runtime unwrap is the single place that
 * would need to change.
 */
export interface ApiSuccessResponse<T = undefined> {
  success: true
  message: string
  data: T
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]> | string[]
  requestId?: string
  timestamp: string
}

export type ApiResponse<T = undefined> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * What `apiClient`'s response interceptor actually hands back to a service —
 * `response.data.data`, i.e. just the payload, never the envelope. Every
 * service function's return type is `Promise<T>` where `T` is this.
 */
export type Unwrapped<T> = T

/**
 * The shape apiClient throws on any failed request — a real `Error` (so
 * `instanceof Error` and stack traces keep working) with three properties
 * stamped on top from the server's `ApiErrorResponse`.
 */
export interface ApiError extends Error {
  status?: number
  fieldErrors: Record<string, string[]> | string[] | null
  requestId: string | null
  /**
   * Set only on the one refusal a clinician can legitimately resolve
   * themselves: they hold the capability, the patient exists, but there is
   * no care relationship (UI_ATLAS §3.2 / DD-014). Every other refusal is a
   * uniform 404 with this absent — see the server's careRelationship
   * service for why distinguishing the others would be an oracle.
   */
  breakGlass?: boolean
  /** UHID of the break-glass-eligible patient; present only with `breakGlass`. */
  shriPatientId?: string
}
