import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { registerSchema, loginSchema, otpRequestSchema, otpVerifySchema, forgotPasswordSchema, verifyResetTokenSchema, resetPasswordSchema, changePasswordSchema, deleteAccountSchema } from './auth.validator';
import { authService } from './auth.service';
import { otpService } from './otp.service';
import { OtpChannel } from '@prisma/client';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { passwordLinkDelivery } from '../services/passwordLinkDelivery';
import { getRequestMeta } from '../utils/requestMeta';
import { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie } from '../utils/authCookies';

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

  setRefreshCookie(res, result.refreshToken);

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

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json(
    ApiResponseBuilder.success('Login successful.', {
      token: result.token,
      user: result.user,
    }),
  );
});

/**
 * POST /api/v1/auth/otp/request
 *
 * ⚠️ ALWAYS ANSWERS THE SAME WAY. Registered or not, valid or not, this
 * returns 200 with the same message and the same fields. A mobile number is a
 * directory key, and "does this number belong to one of your doctors" is not a
 * question an anonymous caller gets to ask. The only branch is a genuine
 * cooldown, which is about the requester's own behaviour and leaks nothing
 * about whose number it is.
 *
 * ⚠️ A `challengeId` is issued either way, so the client's second step is
 * indistinguishable too. Verifying against a challenge with no account behind
 * it simply fails like a wrong code.
 */
export const requestOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = otpRequestSchema.parse(req.body);
  const result = await otpService.request(
    dto.channel === 'Sms' ? OtpChannel.Sms : OtpChannel.Email,
    dto.identifier,
    getRequestMeta(req),
  );

  if ('tooSoon' in result) {
    res.status(429).json(
      ApiResponseBuilder.error('A code was just sent. Wait before asking for another.', {
        resendAvailableAt: result.resendAvailableAt.toISOString(),
      } as never),
    );
    return;
  }

  res.status(200).json(
    ApiResponseBuilder.success(
      // ⚠️ IDENTICAL WORDING FOR BOTH CHANNELS AND FOR REGISTERED OR NOT. The
      // only variable is the noun, which the caller already knows because they
      // chose it. Saying anything conditional here would rebuild the
      // enumeration oracle the whole flow is built to avoid.
      dto.channel === 'Sms'
        ? 'If an account is registered with this mobile number, a 6-digit code has been sent.'
        : 'If an account is registered with this email address, a 6-digit code has been sent.',
      {
        challengeId: result.challengeId,
        // ⚠️ The client countdown is driven by THIS, not by a local timer, so
        // a backgrounded tab or a clock skew cannot make the UI disagree with
        // the server about whether a code is still live.
        expiresAt: result.expiresAt.toISOString(),
        resendAvailableAt: result.resendAvailableAt.toISOString(),
        channel: result.channel,
        maskedIdentifier: result.maskedIdentifier,
      },
    ),
  );
});

/**
 * POST /api/v1/auth/otp/verify
 *
 * On success this is a login: same cookie, same body, same session as
 * `POST /auth/login`, because both end in `establishSession`.
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = otpVerifySchema.parse(req.body);
  const outcome = await otpService.verify(dto.challengeId, dto.code, getRequestMeta(req));

  if (!outcome.ok) {
    // ⚠️ Three of these are told apart because all three are ACTIONABLE — the
    // user needs a new code and deserves to be told which wall they hit.
    // Naming them leaks nothing: a challengeId is an unguessable UUID that was
    // handed to this client, so "that challenge is finished" tells a caller
    // only about a challenge they already hold.
    //
    // `invalid` and `no_account` stay collapsed, and that one matters: telling
    // them apart would confirm whether an account exists behind the number,
    // which is the enumeration oracle the request endpoint works to avoid.
    //
    // This used to leave `consumed` in the generic bucket, so the attempt
    // AFTER the cap burned the challenge said "that code is not correct" —
    // sending the user back to re-read a code that could never work again.
    const message =
      outcome.reason === 'expired'
        ? 'That code has expired. Request a new one.'
        : outcome.reason === 'attempts_exceeded'
          ? 'Too many incorrect attempts. Request a new code.'
          : outcome.reason === 'consumed'
            ? 'That code has already been used. Request a new one.'
            : 'That code is not correct.';
    res.status(401).json(ApiResponseBuilder.error(message, { reason: outcome.reason } as never));
    return;
  }

  const result = await authService.loginWithVerifiedOtp(outcome.userId, getRequestMeta(req));
  setRefreshCookie(res, result.refreshToken);

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
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const rawRefresh = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  await authService.logout(req.user!.id, rawRefresh, getRequestMeta(req));
  clearRefreshCookie(res);

  res
    .status(200)
    .json(ApiResponseBuilder.success('Logged out successfully. Please discard your access token.'));
});

/**
 * POST /api/v1/auth/refresh
 *
 * Public by design: the caller has no valid access token — that is the whole
 * point. Authentication comes from the httpOnly refresh cookie instead.
 */
export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const rawRefresh = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  if (rawRefresh === undefined || rawRefresh.length === 0) {
    clearRefreshCookie(res);
    res.status(401).json(ApiResponseBuilder.error('No active session. Please sign in.'));
    return;
  }

  try {
    const result = await authService.refresh(rawRefresh, getRequestMeta(req));
    setRefreshCookie(res, result.refreshToken);

    res.status(200).json(
      ApiResponseBuilder.success('Session refreshed.', {
        token: result.token,
        user: result.user,
      }),
    );
  } catch (err) {
    // Any refresh failure ends the session — leaving a dead cookie in place
    // would make the client retry a token that can never work again.
    clearRefreshCookie(res);
    throw err;
  }
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

  if (result.token !== null && result.expiresAt !== null) {
    // Fire-and-forget: awaiting the SMTP round-trip here would make this
    // response measurably slower than the "account doesn't exist" branch
    // above, which is itself a (smaller) enumeration side-channel.
    // `passwordLinkDelivery` never throws, and falls back to the development
    // outbox when the email was not actually sent — not merely when EMAIL_* is
    // unset, which is what used to lose the link on a bad SMTP password.
    void passwordLinkDelivery.send({
      kind: 'password-reset',
      to: result.email,
      rawToken: result.token,
      expiresAt: result.expiresAt,
    });
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
  clearRefreshCookie(res);

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
  clearRefreshCookie(res);

  res.status(200).json(ApiResponseBuilder.success('Account deleted successfully.'));
});
