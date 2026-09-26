import type { DiagnosticReportStatus, ImagingModality, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { decryptField, decryptFieldOptional } from '../utils/encryption';
import { requireOwnPatientId } from '../portal/ownPatient';
import { fileStore } from '../storage/fileStore';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';

// ─────────────────────────────────────────────────────────────────────────────
// Imaging studies — the report as issued, and the images behind it.
//
// ⚠️ SCOPED BY THE SERVER-RESOLVED PATIENT. Every lookup includes the
// patient id from the session; a study, series or instance of anyone else is
// "not found", never "forbidden".
//
// ⚠️ ONLY REPORTED STUDIES. A study appears once its report is Final or
// Amended — the same rule as signed visits.
//
// ⚠️ ILLUSTRATIVE IMAGES ARE NEVER SERVED WITHOUT THEIR CREDIT. A study flagged
// illustrative but lacking an attribution is refused (the migration's CHECK
// makes that impossible to store; this is the second lock).
// ─────────────────────────────────────────────────────────────────────────────

type Meta = { ipAddress?: string; userAgent?: string };
const RELEASED: DiagnosticReportStatus[] = ['Final', 'Amended'];

export interface ImagingStudySummary {
  id: string;
  accessionNumber: string;
  title: string;
  modality: ImagingModality;
  bodyPart: string;
  performedAt: Date;
  performingFacility: string;
  orderedBy: string | null;
  report: {
    number: string;
    status: DiagnosticReportStatus;
    reportedAt: Date;
    reportedBy: { name: string; registration: string | null; role: string | null };
  };
  impression: string;
  seriesCount: number;
  imageCount: number;
  isIllustrative: boolean;
}

export interface ImagingStudyDetail extends ImagingStudySummary {
  reportText: {
    clinicalIndication: string | null;
    technique: string | null;
    comparison: string | null;
    findings: string;
    impression: string;
  };
  reportingFacility: string | null;
  provenance: { isIllustrative: boolean; attribution: string | null; note: string | null };
  series: Array<{
    id: string;
    number: number;
    description: string;
    dicomModality: string;
    instanceCount: number;
    keyInstanceNumber: number | null;
    rows: number;
    columns: number;
    sliceThicknessMm: number | null;
    spacingMm: number | null;
    defaultWindow: { center: number; width: number } | null;
    totalBytes: number;
    instances: Array<{ id: string; number: number; sliceLocation: number | null }>;
  }>;
}

const studyInclude = {
  report: true,
  series: { orderBy: { seriesNumber: 'asc' as const } },
} satisfies Prisma.ImagingStudyInclude;

type StudyRow = Prisma.ImagingStudyGetPayload<{ include: typeof studyInclude }>;

function loadStudy(patientId: string, studyId: string): Promise<StudyRow | null> {
  return prisma.imagingStudy.findFirst({
    where: { id: studyId, patientId, deletedAt: null, report: { status: { in: RELEASED } } },
    include: studyInclude,
  });
}

function summary(s: StudyRow): ImagingStudySummary {
  const r = s.report!;
  return {
    id: s.id,
    accessionNumber: s.accessionNumber,
    title: s.title,
    modality: s.modality,
    bodyPart: s.bodyPart,
    performedAt: s.performedAt,
    performingFacility: s.performingFacilityName,
    orderedBy: s.orderedByName,
    report: {
      number: r.reportNumber,
      status: r.status,
      reportedAt: r.reportedAt,
      reportedBy: {
        name: r.reportedByName,
        registration: r.reportedByRegistration,
        role: r.reportedByRole,
      },
    },
    impression: decryptField(r.impression),
    seriesCount: s.seriesCount,
    imageCount: s.instanceCount,
    isIllustrative: s.isIllustrative,
  };
}

function assertAttributed(s: { isIllustrative: boolean; imageAttribution: string | null }): void {
  if (s.isIllustrative && (s.imageAttribution === null || s.imageAttribution.trim() === '')) {
    throw new AppError('These images cannot be shown without their credit line.', 500);
  }
}

/** A reported study with the report's words, for the assistant's context. */
export interface ImagingReportText extends ImagingStudySummary {
  clinicalIndication: string | null;
  findings: string;
  illustrativeNote: string | null;
}

export const imagingRepository = {
  /** Reported studies with report text, newest first — the assistant context
   *  (the same studies, and the same report, the patient sees). */
  async reportTextsFor(patientId: string, take = 20): Promise<ImagingReportText[]> {
    const rows = await prisma.imagingStudy.findMany({
      where: { patientId, deletedAt: null, report: { status: { in: RELEASED } } },
      include: studyInclude,
      orderBy: { performedAt: 'desc' },
      take,
    });
    return rows.map((s) => ({
      ...summary(s),
      clinicalIndication: decryptFieldOptional(s.report!.clinicalIndication) ?? null,
      findings: decryptField(s.report!.findings),
      illustrativeNote: s.illustrativeNote,
    }));
  },

  /** Reported studies, newest first — the portal list and the assistant context. */
  async studiesFor(patientId: string, take = 100): Promise<ImagingStudySummary[]> {
    const rows = await prisma.imagingStudy.findMany({
      where: { patientId, deletedAt: null, report: { status: { in: RELEASED } } },
      include: studyInclude,
      orderBy: { performedAt: 'desc' },
      take,
    });
    return rows.map(summary);
  },
};

/** Instance numbers ordered centre-out from the key image, so the first image paints first. */
export function centreOut(numbers: number[], key: number | null): number[] {
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted.length === 0) return sorted;
  let idx = key === null ? Math.floor(sorted.length / 2) : Math.max(0, sorted.indexOf(key));
  if (idx < 0) idx = Math.floor(sorted.length / 2);
  const out = [sorted[idx]];
  for (let d = 1; out.length < sorted.length; d++) {
    if (idx + d < sorted.length) out.push(sorted[idx + d]);
    if (idx - d >= 0) out.push(sorted[idx - d]);
  }
  return out;
}

