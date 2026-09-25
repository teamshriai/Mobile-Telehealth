import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  rescheduleAppointmentSchema,
} from './appointment.validator';
import { appointmentService } from './appointment.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Controller
// HTTP only: parse → delegate → respond. Always uses req.user!.id — never an
// id from the body or the path — so ownership cannot be spoofed.
// ─────────────────────────────────────────────────────────────────────────────

/** Path params are user input too; a malformed uuid should 400, not reach the DB. */
const idParamSchema = z.object({
  id: z.string().uuid('Invalid appointment reference.'),
});

export const listAppointments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = listAppointmentsSchema.parse(req.query);
  const appointments = await appointmentService.list(req.user!.id, dto);

  res
    .status(200)
    .json(ApiResponseBuilder.success('Appointments retrieved.', { appointments }));
});

export const getAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  const appointment = await appointmentService.getById(req.user!.id, id);

  res.status(200).json(ApiResponseBuilder.success('Appointment retrieved.', { appointment }));
});

export const createAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = createAppointmentSchema.parse(req.body);
  const appointment = await appointmentService.create(req.user!.id, dto, getRequestMeta(req));

  res
    .status(201)
    .json(ApiResponseBuilder.success('Appointment requested successfully.', { appointment }));
});

export const rescheduleAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  const dto = rescheduleAppointmentSchema.parse(req.body ?? {});
  const appointment = await appointmentService.reschedule(req.user!.id, id, dto, getRequestMeta(req));

  res.status(200).json(ApiResponseBuilder.success('Appointment moved.', { appointment }));
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  const dto = cancelAppointmentSchema.parse(req.body ?? {});
  const appointment = await appointmentService.cancel(req.user!.id, id, dto, getRequestMeta(req));

  res.status(200).json(ApiResponseBuilder.success('Appointment cancelled.', { appointment }));
});
