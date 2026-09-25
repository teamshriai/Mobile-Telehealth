// ─────────────────────────────────────────────────────────────────────────────
// Mobile number formatting and validation.
//
// ⚠️ In its own file so `MobileNumberField.tsx` exports only a component.
// React Fast Refresh cannot handle a module that mixes components with other
// exports, and the codebase already splits this way for the same reason
// (AuthContext / authContextObject / useAuth).
//
// ⚠️ These are PRESENTATION helpers. The authoritative normalization is
// `server/src/utils/phone.ts`, which runs on every write and every lookup, so
// a slip here can annoy a user but can never produce a stored value that
// fails to match its own blind index.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `9876543210` → `98765 43210`, tolerant of what people paste.
 *
 * ⚠️ Formats for READING only. The canonical value is always the digits; the
 * space is presentation and is stripped before anything is sent. The server
 * normalizes again with `utils/phone.ts`, so a formatting slip here can never
 * produce a number that fails to match a stored blind index.
 */
export function formatMobileInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2)
  digits = digits.slice(0, 10)
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits
}

/** The digits only — what actually goes on the wire. */
export function mobileDigits(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

/** Indian mobiles are ten digits starting 6-9. Same rule as the server. */
export function isValidMobile(formatted: string): boolean {
  return /^[6-9]\d{9}$/.test(mobileDigits(formatted))
}
