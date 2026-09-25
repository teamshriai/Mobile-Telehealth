import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { portalService } from './portal.service';

// A visitId is a public, non-sequential identifier; the shape check only keeps
// junk out of the query — the ownership check is in the service.
const visitIdParam = z.object({ visitId: z.string().trim().min(3).max(64) });

export const getMedications = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success(
      'Medications retrieved.',
      await portalService.medications(req.user!.id),
    ),
  );
});

export const getConditions = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success('Conditions retrieved.', {
      conditions: await portalService.conditions(req.user!.id),
    }),
  );
});

export const getInstructions = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success('Instructions retrieved.', {
      instructions: await portalService.instructions(req.user!.id),
    }),
  );
});

export const getVisits = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success('Visits retrieved.', {
      visits: await portalService.visits(req.user!.id),
    }),
  );
});

export const getVisit = asyncHandler(async (req: Request, res: Response) => {
  const { visitId } = visitIdParam.parse(req.params);
  res.json(
    ApiResponseBuilder.success(
      'Visit retrieved.',
      await portalService.visit(req.user!.id, visitId),
    ),
  );
});
