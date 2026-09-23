import type { Problem, DiagnosisCode } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { encryptFieldOptional, decryptFieldOptional } from '../utils/encryption';

/** Clinician free text about a diagnosis. */
const ENCRYPTED_FIELDS = ['note'] as const;

function decryptProblem<T extends Partial<Problem>>(row: T): T {
  const out = { ...row };
  for (const field of ENCRYPTED_FIELDS) {
    if (field in row) out[field] = decryptFieldOptional(row[field]);
  }
  return out;
}

export const problemRepository = {
  async listForPatient(patientId: string): Promise<Problem[]> {
    const rows = await prisma.problem.findMany({
      where: { patientId },
      // Active first, then most recently recorded — a resolved problem is
      // history, not the thing a clinician is looking at now.
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(decryptProblem);
  },

  async findOwnerPatientId(id: string): Promise<string | null> {
    const row = await prisma.problem.findUnique({ where: { id }, select: { patientId: true } });
    return row?.patientId ?? null;
  },

  async findActiveByCode(patientId: string, code: string): Promise<Problem | null> {
    return prisma.problem.findFirst({ where: { patientId, code, status: 'Active' } });
  },

  async create(input: {
    patientId: string;
    onsetEncounterId: string | null;
    code: string;
    codeTitle: string;
    onsetDate: Date | null;
    note: string | null;
    recordedByUserId: string;
  }): Promise<Problem> {
    const row = await prisma.problem.create({
      data: { ...input, note: encryptFieldOptional(input.note) },
    });
    return decryptProblem(row);
  },

  /**
   * ⚠️ Resolving DATES a problem, it never deletes it (S-06-05: "never
   * deletes history"). There is deliberately no delete method on this
   * repository at all.
   */
  async resolve(id: string): Promise<boolean> {
    const result = await prisma.problem.updateMany({
      where: { id, status: 'Active' },
      data: { status: 'Resolved', resolvedAt: new Date() },
    });
    return result.count > 0;
  },

  // ── Diagnosis catalogue ──────────────────────────────────────────────────
  async searchCodes(query: string, limit = 20): Promise<DiagnosisCode[]> {
    return prisma.diagnosisCode.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { startsWith: query.toUpperCase() } },
          { title: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ isLeaf: 'desc' }, { code: 'asc' }],
      take: limit,
    });
  },

  async findCode(code: string): Promise<DiagnosisCode | null> {
    return prisma.diagnosisCode.findUnique({ where: { code } });
  },
};
