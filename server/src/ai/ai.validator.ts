import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights validation
//
// The message cap is deliberately generous but finite. It is not a product
// rule — it is the bound that stops a single request writing an unbounded blob
// into an encrypted column.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_MESSAGE_LENGTH = 4000;

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Type a question before sending.')
    .max(MAX_MESSAGE_LENGTH, `Please keep your question under ${MAX_MESSAGE_LENGTH} characters.`),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1, 'A title is required.').max(120),
});

export type RenameConversationDto = z.infer<typeof renameConversationSchema>;

/** Route params are user input too — a non-uuid id must 400, not reach Prisma. */
export const conversationIdSchema = z.object({
  id: z.string().uuid('That conversation id is not valid.'),
});
