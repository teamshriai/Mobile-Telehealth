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
  listCosignQueue,
  cosignNote,
  returnNoteToAuthor,
  checkNoteQuality,
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

// ── Co-sign queue (S-06-09) ─────────────────────────────────────────────────
// ⚠️ MUST stay above '/:id'. Express resolves in declaration order, so a bare
// ':id' parameter route declared first would swallow the literal
// '/cosign-queue' path and try to parse it as a note id.
router.get(
  '/cosign-queue',
  authenticate,
  requirePermission(Permission.NoteCosignAssigned),
  listCosignQueue,
);

// Literal path, so it must also sit above '/:id'.
router.post(
  '/quality-check',
  authenticate,
  requirePermission(Permission.NoteWriteAssigned),
  checkNoteQuality,
);

router.get('/:id', authenticate, requirePermission(Permission.NoteReadAssigned), getNote);
router.patch('/:id', authenticate, requirePermission(Permission.NoteWriteAssigned), updateNote);
router.delete(
  '/:id',
  authenticate,
  requirePermission(Permission.NoteWriteAssigned),
  deleteNoteDraft,
);

// ⚠️ Gated on WRITE, not SIGN — deliberately.
//
// Submitting your own note for the record is something any author may do.
// What DIFFERS by capability is the outcome: an author holding
// `note:sign:own` produces a Signed note; one without it produces a
// CosignPending note for a consultant. That decision is made once, in
// clinicalNote.service.sign, from capabilities. Gating the route on
// NoteSignOwn would 403 a Resident before that logic could ever run.
router.post('/:id/sign', authenticate, requirePermission(Permission.NoteWriteAssigned), signNote);
router.post('/:id/addenda', authenticate, requirePermission(Permission.NoteAmendOwn), amendNote);

router.post(
  '/:id/cosign',
  authenticate,
  requirePermission(Permission.NoteCosignAssigned),
  cosignNote,
);
router.post(
  '/:id/return',
  authenticate,
  requirePermission(Permission.NoteCosignAssigned),
  returnNoteToAuthor,
);

export { router as clinicalNoteRouter };
