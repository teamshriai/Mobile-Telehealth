// ─────────────────────────────────────────────────────────────────────────────
// Standard API Response Envelope
//
// Every API response follows this contract — no exceptions.
// Clients can always rely on { success, message, data?, errors?, timestamp }.
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = undefined> {
  success: true;
  message: string;
  data: T extends undefined ? undefined : T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]> | string[];
  /**
   * The per-request correlation id, mirroring the `X-Request-Id` header. Sent
   * so a patient who hits a failure has something concrete to quote to support
   * and support has something to grep the logs for. It identifies a request,
   * not a user, and carries no PHI — safe to display and safe to read aloud.
   */
  requestId?: string;
  /**
   * Set only on a 403 that the caller can legitimately resolve by breaking
   * glass (UI_ATLAS §3.2 / DD-014): they hold the capability, the patient
   * exists, but there is no care relationship. Every OTHER refusal stays a
   * uniform 404 with this flag absent — distinguishing causes would turn the
   * status code into a patient-existence oracle.
   */
  breakGlass?: true;
  /**
   * Accompanies `breakGlass` only. The UHID of the patient the caller may
   * break glass on, for callers who reached the refusal through something
   * other than a patient URL (an encounter's visit id, say) and therefore
   * cannot name the patient in the reason prompt. Never present without
   * `breakGlass`, so it is visible only to a capability-holder who has
   * already been told the patient exists.
   */
  shriPatientId?: string;
  timestamp: string;
}

export type ApiResponse<T = undefined> = ApiSuccessResponse<T> | ApiErrorResponse;

export const ApiResponseBuilder = {
  success<T>(message: string, data?: T): ApiSuccessResponse<T> {
    return {
      success: true,
      message,
      data: data as T extends undefined ? undefined : T,
      timestamp: new Date().toISOString(),
    };
  },

  error(
    message: string,
    errors?: Record<string, string[]> | string[],
    requestId?: string,
  ): ApiErrorResponse {
    return {
      success: false,
      message,
      errors,
      requestId,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * A refusal the caller may resolve by breaking glass. Separate builder
   * rather than an extra argument on `error`, so that adding the flag is
   * always a deliberate act at the one call site that is allowed to do it.
   */
  breakGlassRequired(
    message: string,
    requestId?: string,
    shriPatientId?: string,
  ): ApiErrorResponse {
    return {
      success: false,
      message,
      requestId,
      breakGlass: true,
      shriPatientId,
      timestamp: new Date().toISOString(),
    };
  },
};
