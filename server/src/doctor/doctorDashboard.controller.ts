import type { Request, Response } from 'express';
import { z } from 'zod';
import { doctorDashboardService } from './doctorDashboard.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const rangeSchema = z.enum(['today', 'upcoming', 'past']).default('today');

export const getMyDay = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dashboard = await doctorDashboardService.getMyDay(req.user!.id);
  res.status(200).json(ApiResponseBuilder.success('Dashboard retrieved.', dashboard));
});

export const listOwnAppointments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const range = rangeSchema.parse(req.query.range);
    const appointments = await doctorDashboardService.listAppointments(req.user!.id, range);
    res.status(200).json(ApiResponseBuilder.success('Appointments retrieved.', { appointments }));
  },
);
