import { Gender, RegistrationSource, IdentityStatus } from '@prisma/client';
import type { PatientProfile } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { withGeneratedShriPatientId } from '../services/patientIdentity.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { roleHasPermission, Permission } from '../config/permissions';
import { patientRepository, type PatientSearchResult } from './patient.repository';
import { patientIdentityService, type MatchCandidate } from './patient.identity.service';
import { normalizeMobile } from '../utils/phone';
import type { RegisterPatientDto, SearchPatientsDto } from './patient.validator';
import type { RoleName } from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Service
//
// Business rules for registration, search and duplicate handling. Follows the
// same discipline as appointment.service.ts: works entirely in plaintext (the
// repository is the only layer that knows about encryption), and never
// returns a raw Prisma row — always through a response-shaping function.
// ─────────────────────────────────────────────────────────────────────────────

type Meta = { ipAddress?: string; userAgent?: string };

/**
 * When a patient cannot identify themselves, they still need a name the rest
 * of the system can render (the [lastName, firstName] index, notification
 * titles, every UI list). A short code derived from the moment of
 * registration keeps two unidentified-same-day patients visually distinct
 * without implying any real identity.
 */
function unidentifiedPlaceholderName(): { firstName: string; lastName: string } {
  const shortCode = Date.now().toString(36).slice(-6).toUpperCase();
  return { firstName: 'Unknown', lastName: `Patient-${shortCode}` };
}

function toPatientResponseShape(profile: PatientProfile) {
  return {
    /** Internal UUID — the identifier every clinical write takes. */
    id: profile.id,
    shriPatientId: profile.shriPatientId,
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    dobIsEstimated: profile.dobIsEstimated,
    gender: profile.gender,
    registrationSource: profile.registrationSource,
    identityStatus: profile.identityStatus,
    hasPortalAccount: profile.userId !== null,
    createdAt: profile.createdAt,
  };
}

export type PatientResponse = ReturnType<typeof toPatientResponseShape>;

