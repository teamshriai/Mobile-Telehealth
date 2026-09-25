import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Audit Service
//
// All security-relevant events are logged through this single interface.
// Callers fire-and-forget — auditService.log() is never awaited, so it
// never blocks or delays an HTTP response.
//
// Phase 1 : writes to the audit_logs table in PostgreSQL.
// Phase 2 : swap this implementation to publish to Kafka/SQS without
//            changing any calling code — the interface never changes.
//
// HIPAA / GDPR: audit logs are immutable. This service only INSERTs.
// ─────────────────────────────────────────────────────────────────────────────

export enum AuditAction {
  UserRegistered = 'UserRegistered',
  UserLoginSuccess = 'UserLoginSuccess',
  UserLoginFailed = 'UserLoginFailed',
  UserLogout = 'UserLogout',
  PasswordChanged = 'PasswordChanged',
  AccountLocked = 'AccountLocked',
  AccountUnlocked = 'AccountUnlocked',
  EmailVerified = 'EmailVerified',
  UnauthorizedAccess = 'UnauthorizedAccess',
  ProfileUpdated = 'ProfileUpdated',
  ProfilePhotoUpdated = 'ProfilePhotoUpdated',
  RoleChanged = 'RoleChanged',
  AccountDeleted = 'AccountDeleted',
  // ── Session lifecycle (refresh-token rotation) ──────────────────────────
  TokenRefreshed = 'TokenRefreshed',
  TokenReuseDetected = 'TokenReuseDetected',

  // ── Mobile OTP authentication ─────────────────────────────────────────────
  // First-class actions, not a UserLoginFailed + metadata.reason discriminator.
  // "How many OTP attempts failed for this account last night" should be an
  // indexed equality filter, not a JSON scan — see the AppointmentCreated note.
  OtpRequested = 'OtpRequested',
  OtpVerified = 'OtpVerified',
  OtpFailed = 'OtpFailed',
  SessionRevoked = 'SessionRevoked',
  // ── Patient identity & encounters (Phase 6) ─────────────────────────────
  PatientRegistered = 'PatientRegistered',
  PatientSearched = 'PatientSearched',
  PatientRecordViewed = 'PatientRecordViewed',
  PatientDuplicateDetected = 'PatientDuplicateDetected',
  PatientDuplicateAcknowledged = 'PatientDuplicateAcknowledged',
  PatientAccountLinked = 'PatientAccountLinked',
  EncounterCreated = 'EncounterCreated',
  EncounterClosed = 'EncounterClosed',
  AssessmentCreated = 'AssessmentCreated',
  AssessmentUpdated = 'AssessmentUpdated',
  // ── AI Insights (Phase 8) ───────────────────────────────────────────────
  AiMessageSent = 'AiMessageSent',
  AiResponseGenerated = 'AiResponseGenerated',
  AiEmergencyInterlockTriggered = 'AiEmergencyInterlockTriggered',
  AiOutputBlocked = 'AiOutputBlocked',
  AiBudgetExceeded = 'AiBudgetExceeded',
  AiPolicyBlocked = 'AiPolicyBlocked',
  AiProviderError = 'AiProviderError',
  AiConversationDeleted = 'AiConversationDeleted',
  // ── Hospital Admin / three-role onboarding ──────────────────────────────
  HospitalAdminRegistered = 'HospitalAdminRegistered',
  DoctorAvailabilityUpdated = 'DoctorAvailabilityUpdated',
  FeedbackSubmitted = 'FeedbackSubmitted',

  // ── Care-team membership ──────────────────────────────────────────────
  // Care-team membership is what careRelationship.service reads to decide
  // who may open a patient's record, so granting or ending one is an
  // authorization change, not bookkeeping.
  CareTeamAssigned = 'CareTeamAssigned',
  CareTeamEnded = 'CareTeamEnded',

  // ── Appointments ──────────────────────────────────────────────────────
  // These replace the previous practice of logging appointment writes as
  // ProfileUpdated with an `operation` discriminator in metadata, which made
  // them invisible to any query that filters by action.
  AppointmentCreated = 'AppointmentCreated',
  AppointmentRescheduled = 'AppointmentRescheduled',
  AppointmentStatusChanged = 'AppointmentStatusChanged',
  AppointmentCancelled = 'AppointmentCancelled',

