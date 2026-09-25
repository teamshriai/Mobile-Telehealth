// ─────────────────────────────────────────────────────────────────────────────
// Email normalisation and validation.
//
// ⚠️ In its own file so `EmailField.tsx` exports only a component — React Fast
// Refresh cannot handle a module mixing components with other exports, which
// is the same reason `mobileFormat.ts` exists separately.
//
// ⚠️ PRESENTATION HELPERS ONLY. The authoritative normalisation is
// `server/src/auth/otpIdentity.ts` (`normalizeEmail`), which runs on every
// request and every lookup. The pattern here is deliberately the SAME shape
// the server accepts — a stricter client would refuse addresses that exist,
// and a looser one would let a user type something that can never match.
// ─────────────────────────────────────────────────────────────────────────────

/** Lowercased and trimmed — one address is one identity. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidEmail(raw: string): boolean {
  const value = normalizeEmail(raw)
  return value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
