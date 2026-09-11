import { Router } from 'express';
import {
  getEncounter,
  closeEncounter,
  getAssessment,
  upsertAssessment,
  getLkwHistory,
} from './encounter.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAnyPermission, requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Encounter Router — single-encounter operations
//
// Creation and patient-scoped listing live on patientRouter (nested under
// /patients/:shriPatientId/encounters) since they are naturally a patient
// sub-resource. Everything that operates on ONE already-known encounter id
// lives here instead, mounted at /api/v1/encounters.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get(
  '/:id',
  authenticate,
  requireAnyPermission(Permission.EncounterReadAssigned, Permission.EncounterReadOwn),
  getEncounter,
);

router.patch(
  '/:id/close',
  authenticate,
  requirePermission(Permission.EncounterManageAssigned),
  closeEncounter,
);

router.get(
  '/:id/assessment',
  authenticate,
  requirePermission(Permission.AssessmentReadAssigned),
  getAssessment,
);

router.put(
  '/:id/assessment',
  authenticate,
  requirePermission(Permission.AssessmentWriteAssigned),
  upsertAssessment,
);

router.get(
  '/:id/assessment/lkw-history',
  authenticate,
  requirePermission(Permission.AssessmentReadAssigned),
  getLkwHistory,
);

export { router as encounterRouter };
