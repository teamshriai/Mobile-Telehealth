import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import {
  confirmDraft,
  createTyped,
  deleteNote,
  getAudio,
  getCapabilities,
  listNotes,
  transcribe,
  updateNote,
} from './healthNote.controller';

// ─────────────────────────────────────────────────────────────────────────────
// /api/v1/me/health-notes — the patient's own notes (voice or typed).
//
// ⚠️ THE ONLY MULTIPART ROUTE IN THE API. Memory storage (the bytes are
// validated, encrypted and written by the service, never streamed to disk
// raw), ONE file field, 5 MB — a 120 s 16 kHz mono PCM clip is ~3.8 MB —
// and no other fields beyond two short ones. The declared type is ignored;
// wav.ts reads the actual bytes.
// ─────────────────────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4, fieldSize: 200, parts: 5 },
});

function singleAudio(req: Request, res: Response, next: NextFunction): void {
  upload.single('audio')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(
        new AppError(
          err.code === 'LIMIT_FILE_SIZE'
            ? 'That recording is too large. Recordings can be at most 2 minutes.'
            : 'The recording could not be read.',
          400,
        ),
      );
      return;
    }
    next(err as Error | undefined);
  });
}

/**
 * ⚠️ PER PATIENT, NOT PER IP. Transcription is the most expensive thing a
 * patient can ask this server to do, and a family behind one home router
 * must not share a budget. Runs after `authenticate`, so the user is known.
 */
const transcribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) => `health-note-stt:${req.user?.id ?? 'anonymous'}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: ApiResponseBuilder.error(
    'You have made a lot of recordings in the last hour. Please try again later, or type your note.',
  ),
});

const router = Router();
const own = [authenticate, requirePermission(Permission.HealthNoteWriteOwn)];

router.get('/capabilities', ...own, getCapabilities);
router.get('/', ...own, listNotes);
router.post('/', ...own, createTyped);
router.post('/transcriptions', ...own, transcribeLimiter, singleAudio, transcribe);
router.post('/:id/confirm', ...own, confirmDraft);
router.patch('/:id', ...own, updateNote);
router.delete('/:id', ...own, deleteNote);
router.get('/:id/audio', ...own, getAudio);

export { router as healthNoteRouter };
