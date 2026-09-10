import type { Request, Response } from 'express';
import { doctorService } from './doctor.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const listDoctors = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const doctors = await doctorService.listBookable();

  res.status(200).json(ApiResponseBuilder.success('Clinicians retrieved.', { doctors }));
});
