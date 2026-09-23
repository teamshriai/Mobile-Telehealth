import { z } from 'zod';

export const addProblemSchema = z
  .object({
    patientId: z.string().uuid(),
    encounterId: z.string().uuid().nullable().optional(),
    code: z.string().trim().min(2).max(20),
    onsetDate: z.coerce.date().nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const codeSearchSchema = z.object({ q: z.string().trim().min(1).max(60) });

export type AddProblemDto = z.infer<typeof addProblemSchema>;
