import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Validators — S-06-07
// ─────────────────────────────────────────────────────────────────────────────

export const addItemSchema = z
  .object({
    drugId: z.string().uuid(),
    // Bounded rather than unbounded: a dose is a real quantity, and an
    // unbounded number field is how a stray keystroke becomes a 1e9 dose.
    dose: z.number().positive().max(100_000),
    doseUnit: z.string().trim().min(1).max(20),
    route: z.string().trim().min(1).max(40),
    frequency: z.string().trim().min(1).max(60),
    durationDays: z.number().int().min(1).max(365),
    indicationCode: z.string().trim().max(20).nullable().optional(),
    substitutionAllowed: z.boolean().default(true),
    instructions: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

/**
 * ⚠️ G4 override. Both a reason AND a second consultant's live credentials
 * are mandatory — UI_ATLAS §4.4. The password is verified server-side against
 * that clinician's own account; it is never stored and never logged.
 */
export const overrideSchema = z
  .object({
    itemId: z.string().uuid(),
    reason: z
      .string()
      .trim()
      .min(20, 'Please give a clinical justification of at least 20 characters.')
      .max(1000),
    secondConsultantEmail: z.string().trim().email(),
    secondConsultantPassword: z.string().min(1),
    acknowledged: z.literal(true, {
      errorMap: () => ({
        message: 'You must acknowledge that this override is alerted on and reviewed.',
      }),
    }),
  })
  .strict();

export const drugSearchSchema = z.object({
  q: z.string().trim().min(1).max(60),
});

export type AddItemDto = z.infer<typeof addItemSchema>;
export type OverrideDto = z.infer<typeof overrideSchema>;
