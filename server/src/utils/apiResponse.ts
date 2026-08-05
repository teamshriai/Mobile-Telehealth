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

  error(message: string, errors?: Record<string, string[]> | string[]): ApiErrorResponse {
    return {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };
  },
};
