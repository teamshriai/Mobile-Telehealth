import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { searchCodes, listProblems, addProblem, resolveProblem } from './problem.controller';

const router = Router();

router.use(authenticate);

router.get('/codes', requirePermission(Permission.ProblemReadAssigned), searchCodes);
router.get('/', requirePermission(Permission.ProblemReadAssigned), listProblems);
router.post('/', requirePermission(Permission.ProblemWriteAssigned), addProblem);
// ⚠️ PATCH, not DELETE — a problem is resolved, never removed (S-06-05).
router.patch('/:id/resolve', requirePermission(Permission.ProblemWriteAssigned), resolveProblem);

export { router as problemRouter };
