import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { patientRepository } from '../patient/patient.repository';
import { requireOwnPatientId } from '../portal/ownPatient';
import { fileStore } from '../storage/fileStore';
import { env } from '../config/env.config';
import { detectEmergency, type EmergencyCategory } from '../ai/safety/emergency.guard';
import { parsePcm16kMonoWav } from '../transcription/wav';
import { transcriptionService } from '../transcription/transcription.service';
import { healthNoteRepository, type HealthNote } from './healthNote.repository';
import type { ConfirmDraftDto, CreateTypedNoteDto, UpdateNoteDto } from './healthNote.validator';

// ─────────────────────────────────────────────────────────────────────────────
// Patient health notes — PATIENT-GENERATED, never clinical findings.
//
// ⚠️ OWNERSHIP IS NEVER A PARAMETER. Every patient-side method resolves the
// patient from the authenticated user and looks rows up by (id, patientId).
// Another patient's note id is "not found", indistinguishable from a typo.
//
// ⚠️ NOBODY MONITORS THESE. A note is not a message to the care team, and
// the UI says so. If the words look like an emergency, the response carries
// `emergency` so the screen can say "call 108 now" — the same deterministic
// rules the AI assistant uses, run on the text the patient confirmed.
//
// ⚠️ CLINICIANS SEE ONLY WHAT WAS SHARED: `visibility = CareTeam`, confirmed,
// not deleted, and only with a care relationship. A private note is not
// readable by any role, including Admin.
// ─────────────────────────────────────────────────────────────────────────────

type Meta = { ipAddress?: string; userAgent?: string };
type Actor = { id: string; roleName: string };

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface HealthNoteResponse {
  id: string;
  source: HealthNote['source'];
  status: HealthNote['status'];
  visibility: HealthNote['visibility'];
  body: string | null;
  language: string;
  recordedAt: Date;
  confirmedAt: Date | null;
  editedAt: Date | null;
  /** True when the saved text differs from what speech-to-text produced. */
  correctedAfterTranscription: boolean;
  hasAudio: boolean;
  audioDurationMs: number | null;
}

function toResponse(n: HealthNote): HealthNoteResponse {
  const corrected =
    n.source === 'Voice' &&
    n.machineTranscript !== null &&
    n.body !== null &&
    n.body !== n.machineTranscript;
  return {
    id: n.id,
    source: n.source,
    status: n.status,
    visibility: n.visibility,
    body: n.body,
    language: n.language,
    recordedAt: n.recordedAt,
    confirmedAt: n.confirmedAt,
    editedAt: n.editedAt,
    /** True when the saved text differs from what speech-to-text produced. */
    correctedAfterTranscription: corrected,
    hasAudio: n.audioFile !== null && n.audioFile.deletedAt === null,
    audioDurationMs: n.audioDurationMs,
  };
}

function emergencyFor(text: string): { category: EmergencyCategory } | null {
  const hit = detectEmergency(text);
  return hit === null ? null : { category: hit.category };
}

function audit(
  action: AuditAction,
  userId: string,
  noteId: string,
  meta: Meta,
  metadata: Record<string, unknown> = {},
): void {
  // ⚠️ Never the note text: it is PHI in the patient's own words.
  auditService.log({
    action,
    userId,
    severity: AuditSeverity.Info,
    resource: 'patient_health_note',
    resourceId: noteId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata,
  });
}

