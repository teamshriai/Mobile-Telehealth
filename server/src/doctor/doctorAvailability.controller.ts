import type { Request, Response } from 'express';
import { doctorAvailabilityService } from './doctorAvailability.service';
import {
  upsertAvailabilitySchema,
  createLeaveSchema,
  toggleAvailabilitySchema,
} from './doctorAvailability.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';
import { AppError } from '../middleware/errorHandler';

export const listAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await doctorAvailabilityService.list(req.user!.id);
  res.status(200).json(ApiResponseBuilder.success('Availability retrieved.', result));
});

export const addAvailabilitySlot = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = upsertAvailabilitySchema.parse(req.body);
    const slot = await doctorAvailabilityService.addSlot(req.user!.id, dto, getRequestMeta(req));
    res.status(201).json(ApiResponseBuilder.success('Availability added.', { slot }));
  },
);

export const removeAvailabilitySlot = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (id === undefined) throw new AppError('Slot id is required.', 400);
    await doctorAvailabilityService.removeSlot(req.user!.id, id);
    res.status(200).json(ApiResponseBuilder.success('Availability removed.'));
  },
);

export const setAvailabilitySlotActive = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (id === undefined) throw new AppError('Slot id is required.', 400);
    const { isActive } = toggleAvailabilitySchema.parse(req.body);
    await doctorAvailabilityService.setSlotActive(req.user!.id, id, isActive, getRequestMeta(req));
    res.status(200).json(ApiResponseBuilder.success('Availability updated.'));
  },
);

export const addLeave = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = createLeaveSchema.parse(req.body);
  const leave = await doctorAvailabilityService.addLeave(req.user!.id, dto, getRequestMeta(req));
  res.status(201).json(ApiResponseBuilder.success('Leave added.', { leave }));
});

export const removeLeave = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  if (id === undefined) throw new AppError('Leave id is required.', 400);
  await doctorAvailabilityService.removeLeave(req.user!.id, id);
  res.status(200).json(ApiResponseBuilder.success('Leave removed.'));
});
