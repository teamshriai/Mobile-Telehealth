import type { Request, Response } from 'express';
import { careTeamService } from './careteam.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const listCareTeam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const careTeam = await careTeamService.listForUser(req.user!.id);

  res.status(200).json(ApiResponseBuilder.success('Care team retrieved.', { careTeam }));
});
