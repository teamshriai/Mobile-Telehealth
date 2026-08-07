import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validator';
import { authService } from './auth.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Controller
//
// HTTP layer only: parse → validate → delegate to service → respond.
// No business logic. No DB access. No JWT operations.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract client IP safely — trusts X-Forwarded-For only when
 * app.set('trust proxy', 1) is configured (production behind Nginx/LB).
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown'
  );
}

function getRequestMeta(req: Request): { ipAddress: string; userAgent: string | undefined } {
  return {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };
}

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
  const meta = {
    ipAddress:
      ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress ??
        'unknown'),
    userAgent: req.headers['user-agent'],
  };

  // Service always returns 200 — result.token is null when email not found
  await authService.forgotPassword(dto, meta);

  // Generic response — identical whether email exists or not (prevents enumeration)
  res.status(200).json(
    ApiResponseBuilder.success(
      'If that email is registered, a reset link has been sent. Please check your inbox.',
    ),
  );
});

/**
 * POST /api/v1/auth/reset-password
 * Public. Accepts token + new password.
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = resetPasswordSchema.parse(req.body);
  const meta = {
    ipAddress:
      ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress ??
        'unknown'),
    userAgent: req.headers['user-agent'],
  };

  await authService.resetPassword(dto, meta);

  res.status(200).json(
    ApiResponseBuilder.success('Password reset successfully. Please sign in with your new password.'),
  );
});
