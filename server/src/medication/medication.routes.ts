import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { ApiResponseBuilder } from '../utils/apiResponse';
import {
  cancelRefill,
  generateSummary,
  getOverview,
  getSummary,
  logDose,
  requestRefill,
  undoDose,
} from './medication.controller';

// ─────────────────────────────────────────────────────────────────────────────
// /api/v1/me/medications — the patient's Medicines section.
//
// ⚠️ No route takes a patient id. Reading needs `rx:read:own`; logging a dose
// `medication:log:own`; a refill `refill:request:own`; the AI summary
// `ai:use:own` (it spends the patient's AI allowance).
// ─────────────────────────────────────────────────────────────────────────────

/** Per patient: generous for real use, a wall against a script hammering it. */
const doseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyGenerator: (req: Request) => `dose:${req.user?.id ?? 'anonymous'}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error('Too many updates in a short time. Please wait a moment.'),
});

const router = Router();
const read = [authenticate, requirePermission(Permission.RxReadOwn)];

router.get('/', ...read, getOverview);
router.post(
  '/doses',
  authenticate,
  requirePermission(Permission.MedicationLogOwn),
  doseLimiter,
  logDose,
);
router.delete(
  '/doses/:id',
  authenticate,
  requirePermission(Permission.MedicationLogOwn),
  doseLimiter,
  undoDose,
);
router.post(
  '/:itemId/refill',
  authenticate,
  requirePermission(Permission.RefillRequestOwn),
  requestRefill,
);
router.delete(
  '/refills/:id',
  authenticate,
  requirePermission(Permission.RefillRequestOwn),
  cancelRefill,
);
router.get('/summary', ...read, requirePermission(Permission.AiInsightsUseOwn), getSummary);
router.post('/summary', ...read, requirePermission(Permission.AiInsightsUseOwn), generateSummary);

export { router as medicationRouter };
