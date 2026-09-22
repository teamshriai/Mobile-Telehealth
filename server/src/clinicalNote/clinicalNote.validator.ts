import { z } from 'zod';

const section = z.string().trim().max(5000, 'Please keep this section under 5000 characters.');

/**
 * Creating a draft asks for nothing but the patient — a clinician starts
 * typing during the consultation and the sections fill in as they go. The
 * completeness rules live on SIGN, not on create, because a draft that
 * refuses to save is a draft that gets written on paper instead.
 */
export const createNoteSchema = z
  .object({
    patientId: z.string().uuid('Please choose a valid patient.'),
    encounterId: z.string().uuid().nullable().optional(),
    appointmentId: z.string().uuid().nullable().optional(),
    subjective: section.nullable().optional(),
    objective: section.nullable().optional(),
    assessment: section.nullable().optional(),
    plan: section.nullable().optional(),
    problemCode: z.string().trim().max(20).nullable().optional(),
    problemText: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export type CreateNoteDto = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z
  .object({
    subjective: section.nullable().optional(),
    objective: section.nullable().optional(),
    assessment: section.nullable().optional(),
    plan: section.nullable().optional(),
    problemCode: z.string().trim().max(20).nullable().optional(),
    problemText: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;

/**
 * An amendment must say something. There is no empty addendum, because an
 * addendum's whole purpose is to state what changed and why — an empty one
 * would add a timestamp to the record and nothing else.
 */
export const addendumSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(3, 'Please describe the amendment.')
      .max(5000, 'Please keep the amendment under 5000 characters.'),
  })
  .strict();

export type AddendumDto = z.infer<typeof addendumSchema>;

export const listNotesQuerySchema = z.object({
  patientId: z.string().uuid('Please choose a valid patient.'),
});
