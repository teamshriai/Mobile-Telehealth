import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { instructionService, issueInstructionSchema } from './instruction.service';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

const router = Router();
const patientQuery = z.object({ patientId: z.string().uuid() });
const actorOf = (req: Request): { id: string; roleName: string } => ({
  id: req.user!.id,
  roleName: req.user!.roleName,
});

router.use(authenticate);

router.get(
  '/',
  requirePermission(Permission.NoteReadAssigned),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { patientId } = patientQuery.parse(req.query);
    const instructions = await instructionService.listForPatient(
      actorOf(req),
      patientId,
      getRequestMeta(req),
    );
    res.status(200).json(ApiResponseBuilder.success('Instructions retrieved.', { instructions }));
  }),
);

router.post(
  '/',
  requirePermission(Permission.InstructionsWriteAssigned),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = issueInstructionSchema.parse(req.body);
    const instruction = await instructionService.issue(actorOf(req), dto, getRequestMeta(req));
    res.status(201).json(ApiResponseBuilder.success('Instructions issued.', { instruction }));
  }),
);

export { router as instructionRouter };