  // ── Clinical notes ────────────────────────────────────────────────────
  NoteCreated = 'NoteCreated',
  NoteSigned = 'NoteSigned',
  NoteAmended = 'NoteAmended',
  // ── Clinical authoring (M-06) ───────────────────────────────────────────
  NoteCosigned = 'NoteCosigned',
  NoteReturnedToAuthor = 'NoteReturnedToAuthor',
  ProblemAdded = 'ProblemAdded',
  ProblemResolved = 'ProblemResolved',
  PrescriptionCreated = 'PrescriptionCreated',
  PrescriptionSigned = 'PrescriptionSigned',
  InstructionsIssued = 'InstructionsIssued',
  TemplateSaved = 'TemplateSaved',
  TemplatePromoted = 'TemplatePromoted',
  // ── Deterministic safety ────────────────────────────────────────────────
  // HardStopOverridden maps to UI_ATLAS's AI.SAF.HARD_STOP_OVERRIDDEN — the
  // one event that must ALERT, not merely record, reviewed within 24h (§4.9).
  HardStopTriggered = 'HardStopTriggered',
  HardStopOverridden = 'HardStopOverridden',
  // ── Break-glass (DD-014) ────────────────────────────────────────────────
  BreakGlassRequested = 'BreakGlassRequested',
  BreakGlassGranted = 'BreakGlassGranted',
  BreakGlassReviewed = 'BreakGlassReviewed',
  // Patient portal: patient-generated health notes. Metadata never carries
  // the note text — it is PHI in the patient's own words.
  HealthNoteCreated = 'HealthNoteCreated',
  HealthNoteUpdated = 'HealthNoteUpdated',
  HealthNoteDeleted = 'HealthNoteDeleted',
  HealthNoteAudioAccessed = 'HealthNoteAudioAccessed',
  TranscriptionRequested = 'TranscriptionRequested',
}

export enum AuditSeverity {
  Info = 'Info',
  Warning = 'Warning',
  Critical = 'Critical',
}

export interface AuditPayload {
  action: AuditAction;
  userId?: string;
  resource?: string;
  resourceId?: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

class AuditService {
  /**
   * Log a security-relevant event.
   * This method is synchronous from the caller's perspective.
   * The DB write is fire-and-forget — errors are caught and logged to stderr
   * so a failing audit write never breaks the primary request flow.
   */
  log(payload: AuditPayload): void {
    const { action, userId, resource, resourceId, severity, ipAddress, userAgent, metadata } =
      payload;

    // Map string enums to Prisma enums
    const prismaAction = action as unknown as import('@prisma/client').AuditAction;
    const prismaSeverity = (severity ??
      AuditSeverity.Info) as unknown as import('@prisma/client').AuditSeverity;

    prisma.auditLog
      .create({
        data: {
          action: prismaAction,
          severity: prismaSeverity,
          userId: userId ?? null,
          resource: resource ?? null,
          resourceId: resourceId ?? null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          metadata:
            metadata !== undefined
              ? (metadata as import('@prisma/client').Prisma.InputJsonValue)
              : undefined,
        },
      })
      .catch((err: unknown) => {
        // Audit write failure must NEVER crash the server or fail the request
        console.error('[AuditService] Failed to write audit log:', err);
      });
  }

  /**
   * Write an audit record and WAIT for it — then carry on regardless.
   *
   * ⚠️ This inverts `log()`'s contract on purpose, and only two kinds of event
   * should use it: breaking glass, and overriding a deterministic hard stop.
   *
   * UI_ATLAS DD-014 is explicit that emergency access must not be gated on the
   * audit write succeeding — "an authorization model that can block
   * resuscitation is the wrong model" applies to the logging path too. But it
   * is equally explicit that an unlogged break-glass is not acceptable. So:
   *
   *   - the write is AWAITED, so a caller can record its outcome alongside the
   *     grant rather than hoping;
   *   - a FAILURE IS ITSELF AN ALERT, surfaced loudly on stderr for the
   *     platform's log-based alerting to catch;
   *   - and it still RESOLVES, never rejects, so access proceeds either way.
   *
   * The boolean is the honest answer to "is this access actually logged?" —
   * callers persist it so a reviewer can tell a logged access from one where
   * the audit trail is known to be incomplete.
   */
  async logCritical(payload: AuditPayload): Promise<boolean> {
    try {
      const prismaAction = payload.action as unknown as import('@prisma/client').AuditAction;
      await prisma.auditLog.create({
        data: {
          action: prismaAction,
          severity: payload.severity ?? AuditSeverity.Critical,
          userId: payload.userId ?? null,
          resource: payload.resource ?? null,
          resourceId: payload.resourceId ?? null,
          ipAddress: payload.ipAddress ?? null,
          userAgent: payload.userAgent ?? null,
          metadata:
            payload.metadata !== undefined
              ? (payload.metadata as import('@prisma/client').Prisma.InputJsonValue)
              : undefined,
        },
      });
      return true;
    } catch (err: unknown) {
      // The failure is the alert. Deliberately shouty and deliberately not
      // rethrown — see the doc comment.
      console.error(
        '[AuditService] ALERT: CRITICAL AUDIT WRITE FAILED — access proceeded unlogged.',
        { action: payload.action, userId: payload.userId, resourceId: payload.resourceId },
        err,
      );
      return false;
    }
  }
}

export const auditService = new AuditService();
