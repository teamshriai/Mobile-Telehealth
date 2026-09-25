import type { PatientHealthNote, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional, encryptFieldOptional } from '../utils/encryption';

// The only layer that touches Prisma for health notes, and the only one that
// knows `body` and `machineTranscript` are encrypted — the house convention.

export type HealthNote = PatientHealthNote & {
  audioFile: {
    id: string;
    storageKey: string;
    sha256: string;
    mimeType: string;
    deletedAt: Date | null;
  } | null;
};

const INCLUDE = {
  audioFile: {
    select: { id: true, storageKey: true, sha256: true, mimeType: true, deletedAt: true },
  },
} satisfies Prisma.PatientHealthNoteInclude;

function decrypt(row: HealthNote): HealthNote {
  return {
    ...row,
    body: decryptFieldOptional(row.body) ?? null,
    machineTranscript: decryptFieldOptional(row.machineTranscript) ?? null,
  };
}

export const healthNoteRepository = {
  async createDraft(input: {
    patientId: string;
    authorUserId: string;
    language: string;
    recordedAt: Date;
    machineTranscript: string;
    audio: { storageKey: string; sha256: string; bytes: number; mimeType: string };
    audioDurationMs: number;
    sttModel: string;
    sttLatencyMs: number;
  }): Promise<HealthNote> {
    return prisma.$transaction(async (tx) => {
      const file = await tx.storedFile.create({
        data: { patientId: input.patientId, kind: 'HealthNoteAudio', ...input.audio },
      });
      const row = await tx.patientHealthNote.create({
        data: {
          patientId: input.patientId,
          authorUserId: input.authorUserId,
          source: 'Voice',
          status: 'Draft',
          language: input.language,
          recordedAt: input.recordedAt,
          machineTranscript: encryptFieldOptional(input.machineTranscript),
          audioFileId: file.id,
          audioDurationMs: input.audioDurationMs,
          sttModel: input.sttModel,
          sttLatencyMs: input.sttLatencyMs,
        },
        include: INCLUDE,
      });
      return decrypt(row);
    });
  },

  async createTyped(input: {
    patientId: string;
    authorUserId: string;
    language: string;
    recordedAt: Date;
    body: string;
    visibility: 'Private' | 'CareTeam';
  }): Promise<HealthNote> {
    const row = await prisma.patientHealthNote.create({
      data: {
        ...input,
        body: encryptFieldOptional(input.body),
        source: 'Typed',
        status: 'Confirmed',
        confirmedAt: new Date(),
      },
      include: INCLUDE,
    });
    return decrypt(row);
  },

  /** Scoped by BOTH ids, so another patient's note id is simply not found. */
  async findOwn(id: string, patientId: string): Promise<HealthNote | null> {
    const row = await prisma.patientHealthNote.findFirst({
      where: { id, patientId, deletedAt: null },
      include: INCLUDE,
    });
    return row === null ? null : decrypt(row);
  },

  async listConfirmed(patientId: string, onlyShared = false): Promise<HealthNote[]> {
    const rows = await prisma.patientHealthNote.findMany({
      where: {
        patientId,
        status: 'Confirmed',
        deletedAt: null,
        ...(onlyShared ? { visibility: 'CareTeam' as const } : {}),
      },
      include: INCLUDE,
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
    return rows.map(decrypt);
  },

  async confirm(id: string, patientId: string, body: string, visibility: 'Private' | 'CareTeam') {
    const { count } = await prisma.patientHealthNote.updateMany({
      where: { id, patientId, status: 'Draft', deletedAt: null },
      data: {
        body: encryptFieldOptional(body),
        visibility,
        status: 'Confirmed',
        confirmedAt: new Date(),
      },
    });
    return count;
  },

  async update(
    id: string,
    patientId: string,
    data: { body?: string; visibility?: 'Private' | 'CareTeam' },
  ) {
    const { count } = await prisma.patientHealthNote.updateMany({
      where: { id, patientId, status: 'Confirmed', deletedAt: null },
      data: {
        ...(data.body !== undefined ? { body: encryptFieldOptional(data.body) } : {}),
        ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
        editedAt: new Date(),
      },
    });
    return count;
  },

  /**
   * ⚠️ ERASES THE CONTENT, KEEPS THE FACT. The row stays (so the audit trail
   * still points at something) but its text is blanked and its audio link is
   * cut. The caller removes the audio bytes from disk.
   */
  async eraseOwn(id: string, patientId: string) {
    return prisma.$transaction(async (tx) => {
      const note = await tx.patientHealthNote.findFirst({
        where: { id, patientId, deletedAt: null },
        select: { id: true, audioFileId: true, audioFile: { select: { storageKey: true } } },
      });
      if (note === null) return null;
      await tx.patientHealthNote.update({
        where: { id },
        data: { deletedAt: new Date(), body: null, machineTranscript: null, audioFileId: null },
      });
      if (note.audioFileId !== null) {
        await tx.storedFile.update({
          where: { id: note.audioFileId },
          data: { deletedAt: new Date() },
        });
      }
      return { storageKey: note.audioFile?.storageKey ?? null };
    });
  },

  /** Drafts never confirmed within the window — any patient. Hard-deleted. */
  async takeStaleDrafts(olderThan: Date) {
    const rows = await prisma.patientHealthNote.findMany({
      where: { status: 'Draft', createdAt: { lt: olderThan } },
      select: { id: true, audioFileId: true, audioFile: { select: { storageKey: true } } },
      take: 500,
    });
    if (rows.length === 0) return [];
    const fileIds = rows.map((r) => r.audioFileId).filter((v): v is string => v !== null);
    await prisma.$transaction([
      prisma.patientHealthNote.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } }),
      prisma.storedFile.deleteMany({ where: { id: { in: fileIds } } }),
    ]);
    return rows.map((r) => r.audioFile?.storageKey).filter((v): v is string => v !== undefined);
  },
};
