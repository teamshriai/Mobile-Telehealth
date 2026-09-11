import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createEncounterSchema,
  closeEncounterSchema,
  listEncountersSchema,
  upsertStrokeAssessmentSchema,
} from './encounter.validator';
import { encounterService } from './encounter.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

// ─────────────────────────────────────────────────────────────────────────────
// Encounter Controller
// HTTP only: parse → delegate → respond. Mounted at two prefixes (see
// encounter.routes.ts): /patients/:shriPatientId/encounters and
// /encounters/:id — the former creates/lists, the latter reads/manages one.
// ─────────────────────────────────────────────────────────────────────────────

const shriIdParamSchema = z.object({
  shriPatientId: z.string().trim().min(1, 'A patient reference is required.'),
});

const encounterIdParamSchema = z.object({
  id: z.string().uuid('Invalid encounter reference.'),
});

function actorFromRequest(req: Request): { id: string; roleName: string } {
  return { id: req.user!.id, roleName: req.user!.roleName };
}

export const createEncounter = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shriPatientId } = shriIdParamSchema.parse(req.params);
  const dto = createEncounterSchema.parse(req.body);
  const encounter = await encounterService.create(
    actorFromRequest(req),
    shriPatientId,
    dto,
    getRequestMeta(req),
  );

  res.status(201).json(ApiResponseBuilder.success('Encounter created.', { encounter }));
});

export const listEncounters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shriPatientId } = shriIdParamSchema.parse(req.params);
  const dto = listEncountersSchema.parse(req.query);
  const result = await encounterService.listForPatient(
    actorFromRequest(req),
    shriPatientId,
    dto,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('Encounters retrieved.', result));
});

export const getEncounter = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = encounterIdParamSchema.parse(req.params);
  const encounter = await encounterService.getById(actorFromRequest(req), id, getRequestMeta(req));

  res.status(200).json(ApiResponseBuilder.success('Encounter retrieved.', { encounter }));
});

export const closeEncounter = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = encounterIdParamSchema.parse(req.params);
  const dto = closeEncounterSchema.parse(req.body ?? {});
  const encounter = await encounterService.close(
    actorFromRequest(req),
    id,
    dto.status,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('Encounter closed.', { encounter }));
});

export const getAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = encounterIdParamSchema.parse(req.params);
  const assessment = await encounterService.getAssessment(
    actorFromRequest(req),
    id,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('Assessment retrieved.', { assessment }));
});

export const upsertAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = encounterIdParamSchema.parse(req.params);
  const dto = upsertStrokeAssessmentSchema.parse(req.body);
  const assessment = await encounterService.upsertAssessment(
    actorFromRequest(req),
    id,
    dto,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('Assessment saved.', { assessment }));
});

export const getLkwHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = encounterIdParamSchema.parse(req.params);
  const history = await encounterService.getLkwHistory(
    actorFromRequest(req),
    id,
    getRequestMeta(req),
  );

  res.status(200).json(ApiResponseBuilder.success('LKW history retrieved.', { history }));
});
