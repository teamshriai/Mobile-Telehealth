import { z } from 'zod';
import { Gender } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor's own profile — onboarding + later edits.
//
// Every field is optional here: onboarding fills them in tiers (Required /
// Recommended / Optional) across several PATCH calls rather than one giant
// form, and a later profile edit may touch just one field.
// ─────────────────────────────────────────────────────────────────────────────

export const updateDoctorProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    gender: z.nativeEnum(Gender).optional(),

    // ── Required tier ────────────────────────────────────────────────────
    specialty: z.string().trim().min(1).max(150).optional(),
    yearsExperience: z.number().int().min(0).max(70).optional(),
    /** Selecting a real Hospital and typing free text are mutually
     *  exclusive — the service clears the other field when one is set. */
    hospitalId: z.string().uuid().nullable().optional(),
    hospitalName: z.string().trim().max(200).nullable().optional(),

    // ── Recommended tier ─────────────────────────────────────────────────
    qualifications: z.string().trim().max(500).optional(),
    registrationNumber: z.string().trim().max(100).optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number.')
      .optional(),

    // ── Optional tier ────────────────────────────────────────────────────
    hprId: z.string().trim().max(100).optional(),
    profilePhoto: z.string().trim().max(500).optional(),
  })
  .strict();

export type UpdateDoctorProfileDto = z.infer<typeof updateDoctorProfileSchema>;
