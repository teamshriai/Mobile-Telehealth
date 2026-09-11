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
};
