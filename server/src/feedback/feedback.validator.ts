import { z } from 'zod';
import { FeedbackCategory } from '@prisma/client';

export const submitFeedbackSchema = z.object({
  category: z.nativeEnum(FeedbackCategory),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5.').max(5),
  doctorId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  comment: z.string().trim().max(1000).optional(),
});

export type SubmitFeedbackDto = z.infer<typeof submitFeedbackSchema>;
