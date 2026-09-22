import type { Request, Response } from 'express';
import {
  updateProfileSchema,
  updateHealthHistorySchema,
  preferencesSchema,
} from './profile.validator';
import { profileService } from './profile.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

// ─────────────────────────────────────────────────────────────────────────────
// Profile Controller
//
// HTTP layer only: parse → validate → delegate to service → respond.
// Every handler here is mounted behind authenticate + authorize(Patient) in
// profile.routes.ts — req.user is always populated.
//
// Resource ownership: every handler resolves the profile via req.user.id
// only. There is no :id route param anywhere in this module, so there is no
// code path where a client-supplied identifier could target another user's
// profile (no IDOR surface to defend against here by construction).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/profile
 * Returns the authenticated patient's own profile, or `profile: null` if
 * one doesn't exist yet (never a fabricated/placeholder profile).
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.getProfile(req.user!.id);

  res.status(200).json(ApiResponseBuilder.success('Profile retrieved.', { profile }));
});

/**
 * PATCH /api/v1/profile
 * Partially updates the authenticated patient's own profile.
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = updateProfileSchema.parse(req.body);
  const meta = getRequestMeta(req);

  const profile = await profileService.updateProfile(req.user!.id, dto, meta);

  res.status(200).json(ApiResponseBuilder.success('Profile updated successfully.', { profile }));
});

/**
 * PATCH /api/v1/profile/preferences
 * Category-level partial update of the authenticated patient's Settings
 * preferences (notifications/privacy/accessibility/language).
 */
export const updatePreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = preferencesSchema.parse(req.body);

  const profile = await profileService.updatePreferences(req.user!.id, dto);

  res.status(200).json(ApiResponseBuilder.success('Preferences updated successfully.', { profile }));
});

/**
 * PATCH /api/v1/profile/health-history
 * Patient's own medical summary and lifestyle information.
 */
export const updateHealthHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = updateHealthHistorySchema.parse(req.body);
  const meta = getRequestMeta(req);
  const profile = await profileService.updateHealthHistory(req.user!.id, dto, meta);

  res
    .status(200)
    .json(ApiResponseBuilder.success('Health information updated successfully.', { profile }));
});

/**
 * POST /api/v1/profile/onboarding-complete
 */
export const completeOnboarding = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.completeOnboarding(req.user!.id);
  res.status(200).json(ApiResponseBuilder.success('Onboarding complete.', { profile }));
});
