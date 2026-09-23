import type { Request, Response } from 'express';
import { z } from 'zod';
import { breakGlassService } from './breakGlass.service';
import { requestBreakGlassSchema, reviewBreakGlassSchema } from './breakGlass.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

const shriParam = z.object({ shriPatientId: z.string().trim().min(3).max(40) });
const idParam = z.object({ id: z.string().uuid() });
const reviewQuery = z.object({
  includeReviewed: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

/**
 * Name and UHID only. ⚠️ Nothing clinical may be returned here — this is what
 * the break-glass modal renders BEFORE a reason has been given.
 */
export const getIdentity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shriPatientId } = shriParam.parse(req.params);
  const identity = await breakGlassService.getIdentity(
    { id: req.user!.id, roleName: req.user!.roleName },
    shriPatientId,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('Patient identity retrieved.', { identity }));
});

export const requestGrant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shriPatientId } = shriParam.parse(req.params);
  const dto = requestBreakGlassSchema.parse(req.body);

  const { grant, audited } = await breakGlassService.requestGrant(
    { id: req.user!.id, roleName: req.user!.roleName },
    shriPatientId,
    dto,
    getRequestMeta(req),
  );

  res.status(201).json(
    ApiResponseBuilder.success('Emergency access granted. This access is logged and reviewed.', {
      grant: {
        id: grant.id,
        patientId: grant.patientId,
        reasonCategory: grant.reasonCategory,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
      },
      // Surfaced honestly rather than hidden: if the critical audit write
      // failed, access still proceeded (DD-014) and the clinician is told the
      // trail is incomplete rather than being quietly misled.
      audited,
    }),
  );
});

export const listActiveGrants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const grants = await breakGlassService.listActiveForActor(req.user!.id);
  res.status(200).json(ApiResponseBuilder.success('Active grants retrieved.', { grants }));
});

export const listForReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { includeReviewed } = reviewQuery.parse(req.query);
  const grants = await breakGlassService.listForReview(
    { id: req.user!.id },
    includeReviewed ?? false,
    getRequestMeta(req),
  );
  res.status(200).json(ApiResponseBuilder.success('Review queue retrieved.', { grants }));
});

export const reviewGrant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParam.parse(req.params);
  const dto = reviewBreakGlassSchema.parse(req.body);

  await breakGlassService.review({ id: req.user!.id }, id, dto, getRequestMeta(req));

  res.status(200).json(ApiResponseBuilder.success('Access reviewed.', undefined));
});
