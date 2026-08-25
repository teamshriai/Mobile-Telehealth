import { Router } from 'express';
import { getProfile, updateProfile, updatePreferences } from './profile.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { RoleName } from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// Profile Router
//
// Self-service only: a patient reads/updates their OWN profile. There is no
// :id param and no endpoint here for viewing another user's profile — that
// would require a doctor/patient assignment model, which doesn't exist yet
// (see architecture audit). Building it prematurely would mean inventing
// authorization rules with no real relationship to check them against.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get('/', authenticate, authorize(RoleName.Patient), getProfile);
router.patch('/', authenticate, authorize(RoleName.Patient), updateProfile);
router.patch('/preferences', authenticate, authorize(RoleName.Patient), updatePreferences);

export { router as profileRouter };
