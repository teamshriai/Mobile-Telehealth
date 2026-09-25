import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../instruction/instruction.service';

/** Same five languages the instructions module issues in. */
export const noteLanguage = z.enum(SUPPORTED_LANGUAGES);

const body = z
  .string()
  .trim()
  .min(1, 'The note is empty.')
  .max(5000, 'Please keep a note under 5,000 characters.');

const visibility = z.enum(['Private', 'CareTeam']);

/**
 * When the patient says this happened. Defaults to now; a past time is
 * allowed (a note written the next morning about last night), a future one
 * is not, and nothing older than a year — a typo, not a memory.
 */
const recordedAt = z
  .string()
  .datetime({ offset: true })
  .refine((v) => new Date(v).getTime() <= Date.now() + 60_000, 'That time is in the future.')
  .refine(
    (v) => new Date(v).getTime() >= Date.now() - 366 * 24 * 3600_000,
    'That time is too far in the past.',
  )
  .optional();

/** Multipart text fields that accompany the audio. */
export const transcribeFieldsSchema = z.object({ language: noteLanguage, recordedAt }).strict();

export const createTypedNoteSchema = z
  .object({ body, language: noteLanguage, visibility, recordedAt })
  .strict();

export const confirmDraftSchema = z.object({ body, visibility }).strict();

export const updateNoteSchema = z
  .object({ body: body.optional(), visibility: visibility.optional() })
  .strict()
  .refine((v) => v.body !== undefined || v.visibility !== undefined, 'Nothing to change.');

export const noteIdParam = z.object({ id: z.string().uuid('Invalid note reference.') });

export type CreateTypedNoteDto = z.infer<typeof createTypedNoteSchema>;
export type ConfirmDraftDto = z.infer<typeof confirmDraftSchema>;
export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;
