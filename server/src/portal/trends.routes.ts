import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { trendsService } from './trends.service';

/**
 * /api/v1/me/trends — the patient's own readings, lab results and dose log,
 * for Home's line chart. No route takes a patient id: the service resolves it
 * from the session. It reads three kinds of record, so it needs all three
 * permissions a patient already holds.
 */
export const trendsRouter = Router();

trendsRouter.get(
  '/',
  authenticate,
  requirePermission(Permission.VitalReadOwn),
  requirePermission(Permission.ReportReadOwn),
  requirePermission(Permission.RxReadOwn),
  asyncHandler(async (req: Request, res: Response) => {
    // Health data: never cached by a browser or a proxy.
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(
      ApiResponseBuilder.success('Trends retrieved.', await trendsService.forUser(req.user!.id)),
    );
  }),
);
