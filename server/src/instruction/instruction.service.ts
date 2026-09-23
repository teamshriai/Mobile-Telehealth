import type { PatientInstruction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import {
  encryptField,
  encryptFieldOptional,
  decryptFieldOptional,
  decryptField,
} from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Instructions & Education — S-06-08
//
// ⚠️ CMP-DPDP-02: instructions are issued in the PATIENT'S language, not the
// clinician's. The clinician's own wording is retained alongside any
// translated or simplified version so the author's intent is never silently
// replaced — which is also what makes a later AI rewrite safe to add.
// ─────────────────────────────────────────────────────────────────────────────

const ENCRYPTED_FIELDS = ['body', 'clinicianWording'] as const;

/** The languages the demo cast actually reads (UI_ATLAS §8, Bengaluru hub). */
export const SUPPORTED_LANGUAGES = ['en', 'kn', 'hi', 'ta', 'ml'] as const;

export const issueInstructionSchema = z
  .object({
    patientId: z.string().uuid(),
    encounterId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(10).max(5000),
    language: z.enum(SUPPORTED_LANGUAGES).default('en'),
  })
  .strict();

export type IssueInstructionDto = z.infer<typeof issueInstructionSchema>;

function decryptInstruction(row: PatientInstruction): PatientInstruction {
  const out = { ...row };
  for (const field of ENCRYPTED_FIELDS) {
    const v = out[field];
    if (typeof v === 'string' && v.length > 0) {
      out[field] = (field === 'body' ? decryptField(v) : decryptFieldOptional(v)) as never;
    }
  }
  return out;
}

type Actor = { id: string; roleName: string };
type Meta = { ipAddress?: string; userAgent?: string };

export const instructionService = {
  async listForPatient(actor: Actor, patientId: string, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);
    const rows = await prisma.patientInstruction.findMany({
      where: { patientId },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
    return rows.map(decryptInstruction);
  },

  async issue(actor: Actor, dto: IssueInstructionDto, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, dto.patientId, meta);

    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: actor.id },
      select: { firstName: true, lastName: true },
    });
    if (doctor === null) {
      throw new AppError('Only a clinician with a doctor profile can issue instructions.', 403);
    }

    const row = await prisma.patientInstruction.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        title: dto.title,
        body: encryptField(dto.body),
        // With no rewrite step in play, the issued text IS the clinician's
        // wording. Stored explicitly rather than left null so the column
        // means the same thing before and after a rewrite feature exists.
        clinicianWording: encryptFieldOptional(dto.body),
        language: dto.language,
        issuedByUserId: actor.id,
        issuedByName: `Dr. ${doctor.firstName} ${doctor.lastName}`.trim(),
      },
    });

    auditService.log({
      action: AuditAction.InstructionsIssued,
      userId: actor.id,
      resource: 'patient_instruction',
      resourceId: row.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { patientId: dto.patientId, language: dto.language },
    });

    return decryptInstruction(row);
  },
};
