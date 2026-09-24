import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction } from '../services/audit.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

// ─────────────────────────────────────────────────────────────────────────────
// Template & Order-Set Manager — S-06-10 (ARC-18, effective-dated master data)
//
// ⚠️ Promoting a personal template to facility-wide is a GOVERNANCE ACT, not a
// convenience: it requires a different capability (held by the hospital
// administrator, persona P-02), and it records a named owner and a review
// date. An unowned, never-reviewed facility-wide template is how one
// clinician's habit silently becomes everyone's default.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which surface a template fills. Closed set.
 *
 * ⚠️ THIS IS THE SINGLE SOURCE OF TRUTH and the client mirrors it verbatim
 * (`TemplateManager.tsx` → `CATEGORIES`). It did not until 23-Sep-2026: the
 * client offered `Consultation | Order set | Discharge | Procedure | Follow-up`
 * while this enum accepted a disjoint set, so **every template save from the UI
 * was rejected with a 400** and surfaced as a generic "Could not save this
 * template." Creating a template was completely impossible and no test noticed,
 * because nothing exercised the write path end to end.
 *
 * `Consultation` and `Procedure` are here because the seeded library is full of
 * whole-note structures — presenting complaint, examination, impression, plan —
 * which are not any single section. Forcing them into `Subjective` would have
 * made the enum true and the data wrong.
 *
 * `OrderSet` is one word on the wire. The UI shows "Order set"; what is stored
 * and validated is `OrderSet`.
 */
const CATEGORIES = [
  'Consultation',
  'Subjective',
  'Objective',
  'Assessment',
  'Plan',
  'Instructions',
  'Procedure',
  'OrderSet',
] as const;

const upsertSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(3)
      .max(60)
      .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores.'),
    name: z.string().trim().min(3).max(120),
    category: z.enum(CATEGORIES),
    body: z.string().trim().min(3).max(8000),
  })
  .strict();

const promoteSchema = z
  .object({
    /** Facility-wide templates must carry a review commitment. */
    reviewDueAt: z.coerce.date(),
  })
  .strict();

const idParam = z.object({ id: z.string().uuid() });
const listQuery = z.object({ category: z.enum(CATEGORIES).optional() });

const router = Router();
router.use(authenticate);

/** Personal templates plus every live facility-wide one. */
router.get(
  '/',
  requirePermission(Permission.NoteWriteAssigned),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { category } = listQuery.parse(req.query);
    const now = new Date();

    const templates = await prisma.clinicalTemplate.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        // Effective-dated: a template outside its window is not offered.
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        // Your own, or anything promoted facility-wide.
        AND: [{ OR: [{ ownerUserId: req.user!.id }, { scope: 'Facility' }] }],
      },
      orderBy: [{ scope: 'desc' }, { name: 'asc' }],
      take: 200,
    });

    res.status(200).json(ApiResponseBuilder.success('Templates retrieved.', { templates }));
  }),
);

router.post(
  '/',
  requirePermission(Permission.TemplateManageOwn),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = upsertSchema.parse(req.body);

    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
      select: { firstName: true, lastName: true },
    });
    const ownerName =
      doctor === null ? 'Unknown' : `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();

    const existing = await prisma.clinicalTemplate.findUnique({ where: { key: dto.key } });
    // ⚠️ A facility-wide template is not editable through the personal path —
    // that would let one clinician silently rewrite everyone's default.
    if (existing !== null && existing.scope === 'Facility') {
      throw new AppError('This is a facility-wide template and cannot be edited here.', 403);
    }
    if (existing !== null && existing.ownerUserId !== req.user!.id) {
      throw new AppError('That template key belongs to another clinician.', 409);
    }

    const template = await prisma.clinicalTemplate.upsert({
      where: { key: dto.key },
      create: { ...dto, ownerUserId: req.user!.id, ownerName },
      update: { name: dto.name, category: dto.category, body: dto.body },
    });

    auditService.log({
      action: AuditAction.TemplateSaved,
      userId: req.user!.id,
      resource: 'clinical_template',
      resourceId: template.id,
      ...getRequestMeta(req),
      metadata: { key: dto.key, scope: template.scope },
    });

    res.status(201).json(ApiResponseBuilder.success('Template saved.', { template }));
  }),
);

/** A clinician asks; they cannot approve their own request. */
router.post(
  '/:id/request-promotion',
  requirePermission(Permission.TemplateManageOwn),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = idParam.parse(req.params);
    const result = await prisma.clinicalTemplate.updateMany({
      where: { id, ownerUserId: req.user!.id, scope: 'Personal' },
      data: { promotionRequestedAt: new Date() },
    });
    if (result.count === 0) throw new AppError('Template not found.', 404);

    res
      .status(200)
      .json(
        ApiResponseBuilder.success(
          'Promotion requested. An administrator will review it.',
          undefined,
        ),
      );
  }),
);

/** The governance act itself — a different capability, a named approver. */
router.post(
  '/:id/promote',
  requirePermission(Permission.TemplatePromoteFacility),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = idParam.parse(req.params);
    const { reviewDueAt } = promoteSchema.parse(req.body);

    if (reviewDueAt.getTime() <= Date.now()) {
      throw new AppError('The review date must be in the future.', 400);
    }

    const result = await prisma.clinicalTemplate.updateMany({
      where: { id, scope: 'Personal' },
      data: {
        scope: 'Facility',
        promotedAt: new Date(),
        promotedByUserId: req.user!.id,
        reviewDueAt,
      },
    });
    if (result.count === 0) {
      throw new AppError('Template not found, or it is already facility-wide.', 404);
    }

    auditService.log({
      action: AuditAction.TemplatePromoted,
      userId: req.user!.id,
      resource: 'clinical_template',
      resourceId: id,
      ...getRequestMeta(req),
      metadata: { reviewDueAt: reviewDueAt.toISOString() },
    });

    res.status(200).json(ApiResponseBuilder.success('Template promoted facility-wide.', undefined));
  }),
);

export { router as templateRouter };
