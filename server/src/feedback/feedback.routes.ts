import { Router } from 'express';
import { submitFeedback } from './feedback.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';

const router = Router();

router.post('/', authenticate, requirePermission(Permission.FeedbackSubmitOwn), submitFeedback);

export { router as feedbackRouter };
