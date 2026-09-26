import { Router, type Request, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { ApiResponseBuilder } from '../utils/apiResponse';
import {
  getImagingInstance,
  getImagingStudy,
  listImagingStudies,
  listLabReports,
  listVitals,
  streamSeriesFrames,
} from './reports.controller';

// ─────────────────────────────────────────────────────────────────────────────
// /api/v1/me/labs, /api/v1/me/vitals and /api/v1/me/imaging — the patient's
// own reports, read-only.
//
// ⚠️ No route takes a patient id: the service resolves it from the session.
// ─────────────────────────────────────────────────────────────────────────────

const labsRouter = Router();
labsRouter.get('/', authenticate, requirePermission(Permission.ReportReadOwn), listLabReports);

const vitalsRouter = Router();
vitalsRouter.get('/', authenticate, requirePermission(Permission.VitalReadOwn), listVitals);

/** Per patient — a CT is one stream per series, so these are generous walls, not quotas. */
const perUser = (name: string, max: number): RequestHandler =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    keyGenerator: (req: Request) => `${name}:${req.user?.id ?? 'anonymous'}`,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: ApiResponseBuilder.error(
      'Too many image requests in a short time. Please wait a moment.',
    ),
  });

const imagingRouter = Router();
const reportRead = [authenticate, requirePermission(Permission.ReportReadOwn)];
imagingRouter.get('/', ...reportRead, listImagingStudies);
imagingRouter.get('/:studyId', ...reportRead, getImagingStudy);
imagingRouter.get(
  '/:studyId/series/:seriesId/frames',
  ...reportRead,
  perUser('imaging-frames', 200),
  streamSeriesFrames,
);
imagingRouter.get(
  '/:studyId/instances/:instanceId',
  ...reportRead,
  perUser('imaging-instance', 2000),
  getImagingInstance,
);

export { labsRouter, vitalsRouter, imagingRouter };