/** `?only=3,4,5` → a set of instance numbers (at most 2000, positive integers). */
export function parseOnly(raw: unknown): Set<number> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const nums = raw
    .split(',')
    .slice(0, 2000)
    .map((x) => Number(x.trim()));
  if (nums.some((n) => !Number.isInteger(n) || n < 1))
    throw new AppError('Invalid image list.', 400);
  return new Set(nums);
}

export interface FramePlan {
  contentLength: number;
  frames: Array<{ instanceNumber: number; storageKey: string; sha256: string; bytes: number }>;
}

export const imagingService = {
  async list(userId: string): Promise<{ studies: ImagingStudySummary[] }> {
    const patientId = await requireOwnPatientId(userId);
    return { studies: await imagingRepository.studiesFor(patientId) };
  },

  async detail(userId: string, studyId: string, meta: Meta): Promise<ImagingStudyDetail> {
    const patientId = await requireOwnPatientId(userId);
    const s = await loadStudy(patientId, studyId);
    if (s === null) throw new AppError('Study not found.', 404);
    assertAttributed(s);
    const r = s.report!;
    // Instance ids per series, for the one-at-a-time fallback in the viewer.
    const instances = await prisma.imagingInstance.findMany({
      where: { patientId, seriesId: { in: s.series.map((x) => x.id) } },
      select: { id: true, seriesId: true, instanceNumber: true, sliceLocation: true },
      orderBy: { instanceNumber: 'asc' },
    });
    auditService.log({
      action: AuditAction.ImagingStudyViewed,
      userId,
      severity: AuditSeverity.Info,
      resource: 'imaging_study',
      resourceId: s.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return {
      ...summary(s),
      reportText: {
        clinicalIndication: decryptFieldOptional(r.clinicalIndication) ?? null,
        technique: decryptFieldOptional(r.technique) ?? null,
        comparison: decryptFieldOptional(r.comparison) ?? null,
        findings: decryptField(r.findings),
        impression: decryptField(r.impression),
      },
      reportingFacility: r.reportingFacilityName,
      provenance: {
        isIllustrative: s.isIllustrative,
        attribution: s.imageAttribution,
        note: s.illustrativeNote,
      },
      series: s.series.map((x) => ({
        id: x.id,
        number: x.seriesNumber,
        description: x.description,
        dicomModality: x.dicomModality,
        instanceCount: x.instanceCount,
        keyInstanceNumber: x.keyInstanceNumber,
        rows: x.rows,
        columns: x.columns,
        sliceThicknessMm: x.sliceThicknessMm,
        spacingMm: x.spacingMm,
        defaultWindow:
          x.defaultWindowCenter !== null && x.defaultWindowWidth !== null
            ? { center: x.defaultWindowCenter, width: x.defaultWindowWidth }
            : null,
        totalBytes: x.totalBytes,
        instances: instances
          .filter((i) => i.seriesId === x.id)
          .map((i) => ({ id: i.id, number: i.instanceNumber, sliceLocation: i.sliceLocation })),
      })),
    };
  },

  /** What a frames stream will send, in order — resolved and scoped before a byte is written. */
  async framePlan(
    userId: string,
    studyId: string,
    seriesId: string,
    only: Set<number> | null,
    meta: Meta,
  ): Promise<FramePlan> {
    const patientId = await requireOwnPatientId(userId);
    const series = await prisma.imagingSeries.findFirst({
      where: {
        id: seriesId,
        studyId,
        study: { patientId, deletedAt: null, report: { status: { in: RELEASED } } },
      },
      include: {
        study: { select: { isIllustrative: true, imageAttribution: true } },
        instances: { include: { file: true } },
      },
    });
    if (series === null) throw new AppError('Series not found.', 404);
    assertAttributed(series.study);
    const byNumber = new Map(series.instances.map((i) => [i.instanceNumber, i]));
    const order = centreOut([...byNumber.keys()], series.keyInstanceNumber).filter(
      (n) => only === null || only.has(n),
    );
    const frames: FramePlan['frames'] = [];
    for (const n of order) {
      const inst = byNumber.get(n)!;
      if (
        inst.patientId !== patientId ||
        inst.file.patientId !== patientId ||
        inst.file.deletedAt !== null
      )
        continue;
      frames.push({
        instanceNumber: n,
        storageKey: inst.file.storageKey,
        sha256: inst.file.sha256,
        bytes: inst.file.bytes,
      });
    }
    auditService.log({
      action: AuditAction.ImagingImagesAccessed,
      userId,
      severity: AuditSeverity.Info,
      resource: 'imaging_series',
      resourceId: series.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { frames: frames.length, via: 'stream' },
    });
    return { frames, contentLength: frames.reduce((n, f) => n + 8 + f.bytes, 0) };
  },

  /** One instance (the stored gzip bytes) — the fallback path. */
  async instance(
    userId: string,
    studyId: string,
    instanceId: string,
    meta: Meta,
  ): Promise<{ gzip: Buffer }> {
    const patientId = await requireOwnPatientId(userId);
    const inst = await prisma.imagingInstance.findFirst({
      where: {
        id: instanceId,
        patientId,
        series: {
          studyId,
          study: { patientId, deletedAt: null, report: { status: { in: RELEASED } } },
        },
      },
      include: {
        file: true,
        series: { select: { study: { select: { isIllustrative: true, imageAttribution: true } } } },
      },
    });
    if (inst === null || inst.file.deletedAt !== null) throw new AppError('Image not found.', 404);
    assertAttributed(inst.series.study);
    auditService.log({
      action: AuditAction.ImagingImagesAccessed,
      userId,
      severity: AuditSeverity.Info,
      resource: 'imaging_instance',
      resourceId: inst.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { via: 'instance' },
    });
    return { gzip: await fileStore.read(inst.file.storageKey, inst.file.sha256) };
  },

  readFrame(storageKey: string, sha256: string): Promise<Buffer> {
    return fileStore.read(storageKey, sha256);
  },
};
