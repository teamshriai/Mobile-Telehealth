import type { Encounter, StrokeAssessment, StrokeLkwRevision } from '@prisma/client';
import { EncounterType, NotificationType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { roleHasPermission, Permission } from '../config/permissions';
import { notificationService } from '../notification/notification.service';
import { patientRepository } from '../patient/patient.repository';
import { appointmentRepository } from '../appointment/appointment.repository';
import { withGeneratedVisitId } from '../services/patientIdentity.service';
import { encounterRepository } from './encounter.repository';
import type {
  CreateEncounterDto,
  ListEncountersDto,
  UpsertStrokeAssessmentDto,
} from './encounter.validator';
import type { RoleName } from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// Encounter Service
//
// Follows appointment.service.ts's shape: response-shaping functions, never a
// raw Prisma row returned, ownership resolved before any query. The one
// structural difference from appointment.service is that "own" scoping does
// not apply here in the same sense — a Doctor/HealthcareWorker opens
// encounters for OTHER people's records, so every method takes an explicit
// patientId and re-checks the caller's relationship to that specific patient
// via careRelationshipService, exactly the way a future Doctor-portal
// endpoint on Appointment would need to.
// ─────────────────────────────────────────────────────────────────────────────

type Actor = { id: string; roleName: string };
type Meta = { ipAddress?: string; userAgent?: string };

/**
 * Symptoms that indicate genuine urgency when present on an
 * ambulance/emergency-type encounter. Facial/arm/leg weakness and speech
 * difficulty are the FAST criteria; loss of consciousness and severe
 * headache are independently urgent regardless of encounter type framing.
 */
const URGENT_SYMPTOM_KEYS = [
  'facialWeakness',
  'armWeakness',
  'legWeakness',
  'speechDifficulty',
  'lossOfConsciousness',
  'severeHeadache',
] as const;

function toEncounterResponseShape(e: Encounter) {
  return {
    visitId: e.visitId,
    type: e.type,
    status: e.status,
    startedAt: e.startedAt,
    endedAt: e.endedAt,
    locationName: e.locationName,
    chiefComplaint: e.chiefComplaint,
    createdAt: e.createdAt,
  };
}

export type EncounterResponse = ReturnType<typeof toEncounterResponseShape>;

function toAssessmentResponseShape(a: StrokeAssessment) {
  return {
    lkwAt: a.lkwAt,
    lkwCertainty: a.lkwCertainty,
    lkwSource: a.lkwSource,
    lkwNote: a.lkwNote,
    facialWeakness: a.facialWeakness,
    armWeakness: a.armWeakness,
    legWeakness: a.legWeakness,
    speechDifficulty: a.speechDifficulty,
    suddenConfusion: a.suddenConfusion,
    visionProblem: a.visionProblem,
    severeHeadache: a.severeHeadache,
    balanceProblem: a.balanceProblem,
    lossOfConsciousness: a.lossOfConsciousness,
    otherSymptomNote: a.otherSymptomNote,
    urgentFlag: a.urgentFlag,
    onAnticoagulants: a.onAnticoagulants,
    updatedAt: a.updatedAt,
    /**
     * WORKFLOW SIGNAL, never a diagnosis. The exact wording matters here —
     * this string is the one that could end up rendered in a UI, and the
     * distinction between "potential symptoms identified" and "patient has
     * had a stroke" is a hard requirement, not phrasing preference.
     */
    clinicalNote: a.urgentFlag
      ? 'Potential stroke symptoms identified — this is a workflow flag, not a diagnosis.'
      : null,
  };
}

export type AssessmentResponse = ReturnType<typeof toAssessmentResponseShape>;

function toRevisionResponseShape(r: StrokeLkwRevision) {
  return {
    previousLkwAt: r.previousLkwAt,
    previousCertainty: r.previousCertainty,
    newLkwAt: r.newLkwAt,
    newCertainty: r.newCertainty,
    newSource: r.newSource,
    reason: r.reason,
    createdAt: r.createdAt,
  };
}

/** Resolves the SHRI-AI Patient ID → internal id, or throws the standard 404.
 *  Every service method takes the public id from the route; this is the one
 *  place that translates it, so a caller can never pass the internal UUID
 *  directly and no method below duplicates the lookup. */
async function resolvePatientInternalId(shriPatientId: string): Promise<string> {
  const patient = await patientRepository.findByShriPatientId(shriPatientId);
  if (patient === null) {
    throw new AppError('Patient record not found.', 404);
  }
  return patient.id;
}

/** Row-level check shared by every method: may this actor act on this patient
 *  at all? `patient:read:any`/`patient:manage:any` bypass it, matching the
 *  same "any" vs "assigned" pattern used throughout the codebase. */
async function assertCanActOnPatient(actor: Actor, patientId: string, meta: Meta): Promise<void> {
  const role = actor.roleName as RoleName;
  if (roleHasPermission(role, Permission.PatientReadAny)) return;
  await careRelationshipService.requirePatientAccess(actor, patientId, meta);
}

export const encounterService = {
  async create(
    actor: Actor,
    shriPatientId: string,
    dto: CreateEncounterDto,
    meta: Meta,
  ): Promise<EncounterResponse> {
    const patientId = await resolvePatientInternalId(shriPatientId);

    // Opening an encounter is itself how a HealthcareWorker ESTABLISHES a
    // relationship with a patient (see careRelationship.service's
    // hasRecentFieldRelationship) — so unlike getByShriPatientId, this does
    // NOT gate on an existing relationship. A field worker's first contact
    // with a patient IS an encounter creation.

    // The FK on appointmentId only guarantees the referenced row EXISTS —
    // it says nothing about whose row it is. Without this check, a caller
    // could pass any other patient's real appointment id and it would be
    // silently accepted, cross-linking two unrelated patients' records
    // (and permanently consuming that appointment's one-to-one Encounter
    // slot, since appointmentId is @unique). Re-using the same ownership
    // check appointment.service.ts's own endpoints rely on.
    if (dto.appointmentId) {
      const appointment = await appointmentRepository.findByIdForPatient(
        dto.appointmentId,
        patientId,
      );
      if (appointment === null) {
        throw new AppError('The selected appointment does not belong to this patient.', 400);
      }
    }

    const created = await withGeneratedVisitId((visitId) =>
      encounterRepository.create({
        visitId,
        patientId,
        type: dto.type,
        locationName: dto.locationName,
        chiefComplaint: dto.chiefComplaint,
        appointmentId: dto.appointmentId,
        createdByUserId: actor.id,
      }),
    );

    auditService.log({
      action: AuditAction.EncounterCreated,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'encounter',
      resourceId: created.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { patientShriId: shriPatientId, type: dto.type },
    });

    return toEncounterResponseShape(created);
  },

  async listForPatient(
    actor: Actor,
    shriPatientId: string,
    dto: ListEncountersDto,
    meta: Meta,
  ): Promise<{ results: EncounterResponse[]; total: number; page: number; pageSize: number }> {
    const patientId = await resolvePatientInternalId(shriPatientId);
    await assertCanActOnPatient(actor, patientId, meta);

    const { results, total } = await encounterRepository.listForPatient(
      patientId,
      dto.page,
      dto.pageSize,
    );

    return {
      results: results.map(toEncounterResponseShape),
      total,
      page: dto.page,
      pageSize: dto.pageSize,
    };
  },

  async getById(actor: Actor, encounterId: string, meta: Meta): Promise<EncounterResponse> {
    const encounter = await encounterRepository.findById(encounterId);
    if (encounter === null) {
      throw new AppError('Encounter not found.', 404);
    }
    await assertCanActOnPatient(actor, encounter.patientId, meta);
    return toEncounterResponseShape(encounter);
  },

  async close(
    actor: Actor,
    encounterId: string,
    status: 'Completed' | 'Cancelled',
    meta: Meta,
  ): Promise<EncounterResponse> {
    const encounter = await encounterRepository.findById(encounterId);
    if (encounter === null) {
      throw new AppError('Encounter not found.', 404);
    }
    await assertCanActOnPatient(actor, encounter.patientId, meta);

    const count = await encounterRepository.closeForPatient(
      encounterId,
      encounter.patientId,
      status,
    );
    if (count === 0) {
      throw new AppError('This encounter is already closed.', 409);
    }

    auditService.log({
      action: AuditAction.EncounterClosed,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'encounter',
      resourceId: encounterId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { status },
    });

    const updated = await encounterRepository.findById(encounterId);
    return toEncounterResponseShape(updated!);
  },

  async getAssessment(
    actor: Actor,
    encounterId: string,
    meta: Meta,
  ): Promise<AssessmentResponse | null> {
    const encounter = await encounterRepository.findById(encounterId);
    if (encounter === null) {
      throw new AppError('Encounter not found.', 404);
    }
    await assertCanActOnPatient(actor, encounter.patientId, meta);

    const assessment = await encounterRepository.getAssessment(encounterId);
    return assessment ? toAssessmentResponseShape(assessment) : null;
  },

  /**
   * Creates or updates the stroke assessment for an encounter. LKW-change
   * auditing is handled entirely by encounterRepository.upsertAssessment's
   * transaction (see that method's doc comment) — this layer only computes
   * the derived `urgentFlag` and fires the workflow notification.
   */
  async upsertAssessment(
    actor: Actor,
    encounterId: string,
    dto: UpsertStrokeAssessmentDto,
    meta: Meta,
  ): Promise<AssessmentResponse> {
    const encounter = await encounterRepository.findById(encounterId);
    if (encounter === null) {
      throw new AppError('Encounter not found.', 404);
    }
    await assertCanActOnPatient(actor, encounter.patientId, meta);

    const isUrgentEncounterType =
      encounter.type === EncounterType.AmbulanceIntake ||
      encounter.type === EncounterType.Emergency;
    const hasUrgentSymptom = URGENT_SYMPTOM_KEYS.some((key) => dto[key] === true);
    const urgentFlag = isUrgentEncounterType && hasUrgentSymptom;

    const wasNew = (await encounterRepository.getAssessment(encounterId)) === null;

    const saved = await encounterRepository.upsertAssessment({
      encounterId,
      data: {
        lkwAt: dto.lkwAt ? new Date(dto.lkwAt) : null,
        lkwCertainty: dto.lkwCertainty,
        lkwSource: dto.lkwSource,
        lkwNote: dto.lkwNote,
        facialWeakness: dto.facialWeakness,
        armWeakness: dto.armWeakness,
        legWeakness: dto.legWeakness,
        speechDifficulty: dto.speechDifficulty,
        suddenConfusion: dto.suddenConfusion,
        visionProblem: dto.visionProblem,
        severeHeadache: dto.severeHeadache,
        balanceProblem: dto.balanceProblem,
        lossOfConsciousness: dto.lossOfConsciousness,
        otherSymptomNote: dto.otherSymptomNote,
        urgentFlag,
        onAnticoagulants: dto.onAnticoagulants,
        createdByUserId: actor.id,
      },
      lkwChangeReason: dto.lkwChangeReason ?? null,
      changedByUserId: actor.id,
    });

    auditService.log({
      action: wasNew ? AuditAction.AssessmentCreated : AuditAction.AssessmentUpdated,
      userId: actor.id,
      severity: urgentFlag ? AuditSeverity.Warning : AuditSeverity.Info,
      resource: 'stroke_assessment',
      resourceId: saved.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      // Symptom booleans and urgentFlag only — never lkwNote/otherSymptomNote
      // text, which is PHI, matching the "never the reason text" rule
      // appointment.service.ts and patient.service.ts both follow.
      metadata: { urgentFlag, lkwCertainty: dto.lkwCertainty },
    });

    if (urgentFlag && wasNew) {
      // Fire-and-forget, same as every other notify() call site. Deliberately
      // addressed to the actor who opened the encounter (there is no patient
      // portal account to notify for a field-registered, possibly
      // unidentified patient) — this is an internal workflow alert, not a
      // patient-facing message.
      notificationService.notify({
        userId: actor.id,
        type: NotificationType.General,
        title: 'Potential stroke symptoms identified',
        body: 'A workflow flag has been raised on this encounter — not a diagnosis. Review the assessment.',
        actionUrl: '/clinic/encounters',
      });
    }

    return toAssessmentResponseShape(saved);
  },

  async getLkwHistory(
    actor: Actor,
    encounterId: string,
    meta: Meta,
  ): Promise<ReturnType<typeof toRevisionResponseShape>[]> {
    const encounter = await encounterRepository.findById(encounterId);
    if (encounter === null) {
      throw new AppError('Encounter not found.', 404);
    }
    await assertCanActOnPatient(actor, encounter.patientId, meta);

    const assessment = await encounterRepository.getAssessment(encounterId);
    if (assessment === null) return [];

    const revisions = await encounterRepository.listLkwRevisions(assessment.id);
    return revisions.map(toRevisionResponseShape);
  },
};
