import type { Request, Response } from 'express';
import { z } from 'zod';
import { prescriptionService } from './prescription.service';
import { addItemSchema, overrideSchema, drugSearchSchema } from './prescription.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';

const idParam = z.object({ id: z.string().uuid() });
const itemParam = z.object({ id: z.string().uuid(), itemId: z.string().uuid() });
const encounterParam = z.object({ encounterId: z.string().uuid() });
const patientQuery = z.object({ patientId: z.string().uuid() });

const actorOf = (req: Request): { id: string; roleName: string } => ({
  id: req.user!.id,
  roleName: req.user!.roleName,
});

export const searchDrugs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q } = drugSearchSchema.parse(req.query);
  const drugs = await prescriptionService.searchDrugs(q);
  res.status(200).json(ApiResponseBuilder.success('Formulary search complete.', { drugs }));
});

export const getDraftForEncounter = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { encounterId } = encounterParam.parse(req.params);
    const prescription = await prescriptionService.getOrCreateDraft(
      actorOf(req),
      encounterId,
      getRequestMeta(req),
    );
    res.status(200).json(ApiResponseBuilder.success('Prescription ready.', { prescription }));
  },
);

export const listForPatient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { patientId } = patientQuery.parse(req.query);
  const prescriptions = await prescriptionService.listForPatient(
    actorOf(req),
    patientId,
    getRequestMeta(req),
  );
  res.status(200).json(ApiResponseBuilder.success('Prescriptions retrieved.', { prescriptions }));
});

export const getPrescription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParam.parse(req.params);
  const prescription = await prescriptionService.getById(actorOf(req), id, getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Prescription retrieved.', { prescription }));
});

export const addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParam.parse(req.params);
  const dto = addItemSchema.parse(req.body);
  await prescriptionService.addItem(actorOf(req), id, dto, getRequestMeta(req));

  // Return the re-evaluated safety state with the basket: the gate must
  // update the instant a line is added, not on a separate round trip the
  // client might skip.
  const prescription = await prescriptionService.getById(actorOf(req), id, getRequestMeta(req));
  const safety = await prescriptionService.evaluate(actorOf(req), id, getRequestMeta(req));
  res.status(201).json(ApiResponseBuilder.success('Medicine added.', { prescription, safety }));
});

export const removeItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id, itemId } = itemParam.parse(req.params);
  await prescriptionService.removeItem(actorOf(req), id, itemId, getRequestMeta(req));

  const prescription = await prescriptionService.getById(actorOf(req), id, getRequestMeta(req));
  const safety = await prescriptionService.evaluate(actorOf(req), id, getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Medicine removed.', { prescription, safety }));
});

export const evaluateSafety = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParam.parse(req.params);
  const safety = await prescriptionService.evaluate(actorOf(req), id, getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Safety check complete.', { safety }));
});

export const signPrescription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParam.parse(req.params);
  const prescription = await prescriptionService.sign(actorOf(req), id, getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Prescription signed.', { prescription }));
});

export const overrideHardStop = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = idParam.parse(req.params);
  const dto = overrideSchema.parse(req.body);
  const { overrideId, audited } = await prescriptionService.overrideHardStop(
    actorOf(req),
    id,
    dto,
    getRequestMeta(req),
  );
  const safety = await prescriptionService.evaluate(actorOf(req), id, getRequestMeta(req));

  res
    .status(201)
    .json(
      ApiResponseBuilder.success(
        'Override recorded. This action is alerted on and reviewed within 24 hours.',
        { overrideId, audited, safety },
      ),
    );
});
