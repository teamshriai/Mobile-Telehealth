import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  signNote,
  amendNote,
  deleteNoteDraft,
} from './clinicalNote.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Clinical Note Router — mounted at /api/v1/notes.
//
// The permission layer answers "may this role ever do this". Whether this
// clinician may touch THIS patient's notes is answered inside the service by
// careRelationshipService.requirePatientAccess, on every single route — the
// same split the appointment and encounter routers document.
//
// `sign` and `amend` carry their own permissions rather than riding on
// `write`: attesting to the legal record and correcting an attested record
// are different acts from drafting, and a deployment may well want to grant
// them to different people (a resident drafts, a consultant signs).
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get('/', authenticate, requirePermission(Permission.NoteReadAssigned), listNotes);
router.post('/', authenticate, requirePermission(Permission.NoteWriteAssigned), createNote);

router.get('/:id', authenticate, requirePermission(Permission.NoteReadAssigned), getNote);
router.patch('/:id', authenticate, requirePermission(Permission.NoteWriteAssigned), updateNote);
router.delete('/:id', authenticate, requirePermission(Permission.NoteWriteAssigned), deleteNoteDraft);

router.post('/:id/sign', authenticate, requirePermission(Permission.NoteSignOwn), signNote);
router.post('/:id/addenda', authenticate, requirePermission(Permission.NoteAmendOwn), amendNote);

export { router as clinicalNoteRouter };
