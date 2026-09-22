import type { Request, Response } from 'express';
import { hospitalService } from './hospital.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/v1/hospitals
 * A lightweight, authenticated directory — used by the Doctor and Hospital
 * Admin onboarding pickers to join an existing hospital rather than create
 * a new one. Not public: a hospital directory is not something an
 * unauthenticated caller needs.
 */
export const listHospitals = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const hospitals = await hospitalService.listActive();
  res.status(200).json(ApiResponseBuilder.success('Hospitals retrieved.', { hospitals }));
});
