// ─────────────────────────────────────────────────────────────────────────────
// Mobile Number Normalization
//
// Single source of truth for turning a mobile number into the canonical
// 10-digit form used both when computing phoneNumberHash (write path) and
// when searching by mobile (read path). If write and read ever normalize
// differently, the blind index silently stops matching — this file existing
// on its own, imported by both sides, is what prevents that drift.
//
// Scope: Indian mobile numbers only, matching the existing validation in
// profile.validator.ts's phoneSchema (`/^(\+91[\s-]?)?[6-9]\d{9}$/`). This
// module deliberately does NOT attempt general E.164 parsing for arbitrary
// countries — that is a different, larger problem than this platform has
// today, and a half-correct international parser would be worse than an
// honest India-only one.
// ─────────────────────────────────────────────────────────────────────────────

const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

/**
 * Strips all non-digit characters, then removes a leading country code (91)
 * or trunk prefix (0) if the result is still 11+ digits, leaving the final
 * 10 digits. Returns `null` if what remains does not look like a valid
 * Indian mobile number (starts 6-9, exactly 10 digits) — never returns a
 * value the caller could mistake for a genuine normalized number.
 *
 * Examples that all normalize to "9876543210":
 *   "+91 98765 43210" | "091-98765-43210" | "9876543210" | "919876543210"
 */
export function normalizeMobile(raw: string): string | null {
  const digitsOnly = raw.replace(/\D/g, '');

  let candidate = digitsOnly;
  if (candidate.length > 10 && candidate.startsWith('91')) {
    candidate = candidate.slice(candidate.length - 10);
  } else if (candidate.length === 11 && candidate.startsWith('0')) {
    candidate = candidate.slice(1);
  } else if (candidate.length > 10) {
    // Unrecognized longer form (e.g. an accidental extra digit) — take the
    // last 10 rather than guessing at a prefix to strip, then let the
    // pattern check below reject it if that guess was wrong.
    candidate = candidate.slice(candidate.length - 10);
  }

  return INDIAN_MOBILE_PATTERN.test(candidate) ? candidate : null;
}
