import type { Request, Response } from 'express';
import { z } from 'zod';
import { problemService } from './problem.service';
import { addProblemSchema, codeSearchSchema } from './problem.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

const idParam = z.object({ id: z.string().uuid() });
const patientQuery = z.object({ patientId: z.string().uuid() });
const actorOf = (req: Request): { id: string; roleName: string } => ({
  id: req.user!.id,
  roleName: req.user!.roleName,
});

export const searchCodes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q } = codeSearchSchema.parse(req.query);
  const codes = await problemService.searchCodes(q);
  res.status(200).json(ApiResponseBuilder.success('Code search complete.', { codes }));
});

export const listProblems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { patientId } = patientQuery.parse(req.query);
  const problems = await problemService.listForPatient(
    actorOf(req),
    patientId,
    getRequestMeta(req),
  );
  res.status(200).json(ApiResponseBuilder.success('Problem list retrieved.', { problems }));
});

export const addProblem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = addProblemSchema.parse(req.body);
  const problem = await problemService.add(actorOf(req), dto, getRequestMeta(req));
  res.status(201).json(ApiResponseBuilder.success('Problem added.', { problem }));
});

export const resolveProblem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParam.parse(req.params);
  await problemService.resolve(actorOf(req), id, getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Problem resolved.', undefined));
});
