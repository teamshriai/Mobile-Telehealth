import type { Request, Response } from 'express';
import { feedbackService } from './feedback.service';
import { submitFeedbackSchema } from './feedback.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

/**
 * POST /api/v1/feedback
 * A patient's own feedback on a doctor, hospital service, or the app.
 */
export const submitFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = submitFeedbackSchema.parse(req.body);
  const feedback = await feedbackService.submit(req.user!.id, dto, getRequestMeta(req));
  res.status(201).json(ApiResponseBuilder.success('Thank you for your feedback.', { feedback }));
});
