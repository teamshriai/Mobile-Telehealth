import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { getRequestMeta } from '../utils/requestMeta';
import { AppError } from '../middleware/errorHandler';
import { healthNoteService } from './healthNote.service';
import {
  confirmDraftSchema,
  createTypedNoteSchema,
  noteIdParam,
  transcribeFieldsSchema,
  updateNoteSchema,
} from './healthNote.validator';

// HTTP only: parse → delegate → respond. Always req.user!.id for "who"; a
// path id is only ever "which of MY notes".

export const getCapabilities = (_req: Request, res: Response): void => {
  res.json(
    ApiResponseBuilder.success('Health note capabilities.', healthNoteService.capabilities()),
  );
};

export const transcribe = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (file === undefined) throw new AppError('No recording was received.', 400);
  const fields = transcribeFieldsSchema.parse(req.body ?? {});
  const result = await healthNoteService.transcribe(
    req.user!.id,
    file.buffer,
    fields,
    getRequestMeta(req),
  );
  res
    .status(201)
    .json(
      ApiResponseBuilder.success('Recording transcribed. Please check it before saving.', result),
    );
});

export const confirmDraft = asyncHandler(async (req: Request, res: Response) => {
  const { id } = noteIdParam.parse(req.params);
  const dto = confirmDraftSchema.parse(req.body ?? {});
  res.json(
    ApiResponseBuilder.success(
      'Note saved.',
      await healthNoteService.confirmDraft(req.user!.id, id, dto, getRequestMeta(req)),
    ),
  );
});

export const createTyped = asyncHandler(async (req: Request, res: Response) => {
  const dto = createTypedNoteSchema.parse(req.body ?? {});
  res
    .status(201)
    .json(
      ApiResponseBuilder.success(
        'Note saved.',
        await healthNoteService.createTyped(req.user!.id, dto, getRequestMeta(req)),
      ),
    );
});

export const listNotes = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success('Notes retrieved.', {
      notes: await healthNoteService.list(req.user!.id),
    }),
  );
});

export const updateNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = noteIdParam.parse(req.params);
  const dto = updateNoteSchema.parse(req.body ?? {});
  res.json(
    ApiResponseBuilder.success(
      'Note updated.',
      await healthNoteService.update(req.user!.id, id, dto, getRequestMeta(req)),
    ),
  );
});

export const deleteNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = noteIdParam.parse(req.params);
  await healthNoteService.remove(req.user!.id, id, getRequestMeta(req));
  res.json(ApiResponseBuilder.success('Note deleted.', { deleted: true }));
});

export const getAudio = asyncHandler(async (req: Request, res: Response) => {
  const { id } = noteIdParam.parse(req.params);
  const { bytes, mimeType } = await healthNoteService.audio(req.user!.id, id, getRequestMeta(req));
  // ⚠️ Decrypted patient audio: never cached by a browser, proxy or CDN.
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', String(bytes.length));
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).end(bytes);
});

const shriPatientIdParam = z.object({ shriPatientId: z.string().trim().min(3).max(64) });

export const listSharedForClinician = asyncHandler(async (req: Request, res: Response) => {
  const { shriPatientId } = shriPatientIdParam.parse(req.params);
  const notes = await healthNoteService.listSharedForClinician(
    { id: req.user!.id, roleName: req.user!.roleName },
    shriPatientId,
    getRequestMeta(req),
  );
  res.json(ApiResponseBuilder.success('Patient-reported notes retrieved.', { notes }));
});
