import { z } from 'zod';
import { EncounterType, LkwCertainty, LkwSource } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Encounter & Stroke Assessment Validation
// ─────────────────────────────────────────────────────────────────────────────

export const createEncounterSchema = z.object({
  type: z.nativeEnum(EncounterType),
  locationName: z.string().trim().max(200).nullable().optional(),
  chiefComplaint: z.string().trim().max(500).nullable().optional(),
  appointmentId: z.string().uuid('Invalid appointment reference.').nullable().optional(),
});

export type CreateEncounterDto = z.infer<typeof createEncounterSchema>;

export const closeEncounterSchema = z.object({
  status: z.enum(['Completed', 'Cancelled']).default('Completed'),
});

export type CloseEncounterDto = z.infer<typeof closeEncounterSchema>;

export const listEncountersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListEncountersDto = z.infer<typeof listEncountersSchema>;

/**
 * A single request body models the FULL current state of a stroke
 * assessment, not a patch — every symptom flag and LKW field must be
 * present. This is deliberate: a clinical checklist where an omitted field
 * silently means "unchanged" is a real patient-safety hazard (did the
 * clinician mean "no facial weakness" or "did not check"?). Every write
 * requires an explicit `reason` for the LKW revision log — see
 * encounter.service.ts's transactional write for why.
 */
export const upsertStrokeAssessmentSchema = z.object({
  lkwAt: z
    .string()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), 'Please enter a valid date and time.')
    .refine(
      (val) => new Date(val).getTime() <= Date.now(),
      'Last Known Well cannot be in the future.',
    )
    .nullable(),
  lkwCertainty: z.nativeEnum(LkwCertainty),
  lkwSource: z.nativeEnum(LkwSource).nullable(),
  lkwNote: z.string().trim().max(500).nullable(),

  facialWeakness: z.boolean(),
  armWeakness: z.boolean(),
  legWeakness: z.boolean(),
  speechDifficulty: z.boolean(),
  suddenConfusion: z.boolean(),
  visionProblem: z.boolean(),
  severeHeadache: z.boolean(),
  balanceProblem: z.boolean(),
  lossOfConsciousness: z.boolean(),
  otherSymptomNote: z.string().trim().max(500).nullable(),

  onAnticoagulants: z.boolean().nullable(),

  /**
   * Required whenever this call changes lkwAt/lkwCertainty/lkwSource from
   * their previous value — enforced in the service (not here), because the
   * validator does not have the previous value to compare against.
   */
  lkwChangeReason: z.string().trim().max(300).nullable().optional(),
});

export type UpsertStrokeAssessmentDto = z.infer<typeof upsertStrokeAssessmentSchema>;
