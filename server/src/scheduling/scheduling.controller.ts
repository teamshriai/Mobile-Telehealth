import type { Request, Response } from 'express';
import { schedulingService } from './scheduling.service';
import {
  slotRangeSchema,
  doctorCreateAppointmentSchema,
  updateAppointmentSchema,
} from './scheduling.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';
import { AppError } from '../middleware/errorHandler';

function actorFrom(req: Request) {
  return { id: req.user!.id, roleName: req.user!.roleName };
}

/** The doctor's own free slots, for their calendar. */
export const listOwnSlots = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { from, to } = slotRangeSchema.parse(req.query);
  const days = await schedulingService.listOwnSlots(req.user!.id, new Date(from), new Date(to));
  res.status(200).json(ApiResponseBuilder.success('Slots retrieved.', { days }));
});

/** A named doctor's free slots, for the patient booking flow. Returns
 *  availability only — no patient data — so it needs no row-level gate
 *  beyond being signed in with the permission to book. */
export const listDoctorSlots = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doctorId = req.params.doctorId;
  if (doctorId === undefined) throw new AppError('Clinician id is required.', 400);
  const { from, to } = slotRangeSchema.parse(req.query);
  const days = await schedulingService.listSlots(doctorId, new Date(from), new Date(to));
  res.status(200).json(ApiResponseBuilder.success('Slots retrieved.', { days }));
});

export const createAppointmentForPatient = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = doctorCreateAppointmentSchema.parse(req.body);
    const appointment = await schedulingService.createForPatient(
      actorFrom(req),
      dto,
      getRequestMeta(req),
    );
    res.status(201).json(ApiResponseBuilder.success('Appointment booked.', { appointment }));
  },
);

export const updateAppointment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (id === undefined) throw new AppError('Appointment id is required.', 400);
    const dto = updateAppointmentSchema.parse(req.body);
    const meta = getRequestMeta(req);

    const appointment =
      dto.scheduledAt !== undefined
        ? await schedulingService.reschedule(actorFrom(req), id, dto.scheduledAt, meta)
        : await schedulingService.changeStatus(
            actorFrom(req),
            id,
            dto.status!,
            { cancelReason: dto.cancelReason, notes: dto.notes },
            meta,
          );

    res.status(200).json(ApiResponseBuilder.success('Appointment updated.', { appointment }));
  },
);
