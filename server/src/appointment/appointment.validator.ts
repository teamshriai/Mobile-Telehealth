import { z } from 'zod';
import { AppointmentMode } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Validation
//
// Patients REQUEST appointments; they do not confirm them. Status therefore is
// not accepted from the client on create — the service always starts a new row
// at `Requested` and only a clinician (future doctor portal) can move it to
// Confirmed. Accepting a client-supplied status would let a patient
// self-confirm a slot nobody has agreed to.
// ─────────────────────────────────────────────────────────────────────────────

/** How far ahead a patient may request. Beyond this is almost always a typo. */
const MAX_MONTHS_AHEAD = 6;

export const createAppointmentSchema = z.object({
  /**
   * Absolute UTC instant. The client sends an ISO string built from the
   * patient's local date+time; we never store wall-clock time without a zone.
   */
  scheduledAt: z
    .string()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), 'Please choose a valid date and time.')
    .refine((val) => new Date(val).getTime() > Date.now(), 'Please choose a date and time in the future.')
    .refine((val) => {
      const limit = new Date();
      limit.setMonth(limit.getMonth() + MAX_MONTHS_AHEAD);
      return new Date(val).getTime() <= limit.getTime();
    }, `Please choose a date within the next ${MAX_MONTHS_AHEAD} months.`),

  /**
   * Optional: a patient may request a visit without naming a clinician, in
   * which case the care team assigns one. Must be a real doctor id when given
   * — the service verifies existence rather than trusting the client.
   */
  doctorId: z.string().uuid('Please choose a valid clinician.').nullable().optional(),

  mode: z.nativeEnum(AppointmentMode).default(AppointmentMode.InPerson),

  /** Patient's own words. Encrypted at rest. */
  reason: z
    .string()
    .trim()
    .min(1, 'Please tell us briefly why you would like to be seen.')
    .max(500, 'Please keep this under 500 characters.'),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  /**
   * Optional but encouraged — it is what lets the care team offer the slot to
   * someone else. Not required, because forcing a justification to cancel is a
   * dark pattern.
   */
  cancelReason: z
    .string()
    .trim()
    .max(300, 'Please keep this under 300 characters.')
    .nullable()
    .optional(),
});

export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;

/**
 * Query for the list endpoint. `scope` splits upcoming vs past because those
 * are genuinely different views for a patient, not a filter they toggle.
 */
export const listAppointmentsSchema = z.object({
  scope: z.enum(['upcoming', 'past', 'all']).default('all'),
});

export type ListAppointmentsDto = z.infer<typeof listAppointmentsSchema>;
