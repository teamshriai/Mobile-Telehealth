import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { registerSchema, loginSchema, forgotPasswordSchema, verifyResetTokenSchema, resetPasswordSchema, changePasswordSchema, deleteAccountSchema } from './auth.validator';
import { authService } from './auth.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env.config';
import { emailService } from '../services/email.service';
import { getRequestMeta } from '../utils/requestMeta';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Controller
//
// HTTP layer only: parse → validate → delegate to service → respond.
// No business logic. No DB access. No JWT operations.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = registerSchema.parse(req.body);
  const result = await authService.register(dto, getRequestMeta(req));

  res.status(201).json(
    ApiResponseBuilder.success('Account created successfully.', {
      token: result.token,
      user: result.user,
    }),
  );
});

/**
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = loginSchema.parse(req.body);
  const result = await authService.login(dto, getRequestMeta(req));

  res.status(200).json(
    ApiResponseBuilder.success('Login successful.', {
      token: result.token,
      user: result.user,
    }),
  );
});

/**
 * POST /api/v1/auth/logout
 * Protected: requires valid JWT (via authenticate middleware on the router).
 */
export const logout = asyncHandler((req: Request, res: Response): Promise<void> => {
  authService.logout(req.user!.id, getRequestMeta(req));

  res
    .status(200)
    .json(ApiResponseBuilder.success('Logged out successfully. Please discard your access token.'));

  return Promise.resolve();
});

/**
 * GET /api/v1/auth/me
 * Protected: returns authenticated user + patient profile.
 */
export const me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.getProfile(req.user!.id);

  res.status(200).json(ApiResponseBuilder.success('Profile retrieved.', result));
});

// ─────────────────────────────────────────────────────────────────────────────
// Zod parse errors are thrown as ZodError instances.
// They propagate to the global errorHandler which formats them correctly.
// No try/catch needed here — asyncHandler forwards all errors.
// ─────────────────────────────────────────────────────────────────────────────
export type { ZodError };

/**
 * POST /api/v1/auth/forgot-password
 * Public. Always returns 200 — never reveals whether email exists.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = forgotPasswordSchema.parse(req.body);
  const meta = getRequestMeta(req);

  const result = await authService.forgotPassword(dto, meta);

  if (result.token) {
    const resetLink = `${env.CLIENT_URL}/reset-password?token=${result.token}`;

    if (emailService.isConfigured) {
      // Fire-and-forget: awaiting the SMTP round-trip here would make this
      // response measurably slower than the "account doesn't exist" branch
      // above, which is itself a (smaller) enumeration side-channel. Failures
      // are still logged inside the service — just never surfaced to the
      // caller, since the public response must stay identical either way.
      emailService.sendPasswordResetEmail(result.email, resetLink).catch(() => {
        // sendPasswordResetEmail already catches internally; this is a
        // last-resort guard so an unexpected rejection can never crash the process.
      });
    } else {
      // Development-only fallback: no EMAIL_* vars configured (required in
      // production — see env.config.ts). Never logged once real SMTP is set up.
      console.warn(`[auth] DEV MODE — email not configured. Reset link: ${resetLink}`);
    }
  }

  res.status(200).json(
    ApiResponseBuilder.success(
      'If an account exists, password reset instructions have been sent.',
    ),
  );
});

/**
 * POST /api/v1/auth/verify-reset-token
 * Public. Accepts token and checks validity without revealing account details.
 */
export const verifyResetToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = verifyResetTokenSchema.parse(req.body);
  const result = await authService.verifyResetToken(dto);

  if (!result.valid) {
    res.status(400).json(ApiResponseBuilder.error('Invalid or expired reset token.'));
    return;
  }

  res.status(200).json(ApiResponseBuilder.success('Reset token is valid.', { valid: true }));
});

/**
 * POST /api/v1/auth/reset-password
 * Public. Accepts 64-char token + new password.
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = resetPasswordSchema.parse(req.body);
  const meta = getRequestMeta(req);

  await authService.resetPassword(dto, meta);

  res.status(200).json(
    ApiResponseBuilder.success('Password reset successfully. Please sign in with your new password.'),
  );
});

/**
 * PATCH /api/v1/auth/password
 * Protected: authenticated user changing their own password (Settings page).
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = changePasswordSchema.parse(req.body);
  const meta = getRequestMeta(req);

  await authService.changePassword(req.user!.id, dto, meta);

  res.status(200).json(ApiResponseBuilder.success('Password changed successfully.'));
});

/**
 * DELETE /api/v1/auth/account
 * Protected: authenticated user permanently (soft-)deleting their own account.
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = deleteAccountSchema.parse(req.body);
  const meta = getRequestMeta(req);

  await authService.deleteAccount(req.user!.id, dto.password, meta);

  res.status(200).json(ApiResponseBuilder.success('Account deleted successfully.'));
});
