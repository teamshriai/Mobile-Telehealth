import { Router } from 'express';
import { listCareTeam } from './careteam.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';

const router = Router();

router.get('/', authenticate, requirePermission(Permission.CareTeamReadOwn), listCareTeam);

export { router as careTeamRouter };
