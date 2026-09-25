import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import {
  getConditions,
  getInstructions,
  getMedications,
  getVisit,
  getVisits,
} from './portal.controller';

// ─────────────────────────────────────────────────────────────────────────────
// /api/v1/me — the patient's own clinical record, read-only.
//
// ⚠️ No route here takes a patient id. "Which patient" is always the
// authenticated user (see ownPatient.ts), so there is no parameter to tamper
// with. Each route still requires its own `*:read:own` capability, so a role
// that is not a patient is refused before any query runs.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get('/medications', authenticate, requirePermission(Permission.RxReadOwn), getMedications);
router.get(
  '/conditions',
  authenticate,
  requirePermission(Permission.ProblemReadOwn),
  getConditions,
);
router.get(
  '/instructions',
  authenticate,
  requirePermission(Permission.InstructionReadOwn),
  getInstructions,
);
router.get('/visits', authenticate, requirePermission(Permission.VisitReadOwn), getVisits);
router.get('/visits/:visitId', authenticate, requirePermission(Permission.VisitReadOwn), getVisit);

export { router as portalRouter };
