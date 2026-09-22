import type { Request, Response } from 'express';
import { doctorPatientsService } from './doctorPatients.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const listOwnPatients = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const patients = await doctorPatientsService.listOwn(req.user!.id);
  res.status(200).json(ApiResponseBuilder.success('Patients retrieved.', { patients }));
});
