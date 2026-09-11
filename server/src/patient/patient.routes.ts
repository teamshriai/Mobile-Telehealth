import { Router } from 'express';
import { registerPatient, searchPatients, getPatient, linkAccount } from './patient.controller';
import { createEncounter, listEncounters } from '../encounter/encounter.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission, requireAnyPermission } from '../middleware/authorize';
import { patientSearchLimiter } from '../middleware/rateLimiter';
import { Permission } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Router
//
// Guarded with requirePermission/requireAnyPermission — routes declare WHAT
// capability they need, never WHO holds it (see appointment.routes.ts for
// the same convention). Row-level ownership (which patient a Doctor/
// HealthcareWorker may actually see) is enforced in patient.service, not here.
//
// GET /:shriPatientId uses requireAnyPermission because it is reachable two
// distinct ways: a clinician holding only `read:assigned` (checked
// afterward, row-by-row, in the service) OR a caller holding the broader
// `read:any`. See middleware/authorize.ts's requireAnyPermission for why
// this is OR, not the default AND.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.post('/', authenticate, requirePermission(Permission.PatientCreateAny), registerPatient);

// Rate limiter runs BEFORE authenticate, matching the existing PATCH
// /password convention in auth.routes.ts — a flood of search requests
// should be throttled before it even reaches the DB round-trip that
// authenticate performs, not after.
router.get(
  '/search',
  patientSearchLimiter,
  authenticate,
  requirePermission(Permission.PatientSearchAny),
  searchPatients,
);

router.get(
  '/:shriPatientId',
  authenticate,
  requireAnyPermission(Permission.PatientReadAssigned, Permission.PatientReadAny),
  getPatient,
);

router.post(
  '/:shriPatientId/link-account',
  authenticate,
  requirePermission(Permission.PatientManageAny),
  linkAccount,
);

// ── Encounters, nested under the patient they belong to ────────────────────
// Row-level access (does this actor have a relationship with THIS patient?)
// is enforced inside encounter.service, exactly as every other check in this
// file is — the permission here only answers "may this role ever open/list
// encounters at all?".
router.post(
  '/:shriPatientId/encounters',
  authenticate,
  requirePermission(Permission.EncounterCreateAny),
  createEncounter,
);

router.get(
  '/:shriPatientId/encounters',
  authenticate,
  requireAnyPermission(Permission.EncounterReadAssigned, Permission.EncounterReadOwn),
  listEncounters,
);

export { router as patientRouter };
