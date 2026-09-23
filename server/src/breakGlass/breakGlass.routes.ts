import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import {
  getIdentity,
  requestGrant,
  listActiveGrants,
  listForReview,
  reviewGrant,
} from './breakGlass.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Break-Glass Routes — /api/v1/breakglass
//
// ⚠️ Note the split of capabilities. `breakglass:request:any` is held by every
// clinician who can hold a care relationship, because the whole point of
// DD-014 is that emergency access must not be gated behind an approval step.
// `breakglass:review:any` is the 24-hour audit duty and is held by Admin —
// a role with NO clinical read at all, so reviewing THAT an access happened
// never requires the reviewer to see what was accessed.
// ─────────────────────────────────────────────────────────────────────────────

export const breakGlassRouter = Router();

breakGlassRouter.use(authenticate);

/** Name + UHID only, so a clinician can confirm the right patient first. */
breakGlassRouter.get(
  '/identity/:shriPatientId',
  requirePermission(Permission.BreakGlassRequest),
  getIdentity,
);

breakGlassRouter.post(
  '/grants/:shriPatientId',
  requirePermission(Permission.BreakGlassRequest),
  requestGrant,
);

/** Drives the persistent GP-10 amber banner for the life of the grant. */
breakGlassRouter.get(
  '/grants/active',
  requirePermission(Permission.BreakGlassRequest),
  listActiveGrants,
);

breakGlassRouter.get('/review', requirePermission(Permission.BreakGlassReview), listForReview);
breakGlassRouter.patch('/review/:id', requirePermission(Permission.BreakGlassReview), reviewGrant);
