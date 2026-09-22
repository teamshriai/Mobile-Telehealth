import type { Request, Response } from 'express';
import { clinicalNoteService } from './clinicalNote.service';
import {
  createNoteSchema,
  updateNoteSchema,
  addendumSchema,
  listNotesQuerySchema,
} from './clinicalNote.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';
import { AppError } from '../middleware/errorHandler';

/** The shape careRelationshipService expects. Built from the session, never
 *  from the request body. */
function actorFrom(req: Request) {
  return { id: req.user!.id, roleName: req.user!.roleName };
}

function noteIdFrom(req: Request): string {
  const id = req.params.id;
  if (id === undefined) throw new AppError('Note id is required.', 400);
  return id;
}

export const listNotes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { patientId } = listNotesQuerySchema.parse(req.query);
  const notes = await clinicalNoteService.listForPatient(
    actorFrom(req),
    patientId,
    getRequestMeta(req),
  );
  res.status(200).json(ApiResponseBuilder.success('Notes retrieved.', { notes }));
});

export const getNote = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const note = await clinicalNoteService.getById(actorFrom(req), noteIdFrom(req), getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Note retrieved.', { note }));
});

export const createNote = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = createNoteSchema.parse(req.body);
  const note = await clinicalNoteService.create(actorFrom(req), dto, getRequestMeta(req));
  res.status(201).json(ApiResponseBuilder.success('Draft created.', { note }));
});

export const updateNote = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = updateNoteSchema.parse(req.body);
  const note = await clinicalNoteService.update(
    actorFrom(req),
    noteIdFrom(req),
    dto,
    getRequestMeta(req),
  );
  res.status(200).json(ApiResponseBuilder.success('Draft saved.', { note }));
});

export const signNote = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const note = await clinicalNoteService.sign(actorFrom(req), noteIdFrom(req), getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Note signed.', { note }));
});

export const amendNote = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = addendumSchema.parse(req.body);
  const note = await clinicalNoteService.amend(
    actorFrom(req),
    noteIdFrom(req),
    dto,
    getRequestMeta(req),
  );
  res.status(201).json(ApiResponseBuilder.success('Amendment added.', { note }));
});

export const deleteNoteDraft = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await clinicalNoteService.deleteDraft(actorFrom(req), noteIdFrom(req), getRequestMeta(req));
  res.status(200).json(ApiResponseBuilder.success('Draft discarded.'));
});
