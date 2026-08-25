import { z } from 'zod';
import { Gender } from '@prisma/client';

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
      'Please enter a valid 10-digit Indian mobile number (e.g. +91 9876543210 or 9876543210).'
    ),

  gender: z.nativeEnum(Gender).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Login Schema
//
// Password is NOT validated for complexity on login —
// we only need it as a non-empty string to compare against the stored hash.
// ─────────────────────────────────────────────────────────────────────────────

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
