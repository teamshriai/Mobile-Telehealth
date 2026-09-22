import { z } from 'zod';
import { AppointmentMode, AppointmentStatus } from '@prisma/client';

const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Please choose a valid date and time.');

/** Range queries are capped so one request cannot ask the slot generator to
 *  walk a decade of calendar. */
export const slotRangeSchema = z
  .object({
    from: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid start date.'),
    to: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid end date.'),
  })
  .refine((v) => new Date(v.from) <= new Date(v.to), {
    message: 'End date must be on or after the start date.',
    path: ['to'],
  })
  .refine(
    (v) => (new Date(v.to).getTime() - new Date(v.from).getTime()) / 86_400_000 <= 62,
    { message: 'Please request at most 62 days at a time.', path: ['to'] },
  );

export const doctorCreateAppointmentSchema = z
  .object({
    patientId: z.string().uuid('Please choose a valid patient.'),
    scheduledAt: isoDateTime.refine(
      (v) => new Date(v).getTime() > Date.now(),
      'Please choose a date and time in the future.',
    ),
    durationMins: z.number().int().min(5).max(240).optional(),
    mode: z.nativeEnum(AppointmentMode).default(AppointmentMode.InPerson),
    reason: z.string().trim().max(500).nullable().optional(),
    locationName: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export type DoctorCreateAppointmentDto = z.infer<typeof doctorCreateAppointmentSchema>;

/**
 * One endpoint, two operations — but never both at once. Rescheduling and
 * changing status are different decisions with different audit meanings, and
 * accepting them together would make "moved and cancelled" expressible.
 */
export const updateAppointmentSchema = z
  .object({
    scheduledAt: isoDateTime.optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
    cancelReason: z.string().trim().max(300).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .strict()
  .refine((v) => v.scheduledAt !== undefined || v.status !== undefined, {
    message: 'Provide either a new time or a new status.',
  })
  .refine((v) => !(v.scheduledAt !== undefined && v.status !== undefined), {
    message: 'Reschedule and status change are separate actions — please do one at a time.',
  });

export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;
