import type { Request, Response } from 'express';
import { staffProfileService } from './staffProfile.service';
import {
  updateStaffProfileSchema,
  createHospitalSchema,
  joinHospitalSchema,
} from './staffProfile.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

export const getOwnStaffProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const profile = await staffProfileService.getOwnProfile(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Profile retrieved.', { profile }));
  },
);

export const updateOwnStaffProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = updateStaffProfileSchema.parse(req.body);
    const profile = await staffProfileService.updateOwnProfile(
      req.user!.id,
      dto,
      getRequestMeta(req),
    );
    res.status(200).json(ApiResponseBuilder.success('Profile updated successfully.', { profile }));
  },
);

export const createOwnHospital = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = createHospitalSchema.parse(req.body);
    const profile = await staffProfileService.createHospital(req.user!.id, dto);
    res.status(201).json(ApiResponseBuilder.success('Hospital created.', { profile }));
  },
);

export const joinExistingHospital = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = joinHospitalSchema.parse(req.body);
    const profile = await staffProfileService.joinHospital(req.user!.id, dto);
    res.status(200).json(ApiResponseBuilder.success('Joined hospital.', { profile }));
  },
);

export const completeStaffOnboarding = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const profile = await staffProfileService.completeOnboarding(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Onboarding complete.', { profile }));
  },
);