export const healthNoteService = {
  /** Whether the recorder should be offered at all. */
  capabilities() {
    return { voice: transcriptionService.enabled, maxSeconds: env.STT_MAX_SECONDS };
  },

  /**
   * Audio in → Draft note with the machine transcript out.
   *
   * Transcribe FIRST, store SECOND: a clip that cannot be transcribed (busy,
   * timeout, garbage) leaves nothing behind on disk.
   */
  async transcribe(
    userId: string,
    audio: Buffer,
    fields: { language: string; recordedAt?: string },
    meta: Meta,
  ) {
    const patientId = await requireOwnPatientId(userId);
    void this.purgeStaleDrafts();

    const wav = parsePcm16kMonoWav(audio, env.STT_MAX_SECONDS);
    if (!wav.ok) throw new AppError(wav.reason, 400);

    const result = await transcriptionService.transcribe(wav.samples, fields.language);
    const stored = await fileStore.put(audio);

    let draft: HealthNote;
    try {
      draft = await healthNoteRepository.createDraft({
        patientId,
        authorUserId: userId,
        language: fields.language,
        recordedAt: fields.recordedAt === undefined ? new Date() : new Date(fields.recordedAt),
        machineTranscript: result.text,
        audio: { ...stored, mimeType: 'audio/wav' },
        audioDurationMs: wav.durationMs,
        sttModel: result.engine,
        sttLatencyMs: result.latencyMs,
      });
    } catch (err) {
      // No row points at the file, so it must not outlive the failure.
      await fileStore.remove(stored.storageKey);
      throw err;
    }

    audit(AuditAction.TranscriptionRequested, userId, draft.id, meta, {
      language: fields.language,
      durationMs: wav.durationMs,
      latencyMs: result.latencyMs,
      quality: result.quality,
      engine: result.engine,
    });

    return {
      draftId: draft.id,
      text: result.text,
      quality: result.quality,
      durationMs: wav.durationMs,
      language: fields.language,
    };
  },

  async confirmDraft(userId: string, id: string, dto: ConfirmDraftDto, meta: Meta) {
    const patientId = await requireOwnPatientId(userId);
    const count = await healthNoteRepository.confirm(id, patientId, dto.body, dto.visibility);
    if (count === 0)
      throw new AppError(
        'That draft was not found. It may have expired — please record again.',
        404,
      );
    const note = (await healthNoteRepository.findOwn(id, patientId))!;
    audit(AuditAction.HealthNoteCreated, userId, id, meta, {
      source: 'Voice',
      visibility: dto.visibility,
      corrected: note.body !== note.machineTranscript,
    });
    return { note: toResponse(note), emergency: emergencyFor(dto.body) };
  },

  async createTyped(userId: string, dto: CreateTypedNoteDto, meta: Meta) {
    const patientId = await requireOwnPatientId(userId);
    const note = await healthNoteRepository.createTyped({
      patientId,
      authorUserId: userId,
      language: dto.language,
      recordedAt: dto.recordedAt === undefined ? new Date() : new Date(dto.recordedAt),
      body: dto.body,
      visibility: dto.visibility,
    });
    audit(AuditAction.HealthNoteCreated, userId, note.id, meta, {
      source: 'Typed',
      visibility: dto.visibility,
    });
    return { note: toResponse(note), emergency: emergencyFor(dto.body) };
  },

  async list(userId: string) {
    const patientId = await requireOwnPatientId(userId);
    return (await healthNoteRepository.listConfirmed(patientId)).map(toResponse);
  },

  async update(userId: string, id: string, dto: UpdateNoteDto, meta: Meta) {
    const patientId = await requireOwnPatientId(userId);
    const count = await healthNoteRepository.update(id, patientId, dto);
    if (count === 0) throw new AppError('Note not found.', 404);
    audit(AuditAction.HealthNoteUpdated, userId, id, meta, {
      bodyChanged: dto.body !== undefined,
      ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
    });
    const note = (await healthNoteRepository.findOwn(id, patientId))!;
    return {
      note: toResponse(note),
      emergency: dto.body === undefined ? null : emergencyFor(dto.body),
    };
  },

  /** Erases the text, deletes the audio from disk, keeps an audit-visible row. */
  async remove(userId: string, id: string, meta: Meta) {
    const patientId = await requireOwnPatientId(userId);
    const erased = await healthNoteRepository.eraseOwn(id, patientId);
    if (erased === null) throw new AppError('Note not found.', 404);
    if (erased.storageKey !== null) await fileStore.remove(erased.storageKey);
    audit(AuditAction.HealthNoteDeleted, userId, id, meta);
  },

  async audio(userId: string, id: string, meta: Meta) {
    const patientId = await requireOwnPatientId(userId);
    const note = await healthNoteRepository.findOwn(id, patientId);
    if (note === null || note.audioFile === null || note.audioFile.deletedAt !== null) {
      throw new AppError('Recording not found.', 404);
    }
    const bytes = await fileStore.read(note.audioFile.storageKey, note.audioFile.sha256);
    audit(AuditAction.HealthNoteAudioAccessed, userId, id, meta);
    return { bytes, mimeType: note.audioFile.mimeType };
  },

  /**
   * Clinician view: notes the patient SHARED, confirmed and not deleted.
   * Row access goes through the same care-relationship check as every other
   * clinical read, so no relationship means no notes.
   */
  async listSharedForClinician(actor: Actor, shriPatientId: string, meta: Meta) {
    const patient = await patientRepository.findByShriPatientId(shriPatientId);
    if (patient === null) throw new AppError('Patient record not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, patient.id, meta);
    const notes = await healthNoteRepository.listConfirmed(patient.id, true);
    return notes.map((n) => {
      const r = toResponse(n);
      return {
        id: r.id,
        source: r.source,
        body: r.body,
        language: r.language,
        recordedAt: r.recordedAt,
        confirmedAt: r.confirmedAt,
        editedAt: r.editedAt,
        correctedAfterTranscription: r.correctedAfterTranscription,
      };
    });
  },

  /** Drafts the patient never confirmed are not kept — audio included. */
  async purgeStaleDrafts(): Promise<number> {
    try {
      const keys = await healthNoteRepository.takeStaleDrafts(new Date(Date.now() - DRAFT_TTL_MS));
      await Promise.all(keys.map((k) => fileStore.remove(k)));
      return keys.length;
    } catch (err) {
      console.error('[health-notes] draft purge failed:', (err as Error).message);
      return 0;
    }
  },
};
