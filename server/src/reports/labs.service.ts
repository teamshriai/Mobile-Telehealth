import type { LabFlag, DiagnosticReportStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional } from '../utils/encryption';
import { requireOwnPatientId } from '../portal/ownPatient';

// ─────────────────────────────────────────────────────────────────────────────
// Lab reports — shown exactly as the laboratory issued them.
//
// ⚠️ THE FLAG IS THE LAB'S. `flag` is passed through as stored; nothing here
// compares a value against its range. A patient portal that decided on its
// own which result is "high" would be interpreting results, which is the
// laboratory's and the doctor's job, not ours.
//
// ⚠️ Only Final or Amended reports reach the patient — the same rule as
// signed visits: a preliminary report is not yet a statement the lab stands by.
// ─────────────────────────────────────────────────────────────────────────────

export interface LabResultView {
  id: string;
  analyteCode: string;
  name: string;
  value: string;
  valueNumeric: number | null;
  unit: string | null;
  referenceRange: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: LabFlag | null;
  method: string | null;
}

export interface LabReportView {
  id: string;
  reportNumber: string;
  panelName: string;
  specimen: string;
  fasting: boolean | null;
  collectedAt: Date;
  reportedAt: Date;
  status: DiagnosticReportStatus;
  labName: string;
  validatedBy: { name: string | null; registration: string | null; role: string | null } | null;
  orderedBy: string | null;
  comment: string | null;
  isAtlasVocabulary: boolean;
  results: LabResultView[];
}

/** "12.0–15.0", "< 200", "≥ 90" — the printed range, when the lab gave none as text. */
export function rangeText(r: {
  referenceRangeText: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
}): string | null {
  if (r.referenceRangeText) return r.referenceRangeText;
  if (r.referenceLow !== null && r.referenceHigh !== null)
    return `${r.referenceLow}–${r.referenceHigh}`;
  if (r.referenceHigh !== null) return `< ${r.referenceHigh}`;
  if (r.referenceLow !== null) return `> ${r.referenceLow}`;
  return null;
}

const RELEASED: DiagnosticReportStatus[] = ['Final', 'Amended'];

export const labsRepository = {
  /** Released reports, newest first — used by the portal and the assistant context. */
  async reportsFor(patientId: string, take = 200): Promise<LabReportView[]> {
    const rows = await prisma.labReport.findMany({
      where: { patientId, deletedAt: null, status: { in: RELEASED } },
      include: { results: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { collectedAt: 'desc' },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      reportNumber: r.reportNumber,
      panelName: r.panelName,
      specimen: r.specimen,
      fasting: r.fasting,
      collectedAt: r.collectedAt,
      reportedAt: r.reportedAt,
      status: r.status,
      labName: r.labName,
      validatedBy:
        r.validatedByName !== null || r.validatedByRole !== null
          ? {
              name: r.validatedByName,
              registration: r.validatedByRegistration,
              role: r.validatedByRole,
            }
          : null,
      orderedBy: r.orderedByName,
      comment: decryptFieldOptional(r.comment) ?? null,
      isAtlasVocabulary: r.isAtlasVocabulary,
      results: r.results.map((x) => ({
        id: x.id,
        analyteCode: x.analyteCode,
        name: x.analyteName,
        value: x.value,
        valueNumeric: x.valueNumeric,
        unit: x.unit,
        referenceRange: rangeText(x),
        referenceLow: x.referenceLow,
        referenceHigh: x.referenceHigh,
        flag: x.flag,
        method: x.method,
      })),
    }));
  },
};

export const labsService = {
  async list(userId: string): Promise<{ reports: LabReportView[] }> {
    const patientId = await requireOwnPatientId(userId);
    return { reports: await labsRepository.reportsFor(patientId) };
  },
};
