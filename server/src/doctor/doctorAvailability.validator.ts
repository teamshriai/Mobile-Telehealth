import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const upsertAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_REGEX, 'Use 24-hour HH:mm format.'),
    endTime: z.string().regex(TIME_REGEX, 'Use 24-hour HH:mm format.'),
    slotDurationMins: z.number().int().min(5).max(240).optional().default(30),
    isActive: z.boolean().optional().default(true),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });

export type UpsertAvailabilityDto = z.infer<typeof upsertAvailabilitySchema>;

export const toggleAvailabilitySchema = z.object({ isActive: z.boolean() }).strict();

export type ToggleAvailabilityDto = z.infer<typeof toggleAvailabilitySchema>;

export const createLeaveSchema = z
  .object({
    startDate: z.string().refine((v) => !isNaN(new Date(v).getTime()), 'Invalid start date.'),
    endDate: z.string().refine((v) => !isNaN(new Date(v).getTime()), 'Invalid end date.'),
    reason: z.string().trim().max(300).optional(),
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    message: 'End date must be on or after the start date.',
    path: ['endDate'],
  });

export type CreateLeaveDto = z.infer<typeof createLeaveSchema>;