/** Age is derived on every read, never stored, so it cannot drift. */
function calculateAge(dateOfBirth: Date | null): number | null {
  if (dateOfBirth === null) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hadBirthday =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/**
 * What a CLINICIAN sees of a patient — the shape behind the Z3 patient banner
 * (GP-05) and the chart summary (S-06-02).
 *
 * ⚠️ `knownAllergies` is the load-bearing field here. UI_ATLAS §6485 requires
 * the allergy to be unmissable in the banner AS TEXT, not an icon, and the
 * S-06-07 hard stop is evaluated against it. No other clinician endpoint
 * returns it today, which is why this shape exists.
 *
 * ⚠️ Deliberately NOT returned: aadhaarLast4 and passportNumber. A consulting
 * clinician has no clinical use for either, and the patient's own
 * GET /profile already serves them to the one person entitled to see them.
 */
function toClinicalResponseShape(profile: PatientProfile) {
  return {
    id: profile.id,
    shriPatientId: profile.shriPatientId,

    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    dobIsEstimated: profile.dobIsEstimated,
    age: calculateAge(profile.dateOfBirth),
    gender: profile.gender,
    bloodGroup: profile.bloodGroup,
    maritalStatus: profile.maritalStatus,

    abhaId: profile.abhaId,
    identityStatus: profile.identityStatus,
    registrationSource: profile.registrationSource,
    hasPortalAccount: profile.userId !== null,

    phoneNumber: profile.phoneNumber,
    alternatePhone: profile.alternatePhone,
    city: profile.city,
    district: profile.district,
    state: profile.state,

    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    emergencyContactRelation: profile.emergencyContactRelation,

    // ── Health history ────────────────────────────────────────────────────
    knownAllergies: profile.knownAllergies,
    currentMedications: profile.currentMedications,
    existingDiseases: profile.existingDiseases,
    familyHistory: profile.familyHistory,
    previousSurgeries: profile.previousSurgeries,

    // ── Lifestyle ─────────────────────────────────────────────────────────
    smokingStatus: profile.smokingStatus,
    alcoholStatus: profile.alcoholStatus,
    tobaccoStatus: profile.tobaccoStatus,
    physicalActivity: profile.physicalActivity,
    occupation: profile.occupation,

    updatedAt: profile.updatedAt,
  };
}

export type PatientClinicalResponse = ReturnType<typeof toClinicalResponseShape>;

function toSearchResultShape(row: PatientSearchResult) {
  return {
    id: row.id,
    shriPatientId: row.shriPatientId,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    // district is intentionally the row's RAW (still-encrypted) value here —
    // decrypting an entire search result PAGE for display is more PHI
    // exposure than a list view needs. It is omitted from the response
    // entirely rather than shown encrypted (which would be worse than
    // useless to a client). Full detail is available via the single-record
    // read, which does decrypt and IS access-controlled per-row.
    identityStatus: row.identityStatus,
    lastEncounterAt: row.encounters[0]?.startedAt ?? null,
  };
}

function toCandidateResponseShape(candidate: MatchCandidate) {
  return {
    shriPatientId: candidate.shriPatientId,
    confidence: candidate.confidence,
    signals: candidate.signals,
    display: {
      firstName: candidate.display.firstName,
      lastName: candidate.display.lastName,
      dateOfBirth: candidate.display.dateOfBirth,
      gender: candidate.display.gender,
      lastEncounterAt: candidate.display.lastEncounterAt,
    },
  };
}

export const patientService = {
  /**
   * Register a patient — with or without a login account. Duplicate policy:
   *   strong   → always refused (409), regardless of acknowledgement.
   *   moderate → refused (409) unless the caller has already reviewed
   *              candidates and sets acknowledgedDuplicates.
   *   weak     → proceeds; candidates are returned for information only.
   */
  async register(
    actorUserId: string,
    dto: RegisterPatientDto,
    meta: Meta,
  ): Promise<{
    patient: PatientResponse;
    duplicates: ReturnType<typeof toCandidateResponseShape>[];
  }> {
    const { firstName, lastName } = dto.isUnidentified
      ? unidentifiedPlaceholderName()
      : { firstName: dto.firstName!, lastName: dto.lastName! };

    const dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;

    const matchResult = await patientIdentityService.findCandidates({
      abhaId: dto.abhaId ?? null,
      mobile: dto.mobile ?? null,
      firstName: dto.isUnidentified ? null : dto.firstName,
      lastName: dto.isUnidentified ? null : dto.lastName,
      dateOfBirth,
      gender: dto.gender ?? null,
    });

    if (matchResult.strongest === 'strong') {
      auditService.log({
        action: AuditAction.PatientDuplicateDetected,
        userId: actorUserId,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          confidence: 'strong',
          candidateCount: matchResult.candidates.length,
          candidateShriIds: matchResult.candidates.map((c) => c.shriPatientId),
        },
      });
      throw new AppError(
        'A matching patient record already exists. Please review it before creating a new one.',
        409,
      );
    }

    if (matchResult.strongest === 'moderate' && !dto.acknowledgedDuplicates) {
      auditService.log({
        action: AuditAction.PatientDuplicateDetected,
        userId: actorUserId,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          confidence: 'moderate',
          candidateCount: matchResult.candidates.length,
          candidateShriIds: matchResult.candidates.map((c) => c.shriPatientId),
        },
      });
      throw new AppError(
        'Possible matching patient records were found. Please review them before creating a new one.',
        409,
      );
    }

    if (matchResult.strongest === 'moderate' && dto.acknowledgedDuplicates) {
      auditService.log({
        action: AuditAction.PatientDuplicateAcknowledged,
        userId: actorUserId,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          candidateCount: matchResult.candidates.length,
          candidateShriIds: matchResult.candidates.map((c) => c.shriPatientId),
        },
      });
    }

    const created = await withGeneratedShriPatientId((shriPatientId) =>
      patientRepository.create({
        shriPatientId,
        firstName,
        lastName,
        dateOfBirth,
        dobIsEstimated: dto.dobIsEstimated,
        gender: dto.gender,
        mobile: dto.mobile,
        abhaId: dto.abhaId,
        village: dto.village,
        district: dto.district,
        state: dto.state,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        registrationSource: dto.registrationSource,
        registeredByUserId:
          dto.registrationSource === RegistrationSource.SelfRegistered ? null : actorUserId,
        identityStatus: dto.isUnidentified ? IdentityStatus.Provisional : IdentityStatus.Unverified,
      }),
    );

    auditService.log({
      action: AuditAction.PatientRegistered,
      userId: actorUserId,
      severity: AuditSeverity.Info,
      resource: 'patient',
      resourceId: created.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        registrationSource: dto.registrationSource,
        isUnidentified: dto.isUnidentified,
        weakDuplicateCount: matchResult.strongest === 'weak' ? matchResult.candidates.length : 0,
      },
    });

    return {
      patient: toPatientResponseShape(created),
      duplicates:
        matchResult.strongest === 'weak'
          ? matchResult.candidates.map(toCandidateResponseShape)
          : [],
    };
  },

  async search(
    actorUserId: string,
    dto: SearchPatientsDto,
    meta: Meta,
  ): Promise<{
    results: ReturnType<typeof toSearchResultShape>[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let result: { results: PatientSearchResult[]; total: number };

    if (dto.by === 'abha') {
      result = await patientRepository.searchByAbha(dto.abha!, dto.page, dto.pageSize);
    } else if (dto.by === 'mobile') {
      const normalized = normalizeMobile(dto.mobile!);
      result = normalized
        ? await patientRepository.searchByMobile(normalized, dto.page, dto.pageSize)
        : { results: [], total: 0 };
    } else if (dto.by === 'shriId') {
      result = await patientRepository.searchByShriPatientId(dto.shriId!, dto.page, dto.pageSize);
    } else {
      result = await patientRepository.searchByName(
        dto.lastName!,
        dto.firstName,
        dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        dto.page,
        dto.pageSize,
      );
    }

    // Search terms are PHI (a surname, a mobile number) and are deliberately
    // NEVER logged — only the mode and the result count. This mirrors the
    // existing rule in appointment.service.ts: "never the reason text".
    auditService.log({
      action: AuditAction.PatientSearched,
      userId: actorUserId,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { searchMode: dto.by, resultCount: result.total },
    });

    return {
      results: result.results.map(toSearchResultShape),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
    };
  },

  /**
   * Row-level access is enforced HERE, not at the route: a caller holding
   * only `patient:read:assigned` (a Doctor/HealthcareWorker) must still be
   * turned away from a patient they have no relationship with — the
   * permission only established that their ROLE can read *some* patient's
   * record. `patient:read:any` bypasses the relationship check entirely,
   * exactly like every other "assigned" vs "any" pair in this codebase.
   */
  async getByShriPatientId(
    actor: { id: string; roleName: string },
    shriPatientId: string,
    meta: Meta,
  ): Promise<PatientResponse> {
    const patient = await patientRepository.findByShriPatientId(shriPatientId);
    if (patient === null) {
      throw new AppError('Patient record not found.', 404);
    }

    const role = actor.roleName as RoleName;
    if (!roleHasPermission(role, Permission.PatientReadAny)) {
      await careRelationshipService.requirePatientAccess(actor, patient.id, meta);
    }

    auditService.log({
      action: AuditAction.PatientRecordViewed,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'patient',
      resourceId: patient.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return toPatientResponseShape(patient);
  },

  /**
   * The clinician's clinical view. Same row-level gate as getByShriPatientId
   * — a clinician with no relationship gets a uniform 404, or a break-glass
   * offer if they hold the capability (see careRelationship.service).
   */
  async getClinicalByShriPatientId(
    actor: { id: string; roleName: string },
    shriPatientId: string,
    meta: Meta,
  ): Promise<PatientClinicalResponse> {
    const patient = await patientRepository.findClinicalByShriPatientId(shriPatientId);
    if (patient === null) {
      throw new AppError('Patient record not found.', 404);
    }

    const role = actor.roleName as RoleName;
    if (!roleHasPermission(role, Permission.PatientReadAny)) {
      await careRelationshipService.requirePatientAccess(actor, patient.id, meta);
    }

    auditService.log({
      action: AuditAction.PatientRecordViewed,
      userId: actor.id,
      severity: AuditSeverity.Info,
      resource: 'patient',
      resourceId: patient.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { view: 'clinical' },
    });

    return toClinicalResponseShape(patient);
  },

  /** Internal id lookup — used by the encounter module and by
   *  careRelationship.service; never exposed directly as an endpoint
   *  parameter (routes take shriPatientId, not the internal UUID). */
  async resolveInternalId(shriPatientId: string): Promise<string | null> {
    const patient = await patientRepository.findByShriPatientId(shriPatientId);
    return patient?.id ?? null;
  },

  async linkAccount(
    actorUserId: string,
    patientInternalId: string,
    targetUserId: string,
    meta: Meta,
  ): Promise<PatientResponse> {
    const linked = await patientRepository.linkAccount(patientInternalId, targetUserId);
    if (!linked) {
      throw new AppError(
        'This patient record could not be linked — it may already have an account, or may not exist.',
        409,
      );
    }

    auditService.log({
      action: AuditAction.PatientAccountLinked,
      userId: actorUserId,
      severity: AuditSeverity.Info,
      resource: 'patient',
      resourceId: patientInternalId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { targetUserId },
    });

    const updated = await patientRepository.findById(patientInternalId);
    return toPatientResponseShape(updated!);
  },
};

// Re-exported so the encounter module can accept a Gender value without a
// second import path — avoids a circular dependency on patient.validator.
export { Gender };
