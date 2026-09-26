import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { getRequestMeta } from '../utils/requestMeta';
import { medicationService } from './medication.service';
import { refillService } from './refill.service';
import { medicationSummaryService } from './summary.service';

// HTTP only: parse → delegate → respond. "Whose" is always req.user!.id.

const uuid = z.string().uuid('Invalid reference.');
const logDoseSchema = z
  .object({
    itemId: uuid,
    scheduledFor: z.string().datetime({ offset: true }),
    status: z.enum(['Taken', 'Skipped']),
  })
  .strict();
const refillSchema = z.object({ note: z.string().trim().max(300).optional() }).strict();

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success(
      'Medicines retrieved.',
      await medicationService.overview(req.user!.id),
    ),
  );
});

export const logDose = asyncHandler(async (req: Request, res: Response) => {
  const dto = logDoseSchema.parse(req.body ?? {});
  const log = await medicationService.logDose(req.user!.id, dto, getRequestMeta(req));
  res.status(201).json(ApiResponseBuilder.success('Dose recorded.', { log }));
});

export const undoDose = asyncHandler(async (req: Request, res: Response) => {
  await medicationService.undoDose(req.user!.id, uuid.parse(req.params.id), getRequestMeta(req));
  res.json(ApiResponseBuilder.success('Dose record removed.', { removed: true }));
});

export const requestRefill = asyncHandler(async (req: Request, res: Response) => {
  const dto = refillSchema.parse(req.body ?? {});
  const refill = await refillService.request(
    req.user!.id,
    uuid.parse(req.params.itemId),
    dto.note,
    getRequestMeta(req),
  );
  res.status(201).json(ApiResponseBuilder.success('Refill requested.', { refill }));
});

export const cancelRefill = asyncHandler(async (req: Request, res: Response) => {
  await refillService.cancel(req.user!.id, uuid.parse(req.params.id), getRequestMeta(req));
  res.json(ApiResponseBuilder.success('Refill request cancelled.', { cancelled: true }));
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success(
      'Summary retrieved.',
      await medicationSummaryService.get(req.user!.id),
    ),
  );
});

export const generateSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success('Summary.', await medicationSummaryService.generate(req.user!.id)),
  );
});
