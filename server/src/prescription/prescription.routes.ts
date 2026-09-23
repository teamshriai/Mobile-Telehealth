import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import {
  searchDrugs,
  getDraftForEncounter,
  listForPatient,
  getPrescription,
  addItem,
  removeItem,
  evaluateSafety,
  signPrescription,
  overrideHardStop,
} from './prescription.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Routes — /api/v1/prescriptions
//
// Note the capability split, which is what makes the Resident role work:
// drafting is `rx:write:assigned`, signing is `rx:sign:own`, and overriding a
// hard stop is `rx:override:hard-stop`. A Resident holds the first and
// neither of the others, so they can build a basket and hand it over — with
// no code anywhere comparing their role name.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.use(authenticate);

router.get('/formulary', requirePermission(Permission.RxWriteAssigned), searchDrugs);
router.get('/', requirePermission(Permission.RxReadAssigned), listForPatient);

router.get(
  '/encounter/:encounterId/draft',
  requirePermission(Permission.RxWriteAssigned),
  getDraftForEncounter,
);

router.get('/:id', requirePermission(Permission.RxReadAssigned), getPrescription);
router.get('/:id/safety', requirePermission(Permission.RxReadAssigned), evaluateSafety);

router.post('/:id/items', requirePermission(Permission.RxWriteAssigned), addItem);
router.delete('/:id/items/:itemId', requirePermission(Permission.RxWriteAssigned), removeItem);

router.post('/:id/sign', requirePermission(Permission.RxSignOwn), signPrescription);
router.post('/:id/override', requirePermission(Permission.RxOverrideHardStop), overrideHardStop);

export { router as prescriptionRouter };
