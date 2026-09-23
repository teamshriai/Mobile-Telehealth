import type { Request, Response } from 'express';
import { z } from 'zod';
import { registerPatientSchema, searchPatientsSchema } from './patient.validator';
import { patientService } from './patient.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Controller
// HTTP only: parse → delegate → respond. Path params validated the same way
// appointment.controller.ts does — a malformed id should 400, not reach a
// service method that assumes a well-formed value.
// ─────────────────────────────────────────────────────────────────────────────

/** SHRI-AI Patient IDs are the public identifier used in every path param
 *  here — never the internal database UUID. Format-checked at the route
 *  boundary so a malformed value 400s before any lookup is attempted. */
const shriIdParamSchema = z.object({
  shriPatientId: z.string().trim().min(1, 'A patient reference is required.'),
});

const linkAccountBodySchema = z.object({
  targetUserId: z.string().uuid('Invalid account reference.'),
});

export const registerPatient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = registerPatientSchema.parse(req.body);
  const result = await patientService.register(req.user!.id, dto, getRequestMeta(req));

  res.status(201).json(
    ApiResponseBuilder.success('Patient registered.', {
      patient: result.patient,
      duplicates: result.duplicates,
    }),
  );
});

export const searchPatients = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = searchPatientsSchema.parse(req.query);
  const result = await patientService.search(req.user!.id, dto, getRequestMeta(req));

  res.status(200).json(ApiResponseBuilder.success('Search complete.', result));
});

export const getPatient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shriPatientId } = shriIdParamSchema.parse(req.params);
  const patient = await patientService.getByShriPatientId(
    { id: req.user!.id, roleName: req.user!.roleName },
    shriPatientId,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('Patient retrieved.', { patient }));
});

/**
 * The clinician's clinical view — demographics plus health history.
 *
 * ⚠️ Separate from GET /:shriPatientId rather than widening it, because the
 * two have genuinely different audiences: the narrow shape is an identity
 * confirmation (used during registration and duplicate-matching), this one
 * is a clinical read. Widening the narrow one would have pushed allergies and
 * medications into every registration screen that never needed them.
 */
export const getPatientClinical = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { shriPatientId } = shriIdParamSchema.parse(req.params);
    const patient = await patientService.getClinicalByShriPatientId(
      { id: req.user!.id, roleName: req.user!.roleName },
      shriPatientId,
      getRequestMeta(req),
    );

    res.status(200).json(ApiResponseBuilder.success('Patient retrieved.', { patient }));
  },
);

export const linkAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shriPatientId } = shriIdParamSchema.parse(req.params);
  const { targetUserId } = linkAccountBodySchema.parse(req.body);

  const internalId = await patientService.resolveInternalId(shriPatientId);
  if (internalId === null) {
    res.status(404).json(ApiResponseBuilder.error('Patient record not found.'));
    return;
  }

  const patient = await patientService.linkAccount(
    req.user!.id,
    internalId,
    targetUserId,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('Account linked.', { patient }));
});
