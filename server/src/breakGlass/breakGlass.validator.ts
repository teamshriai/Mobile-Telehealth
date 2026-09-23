import { z } from 'zod';
import { BreakGlassReason, BreakGlassOutcome } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Break-Glass Validators
//
// ⚠️ The reason is a FIXED CATEGORY plus mandatory free text, never one or the
// other. UI_ATLAS S-06-05/GP-11 fixes the five categories so the review queue
// is sortable and countable; the free text is what makes a single grant
// actually reviewable by a human. A category alone is not a reason.
// ─────────────────────────────────────────────────────────────────────────────

/** ≥10 characters. Short enough not to be a burden mid-emergency, long enough
 *  that "x" is not an accepted justification for reading a stranger's record. */
const MIN_REASON_LENGTH = 10;

export const requestBreakGlassSchema = z
  .object({
    reasonCategory: z.nativeEnum(BreakGlassReason),
    reason: z
      .string()
      .trim()
      .min(
        MIN_REASON_LENGTH,
        `Please describe the reason in at least ${MIN_REASON_LENGTH} characters.`,
      )
      .max(500),
    acknowledged: z.literal(true, {
      errorMap: () => ({
        message: 'You must acknowledge that this access is logged and reviewed.',
      }),
    }),
  })
  .strict();

export const reviewBreakGlassSchema = z
  .object({
    outcome: z.nativeEnum(BreakGlassOutcome),
    reviewNote: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export type RequestBreakGlassDto = z.infer<typeof requestBreakGlassSchema>;
export type ReviewBreakGlassDto = z.infer<typeof reviewBreakGlassSchema>;
