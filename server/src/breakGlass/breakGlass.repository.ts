import type { BreakGlassGrant, BreakGlassReason, BreakGlassOutcome } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { encryptField, decryptField } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Break-Glass Repository
//
// The only layer that touches Prisma for break-glass, and the only layer that
// knows `reason` is encrypted at rest — the same division every other module
// in this codebase uses.
// ─────────────────────────────────────────────────────────────────────────────

/** Clinician free text justifying the access. PHI-adjacent, so encrypted. */
const ENCRYPTED_FIELDS = ['reason'] as const;

export type DecryptedGrant = BreakGlassGrant;

function decryptGrant(row: BreakGlassGrant): DecryptedGrant {
  const out = { ...row };
  for (const field of ENCRYPTED_FIELDS) {
    const value = out[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        out[field] = decryptField(value);
      } catch {
        // A reason that cannot be decrypted must not take the review queue
        // down — the fact of the access is the more important record.
        out[field] = '[unreadable]';
      }
    }
  }
  return out;
}

export interface CreateGrantInput {
  patientId: string;
  actorUserId: string;
  actorName: string;
  reasonCategory: BreakGlassReason;
  reason: string;
  expiresAt: Date;
}

export const breakGlassRepository = {
  /**
   * The live grant, if any, for this actor on this patient.
   *
   * ⚠️ `expiresAt > now` is the whole safety property. Without it a grant
   * quietly becomes a permanent care relationship, which is the failure mode
   * break-glass exists to avoid.
   */
  async findActiveGrant(actorUserId: string, patientId: string): Promise<BreakGlassGrant | null> {
    const row = await prisma.breakGlassGrant.findFirst({
      where: { actorUserId, patientId, expiresAt: { gt: new Date() } },
      orderBy: { grantedAt: 'desc' },
    });
    return row === null ? null : decryptGrant(row);
  },

  /** Every live grant this actor holds — drives the persistent GP-10 banner. */
  async listActiveForActor(actorUserId: string): Promise<BreakGlassGrant[]> {
    const rows = await prisma.breakGlassGrant.findMany({
      where: { actorUserId, expiresAt: { gt: new Date() } },
      orderBy: { grantedAt: 'desc' },
    });
    return rows.map(decryptGrant);
  },

  async create(input: CreateGrantInput): Promise<BreakGlassGrant> {
    const row = await prisma.breakGlassGrant.create({
      data: { ...input, reason: encryptField(input.reason) },
    });
    return decryptGrant(row);
  },

  /**
   * The review queue. Unreviewed first and oldest first — the 24-hour clock
   * in DD-014 runs from `grantedAt`, so the oldest unreviewed grant is always
   * the most urgent.
   */
  async listForReview(
    includeReviewed: boolean,
  ): Promise<
    Array<
      BreakGlassGrant & { patient: { firstName: string; lastName: string; shriPatientId: string } }
    >
  > {
    const rows = await prisma.breakGlassGrant.findMany({
      where: includeReviewed ? {} : { reviewedAt: null },
      orderBy: [{ reviewedAt: { sort: 'asc', nulls: 'first' } }, { grantedAt: 'asc' }],
      take: 200,
      include: {
        patient: { select: { firstName: true, lastName: true, shriPatientId: true } },
      },
    });
    return rows.map((r) => ({ ...decryptGrant(r), patient: r.patient }));
  },

  async markReviewed(
    id: string,
    reviewedByUserId: string,
    outcome: BreakGlassOutcome,
    reviewNote: string | null,
  ): Promise<boolean> {
    // updateMany scoped to unreviewed: a second reviewer cannot silently
    // overwrite the first reviewer's verdict.
    const result = await prisma.breakGlassGrant.updateMany({
      where: { id, reviewedAt: null },
      data: { reviewedAt: new Date(), reviewedByUserId, outcome, reviewNote },
    });
    return result.count > 0;
  },
};
