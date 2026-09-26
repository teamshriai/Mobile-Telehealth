import { z } from 'zod';
import { Gender } from '@prisma/client';

/**
 * The version string stamped onto User.termsVersion when a registration's
 * `agreed` checkbox is true. A constant here, not client-supplied — the
 * client can request accepting the CURRENT terms, but it does not get to
 * declare which version those were.
 */
export const CURRENT_TERMS_VERSION = '2026-09-19';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Password Schema
//
// Max 128 chars: prevents DoS via huge input to argon2 (which is memory-hard).
// Requirements: uppercase, lowercase, number, special char.
// ─────────────────────────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must not exceed 128 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/\d/, 'Password must contain at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.');

// ─────────────────────────────────────────────────────────────────────────────
// Registration Schema
// ─────────────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address.')
    .max(255, 'Email must not exceed 255 characters.'),

  password: passwordSchema,

  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.')
    .max(100, 'First name must not exceed 100 characters.'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required.')
    .max(100, 'Last name must not exceed 100 characters.'),

  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    return date <= now && date.getFullYear() >= 1900;
  }, 'Please provide a valid date of birth.'),

  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Mobile number is required.')
    .regex(
      /^(\+91[\s-]?)?[6-9]\d{9}$/,
      'Please enter a valid 10-digit Indian mobile number (e.g. +91 9876543210 or 9876543210).',
    ),

  gender: z.nativeEnum(Gender).optional(),

  /**
   * Which of the three portals this account is for. Admin is deliberately
   * NOT an accepted value — the global Admin role stays seed/ops-created
   * only, never self-registered. Defaults to Patient so every existing
   * caller (and every existing test) that omits this field is unaffected.
   *
   * Doctor and HospitalAdmin self-registration was withdrawn on 24 Sep 2026
   * and restored on 25 Sep 2026 at the product owner's request.
   */
  role: z.enum(['Patient', 'Doctor', 'HospitalAdmin']).optional().default('Patient'),

  /**
   * The "I agree to the Terms of Service and Privacy Policy" checkbox.
   * Previously collected and validated client-side only, then stripped
   * before the request ever reached the server — so every account's
   * consent was unrecorded. Required true: the client already blocks
   * submission without it, so this only ever rejects a request that
   * bypassed the UI entirely.
   */
  agreed: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy.' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Login Schema
//
// Password is NOT validated for complexity on login —
// we only need it as a non-empty string to compare against the stored hash.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ The SAME India-only shape the rest of the platform already validates
 * against (`profile.validator.ts`'s phoneSchema, `registerSchema.phoneNumber`,
 * and `utils/phone.ts`). Accepting a looser form here than the write path
 * accepts would produce numbers that can be typed at the login box and can
 * never match a stored blind index.
 */
/**
 * ⚠️ MOBILE ONLY. Patients sign in with a mobile code or with email and
 * password; an emailed sign-in code was withdrawn on 25 Sep 2026, and a
 * sign-in path the screens do not offer must not stay open on the server.
 * `.strict()` is what stops an unauthenticated caller appending `role` or
 * `userId` to the one endpoint that runs before authentication.
 */
export const otpRequestSchema = z
  .object({
    channel: z.literal('Sms', { message: 'Sign-in codes are sent by SMS only.' }),
    identifier: z
      .string()
      .trim()
      .min(1, 'Enter your mobile number.')
      .regex(
        /^(\+91[\s-]?)?[6-9]\d{9}$/,
        'Enter a 10-digit Indian mobile number starting 6, 7, 8 or 9.',
      ),
  })
  .strict();

export const otpVerifySchema = z
  .object({
    challengeId: z.string().uuid(),
    // Exactly six digits. `.length(6)` rather than min/max so "12345 " and
    // "1234567" are both refused before they reach a timing-safe compare.
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code.'),
  })
  .strict();

export type OtpRequestDto = z.infer<typeof otpRequestSchema>;
export type OtpVerifyDto = z.infer<typeof otpVerifySchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address.'),

  password: z.string().min(1, 'Password is required.').max(128, 'Invalid credentials.'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password Schema
// ─────────────────────────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address.'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Verify Reset Token Schema
// ─────────────────────────────────────────────────────────────────────────────

export const verifyResetTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .length(64, 'Invalid reset token format.')
    .regex(/^[a-f0-9]{64}$/i, 'Invalid reset token format.'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Reset Password Schema
// ─────────────────────────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .length(64, 'Invalid reset token format.')
    .regex(/^[a-f0-9]{64}$/i, 'Invalid reset token format.'),
  password: passwordSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// Change Password Schema (authenticated user changing their own password)
// ─────────────────────────────────────────────────────────────────────────────

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.').max(128),
  newPassword: passwordSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// Inferred Types
// ─────────────────────────────────────────────────────────────────────────────

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetTokenDto = z.infer<typeof verifyResetTokenSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Delete Account Schema
// ─────────────────────────────────────────────────────────────────────────────

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password to confirm.').max(128),
});

export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
