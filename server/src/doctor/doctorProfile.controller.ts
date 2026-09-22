import type { Request, Response } from 'express';
import { doctorProfileService } from './doctorProfile.service';
import { updateDoctorProfileSchema } from './doctorProfile.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

/**
 * GET /api/v1/doctor/profile
 */
export const getOwnDoctorProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const profile = await doctorProfileService.getOwnProfile(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Profile retrieved.', { profile }));
  },
);

/**
 * PATCH /api/v1/doctor/profile
 */
export const updateOwnDoctorProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = updateDoctorProfileSchema.parse(req.body);
    const profile = await doctorProfileService.updateOwnProfile(
      req.user!.id,
      dto,
      getRequestMeta(req),
    );
    res.status(200).json(ApiResponseBuilder.success('Profile updated successfully.', { profile }));
  },
);

/**
 * POST /api/v1/doctor/onboarding-complete
 * Advances past the Required onboarding tier — see doctorProfile.service's
 * hasRequiredFields for exactly what that means. Recommended/Optional
 * fields remain editable afterwards via PATCH /profile.
 */
export const completeDoctorOnboarding = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const profile = await doctorProfileService.completeOnboarding(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Onboarding complete.', { profile }));
  },
);
