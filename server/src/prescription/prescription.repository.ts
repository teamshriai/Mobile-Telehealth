import type { Prescription, PrescriptionItem, Drug, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { encryptFieldOptional, decryptFieldOptional, encryptField } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Repository
//
// The only layer that touches Prisma, and the only layer that knows which
// columns are encrypted — the house convention.
// ─────────────────────────────────────────────────────────────────────────────

/** Patient-facing directions are free text about a patient's treatment. */
const ITEM_ENCRYPTED_FIELDS = ['instructions'] as const;

export type PrescriptionWithItems = Prescription & {
  items: Array<PrescriptionItem & { drug: Drug }>;
};

function decryptItem<T extends Partial<PrescriptionItem>>(row: T): T {
  const out = { ...row };
  for (const field of ITEM_ENCRYPTED_FIELDS) {
    if (field in row) out[field] = decryptFieldOptional(row[field]);
  }
  return out;
}

function decryptPrescription(row: PrescriptionWithItems): PrescriptionWithItems {
  return { ...row, items: row.items.map((i) => ({ ...decryptItem(i), drug: i.drug })) };
}

const WITH_ITEMS = {
  items: { include: { drug: true }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.PrescriptionInclude;

export const prescriptionRepository = {
  async findById(id: string): Promise<PrescriptionWithItems | null> {
    const row = await prisma.prescription.findUnique({ where: { id }, include: WITH_ITEMS });
    return row === null ? null : decryptPrescription(row);
  },

  async findOwnerPatientId(id: string): Promise<string | null> {
    const row = await prisma.prescription.findUnique({
      where: { id },
      select: { patientId: true },
    });
    return row?.patientId ?? null;
  },

  async listForPatient(patientId: string): Promise<PrescriptionWithItems[]> {
    const rows = await prisma.prescription.findMany({
      where: { patientId },
      include: WITH_ITEMS,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(decryptPrescription);
  },

  /** The open draft for this encounter, if the clinician already started one. */
  async findDraftForEncounter(
    encounterId: string,
    authorUserId: string,
  ): Promise<PrescriptionWithItems | null> {
    const row = await prisma.prescription.findFirst({
      where: { encounterId, authorUserId, status: 'Draft' },
      include: WITH_ITEMS,
      orderBy: { createdAt: 'desc' },
    });
    return row === null ? null : decryptPrescription(row);
  },

  async create(input: {
    patientId: string;
    encounterId: string | null;
    rxNumber: string;
    authorUserId: string;
  }): Promise<PrescriptionWithItems> {
    const row = await prisma.prescription.create({ data: input, include: WITH_ITEMS });
    return decryptPrescription(row);
  },

  async addItem(
    prescriptionId: string,
    item: {
      drugId: string;
      dose: number;
      doseUnit: string;
      route: string;
      frequency: string;
      durationDays: number;
      indicationCode: string | null;
      substitutionAllowed: boolean;
      instructions: string | null;
    },
  ): Promise<void> {
    await prisma.prescriptionItem.create({
      data: { ...item, prescriptionId, instructions: encryptFieldOptional(item.instructions) },
    });
  },

  /**
   * ⚠️ Scoped to Draft, like clinicalNote.updateDraft. A signed prescription
   * cannot gain or lose a line even if a caller bypasses the service — the
   * database is the backstop, not the service layer's good intentions.
   */
  async removeItem(prescriptionId: string, itemId: string): Promise<boolean> {
    const parent = await prisma.prescription.findFirst({
      where: { id: prescriptionId, status: 'Draft' },
      select: { id: true },
    });
    if (parent === null) return false;

    const result = await prisma.prescriptionItem.deleteMany({
      where: { id: itemId, prescriptionId },
    });
    return result.count > 0;
  },

  /** Also Draft-scoped — double-signing is impossible by construction. */
  async sign(
    id: string,
    attestation: {
      signedByUserId: string;
      signerName: string;
      signerRegistrationNumber: string | null;
      signerHprId: string | null;
    },
  ): Promise<boolean> {
    const result = await prisma.prescription.updateMany({
      where: { id, status: 'Draft' },
      data: { ...attestation, status: 'Signed', signedAt: new Date() },
    });
    return result.count > 0;
  },

  async recordOverride(input: {
    prescriptionId: string;
    drugName: string;
    allergenKey: string;
    ruleText: string;
    reason: string;
    overriddenByUserId: string;
    overriddenByName: string;
    secondConsultantUserId: string;
    secondConsultantName: string;
    secondConsultantRegistrationNumber: string | null;
  }): Promise<string> {
    const row = await prisma.prescriptionOverride.create({
      data: { ...input, reason: encryptField(input.reason) },
      select: { id: true },
    });
    return row.id;
  },

  /** Live overrides on a prescription — what suppresses a standing hard stop. */
  async listOverrides(prescriptionId: string): Promise<Array<{ drugName: string }>> {
    return prisma.prescriptionOverride.findMany({
      where: { prescriptionId },
      select: { drugName: true },
    });
  },

  // ── The deterministic safety tables ───────────────────────────────────────
  async listActiveRules() {
    return prisma.allergyRule.findMany({
      where: { isActive: true },
      select: { allergenKey: true, blocksClass: true, rationale: true },
    });
  },

  async findDrug(id: string): Promise<Drug | null> {
    return prisma.drug.findUnique({ where: { id } });
  },

  async searchDrugs(query: string, limit = 20): Promise<Drug[]> {
    return prisma.drug.findMany({
      where: { isActive: true, genericName: { contains: query, mode: 'insensitive' } },
      orderBy: { genericName: 'asc' },
      take: limit,
    });
  },

  async doseBandFor(drugId: string, cohort: string) {
    return prisma.doseRange.findUnique({ where: { drugId_cohort: { drugId, cohort } } });
  },

  /**
   * Alternatives offered when a drug is blocked.
   *
   * ⚠️ Matched on THERAPEUTIC class, not route. An alternative to an
   * antibiotic must be another antibiotic; selecting by route alone returns
   * whatever else happens to be intravenous, which on this formulary means
   * offering a thrombolytic in place of an antibiotic. A wrong suggestion on
   * a safety gate is worse than no suggestion, because the gate is exactly
   * where a tired clinician is most likely to accept what they are offered.
   *
   * Route is used only to ORDER the results, so a same-route option surfaces
   * first where one exists.
   */
  async findAlternatives(
    blockedClass: string,
    therapeuticClass: string | null,
    preferredRoute: string,
    limit = 3,
  ): Promise<Drug[]> {
    // No therapeutic class recorded means we cannot say what a sensible
    // alternative would be. Return none and let the UI say so honestly.
    if (therapeuticClass === null) return [];

    const candidates = await prisma.drug.findMany({
      where: {
        isActive: true,
        therapeuticClass,
        NOT: { allergenClass: blockedClass },
      },
      orderBy: [{ isNlem: 'desc' }, { genericName: 'asc' }],
      take: limit * 3,
    });

    return candidates
      .sort((a, b) => Number(b.route === preferredRoute) - Number(a.route === preferredRoute))
      .slice(0, limit);
  },

  /**
   * Highest sequence issued so far under the RX/{fy}/ prefix, or 0.
   *
   * ⚠️ NOT A COUNT. `count + 1` was the original implementation and it is
   * wrong the moment the series has a gap: delete one prescription out of
   * twenty and the next allocation reuses a number that still exists, which
   * surfaces as a unique-constraint violation and an unopenable prescription
   * screen. Abandoned empty baskets are cleaned up routinely, so gaps are the
   * normal state of this table, not an edge case.
   *
   * `rxNumber` is a fixed-width zero-padded suffix, so ordering the string
   * descending orders the sequence descending.
   */
  async maxSequenceForFinancialYear(prefix: string): Promise<number> {
    const latest = await prisma.prescription.findFirst({
      where: { rxNumber: { startsWith: prefix } },
      orderBy: { rxNumber: 'desc' },
      select: { rxNumber: true },
    });
    if (latest === null) return 0;

    const seq = Number.parseInt(latest.rxNumber.slice(prefix.length), 10);
    return Number.isFinite(seq) ? seq : 0;
  },
};
