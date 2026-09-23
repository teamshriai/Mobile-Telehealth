import { RoleName } from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// Permission catalogue + role → permission mapping
//
// This is the single place authorization decisions are DEFINED. Route files
// declare which permission they require; they never enumerate roles. That
// indirection is the point: adding HealthcareWorker to "read a patient record"
// later is one edit here, not a grep across every route file.
//
// Why a static map rather than the Permission/RolePermission tables that exist
// in the schema: those tables are still unpopulated, and a DB round-trip per
// request to read a mapping that only changes on deploy buys nothing. The
// naming here matches the table's `resource:action` convention exactly, so
// moving to DB-backed permissions later is a data migration, not a rewrite.
//
// IMPORTANT: holding a permission is necessary but NOT sufficient. Row-level
// ownership ("is this MY record?" / "is this patient on MY care team?") is
// enforced separately in the service layer — see requireCareRelationship().
// A permission answers "may this ROLE ever do this?", never "may this USER do
// it to this ROW?".
// ─────────────────────────────────────────────────────────────────────────────

export const Permission = {
  // ── Own-record access (the patient portal) ──────────────────────────────
  ProfileReadOwn: 'profile:read:own',
  ProfileUpdateOwn: 'profile:update:own',
  AppointmentReadOwn: 'appointment:read:own',
  AppointmentCreateOwn: 'appointment:create:own',
  AppointmentCancelOwn: 'appointment:cancel:own',
  NotificationReadOwn: 'notification:read:own',
  CareTeamReadOwn: 'careteam:read:own',
  AiInsightsUseOwn: 'ai:use:own',
  FeedbackSubmitOwn: 'feedback:submit:own',

  // ── Clinician access (Phase 6 doctor portal; enforced from today) ───────
  PatientReadAssigned: 'patient:read:assigned',
  PatientUpdateAssigned: 'patient:update:assigned',
  AppointmentReadAssigned: 'appointment:read:assigned',
  AppointmentManageAssigned: 'appointment:manage:assigned',

  // ── Patient registration & encounters (Phase 6) ─────────────────────────
  // "any" scope here (not "own"/"assigned") because these act BEFORE a care
  // relationship exists — you cannot be "assigned" to a patient you are in
  // the middle of registering. Row-level narrowing for read/manage still
  // happens in careRelationship.service.requirePatientAccess(); the
  // permission only answers "may this role ever perform this action at
  // all", exactly as everywhere else in this file.
  PatientCreateAny: 'patient:create:any',
  PatientSearchAny: 'patient:search:any',
  /**
   * Unconditional read of ANY patient record, bypassing the care-team/
   * field-relationship check in careRelationship.service entirely. This is
   * intentionally granted to NO ROLE below — it exists so the permission
   * name and the bypass logic that reads it (patient.service.ts,
   * encounter.service.ts) are already written and in one place, ready for a
   * genuine future admin break-glass flow. Granting it to any role by
   * default would mean that role can read every patient in the system with
   * no relationship check at all — exactly the access
   * careRelationshipService's own design explicitly argues against for
   * Admin ("if an admin ever needs clinical access it must be an explicit,
   * separately audited break-glass flow, never a silent side effect of
   * being an admin"). The same reasoning applies to every other role.
   */
  PatientReadAny: 'patient:read:any',
  PatientManageAny: 'patient:manage:any',
  EncounterCreateAny: 'encounter:create:any',
  EncounterReadOwn: 'encounter:read:own',
  EncounterReadAssigned: 'encounter:read:assigned',
  EncounterManageAssigned: 'encounter:manage:assigned',
  AssessmentReadAssigned: 'assessment:read:assigned',
  AssessmentWriteAssigned: 'assessment:write:assigned',

  // ── Administrative ──────────────────────────────────────────────────────
  UserReadAny: 'user:read:any',
  UserManageAny: 'user:manage:any',
  RoleAssign: 'role:assign',
  DoctorVerify: 'doctor:verify',
  AuditRead: 'audit:read',

  // ── Doctor self-service (availability) ──────────────────────────────────
  AvailabilityManageOwn: 'availability:manage:own',

  // ── Clinical notes ──────────────────────────────────────────────────────
  // `sign` is deliberately separate from `write`: authoring a draft and
  // attesting to the legal record are different acts, and UI_ATLAS §3.2
  // treats them as different verbs for exactly that reason. `amend` is
  // separate again — it is the ONLY way to change a signed note
  // (CMP-NABH-10), so it must be grantable independently of drafting.
  // Every one is still row-gated by careRelationship.requirePatientAccess.
  NoteReadAssigned: 'note:read:assigned',
  NoteWriteAssigned: 'note:write:assigned',
  NoteSignOwn: 'note:sign:own',
  NoteAmendOwn: 'note:amend:own',
  // `cosign` is a fifth distinct verb (UI_ATLAS §3.2: "counter-attest
  // another's entry — held by a narrower set than `sign`"). It is what makes
  // the Resident role work WITHOUT any code comparing a role name: a note
  // whose author lacks NoteSignOwn enters CosignPending, and only a holder of
  // NoteCosignAssigned can complete it.
  NoteCosignAssigned: 'note:cosign:assigned',

  // ── Problem list & diagnosis coding (M-06 / S-06-05) ────────────────────
  ProblemReadAssigned: 'problem:read:assigned',
  ProblemWriteAssigned: 'problem:write:assigned',

  // ── Prescribing (M-06 / S-06-07) ────────────────────────────────────────
  // Same write/sign split as notes, for the same reason. `override` is
  // separate again and deliberately narrow: it is the G4 capability to
  // proceed past a DETERMINISTIC hard stop, and holding it is not the same as
  // being allowed to prescribe.
  RxReadAssigned: 'rx:read:assigned',
  RxWriteAssigned: 'rx:write:assigned',
  RxSignOwn: 'rx:sign:own',
  RxOverrideHardStop: 'rx:override:hard-stop',

  // ── Patient instructions (M-06 / S-06-08) ───────────────────────────────
  InstructionsWriteAssigned: 'instructions:write:assigned',

  // ── Templates & order sets (M-06 / S-06-10) ─────────────────────────────
  // Promoting a personal template to facility-wide is a GOVERNANCE act, not a
  // convenience, so it is a different capability held by a different persona.
  TemplateManageOwn: 'template:manage:own',
  TemplatePromoteFacility: 'template:promote:facility',

  // ── Break-glass (UI_ATLAS §3.2 / DD-014) ────────────────────────────────
  // `request` is held by every clinician who can hold a care relationship —
  // that is the whole point: "an authorization model that can block
  // resuscitation is the wrong model". `review` is the 24-hour audit duty and
  // is held by nobody clinical.
  BreakGlassRequest: 'breakglass:request:any',
  BreakGlassReview: 'breakglass:review:any',

  // ── Hospital Admin — scoped to the admin's own hospital, never global.
  // Row-level scoping (does this doctor/patient/appointment actually belong
  // to THIS admin's hospital?) is enforced in hospitalAdmin.service.ts, the
  // same way patient-record ownership is enforced in
  // careRelationship.service.ts — a permission here only answers "may this
  // role ever do this", never "may this user do it to this row".
  HospitalDoctorRead: 'doctor:read:hospital-scoped',
  HospitalDoctorManage: 'doctor:manage:hospital-scoped',
  HospitalPatientRead: 'patient:read:hospital-scoped',
  HospitalAppointmentRead: 'appointment:read:hospital-scoped',
  HospitalManageOwn: 'hospital:manage:own',
  FeedbackReadHospitalScoped: 'feedback:read:hospital-scoped',
} as const;

export type PermissionName = (typeof Permission)[keyof typeof Permission];

const PATIENT_PERMISSIONS: PermissionName[] = [
  Permission.ProfileReadOwn,
  Permission.ProfileUpdateOwn,
  Permission.AppointmentReadOwn,
  Permission.AppointmentCreateOwn,
  Permission.AppointmentCancelOwn,
  Permission.NotificationReadOwn,
  Permission.CareTeamReadOwn,
  Permission.EncounterReadOwn,
  Permission.AiInsightsUseOwn,
  Permission.FeedbackSubmitOwn,
];

const DOCTOR_PERMISSIONS: PermissionName[] = [
  Permission.ProfileReadOwn,
  Permission.ProfileUpdateOwn,
  Permission.NotificationReadOwn,
  Permission.PatientReadAssigned,
  Permission.PatientUpdateAssigned,
  Permission.AppointmentReadAssigned,
  Permission.AppointmentManageAssigned,
  Permission.PatientCreateAny,
  Permission.PatientSearchAny,
  Permission.EncounterCreateAny,
  // Bug fix: EncounterReadAssigned was missing while EncounterManageAssigned
  // and both Assessment permissions were granted — so a Doctor could close an
  // encounter and write its stroke assessment but got a 403 from
  // GET /encounters/:id and GET /patients/:id/encounters, which both require
  // it. A clinician who may write a record must be able to read it.
  Permission.EncounterReadAssigned,
  Permission.EncounterManageAssigned,
  Permission.AssessmentReadAssigned,
  Permission.AssessmentWriteAssigned,
  Permission.AvailabilityManageOwn,
  Permission.NoteReadAssigned,
  Permission.NoteWriteAssigned,
  Permission.NoteSignOwn,
  Permission.NoteAmendOwn,
  Permission.NoteCosignAssigned,
  Permission.ProblemReadAssigned,
  Permission.ProblemWriteAssigned,
  Permission.RxReadAssigned,
  Permission.RxWriteAssigned,
  Permission.RxSignOwn,
  Permission.RxOverrideHardStop,
  Permission.InstructionsWriteAssigned,
  Permission.TemplateManageOwn,
  Permission.BreakGlassRequest,
  // Deliberately NOT PatientReadAny: that would let any Doctor read any
  // patient system-wide, which is exactly the unrestricted clinical-record
  // access careRelationship.service exists to prevent (the same reasoning
  // that already denies Admin unconditional access). A Doctor still reads
  // any patient they have a genuine relationship with — care-team
  // membership, or having personally registered/opened an encounter on
  // them — via PatientReadAssigned + careRelationshipService's row check.
];

/**
 * Resident (UI_ATLAS persona `P-05`).
 *
 * Derived from the Doctor set by SUBTRACTION, so a capability added to Doctor
 * is inherited here unless it is on the withheld list below. That direction
 * matters: the failure mode to avoid is a new clinical capability silently
 * bypassing co-sign because someone forgot to add it in two places.
 *
 * ⚠️ What a Resident may NOT do, and why:
 *  - `note:sign:own`   — a Resident authors; a consultant attests. Their note
 *                        lands in CosignPending (CMP-NABH-03).
 *  - `rx:sign:own`     — same split for prescribing. They may draft an Rx.
 *  - `rx:override:hard-stop` — a G4 override needs two consultants; a
 *                        Resident is not one of them.
 *  - `note:cosign:assigned`  — they cannot counter-attest anyone, including
 *                        each other.
 *  - `template:manage:own`   — template authorship is a consultant act.
 *
 * ⚠️ NOTHING in the codebase branches on the string 'Resident'. The behaviour
 * above is produced entirely by which capabilities are absent here, which is
 * what UI_ATLAS §3.2's "no authorization check compares a role name" requires.
 */
const RESIDENT_WITHHELD: readonly PermissionName[] = [
  Permission.NoteSignOwn,
  Permission.RxSignOwn,
  Permission.RxOverrideHardStop,
  Permission.NoteCosignAssigned,
  Permission.TemplateManageOwn,
];

const RESIDENT_PERMISSIONS: PermissionName[] = DOCTOR_PERMISSIONS.filter(
  (p) => !RESIDENT_WITHHELD.includes(p),
);

/**
 * Clinical support staff. Read-only on assigned patients — deliberately
 * narrower than Doctor: they coordinate care, they do not author clinical
 * decisions.
 */
const HEALTHCARE_WORKER_PERMISSIONS: PermissionName[] = [
  Permission.ProfileReadOwn,
  Permission.ProfileUpdateOwn,
  Permission.NotificationReadOwn,
  Permission.PatientReadAssigned,
  Permission.AppointmentReadAssigned,
  Permission.PatientCreateAny,
  Permission.PatientSearchAny,
  Permission.EncounterCreateAny,
  Permission.EncounterReadAssigned,
];

const LAB_TECHNICIAN_PERMISSIONS: PermissionName[] = [
  Permission.ProfileReadOwn,
  Permission.ProfileUpdateOwn,
  Permission.NotificationReadOwn,
];

/**
 * Admin is enumerated explicitly rather than granted a wildcard. A wildcard
 * silently absorbs every future permission, which is precisely how an admin
 * role ends up able to read clinical records nobody decided it should read.
 * Adding a permission here should be a deliberate act.
 */
const ADMIN_PERMISSIONS: PermissionName[] = [
  Permission.ProfileReadOwn,
  Permission.ProfileUpdateOwn,
  Permission.NotificationReadOwn,
  Permission.UserReadAny,
  Permission.UserManageAny,
  Permission.RoleAssign,
  Permission.DoctorVerify,
  Permission.AuditRead,
  Permission.PatientManageAny,
  // The 24-hour break-glass review duty (DD-014). Deliberately given to the
  // role with NO clinical read: reviewing THAT an access happened must not
  // require the reviewer to be able to read what was accessed.
  Permission.BreakGlassReview,
];

/**
 * Manages a single hospital's doctors, hospital-scoped patient visibility,
 * and operations. Deliberately NOT a superset of ADMIN_PERMISSIONS and
 * deliberately excludes UserManageAny/RoleAssign/AuditRead/PatientManageAny
 * — this role's reach stops at its own hospital, enforced by
 * hospitalAdmin.service.ts, never a platform-wide grant.
 */
const HOSPITAL_ADMIN_PERMISSIONS: PermissionName[] = [
  Permission.ProfileReadOwn,
  Permission.ProfileUpdateOwn,
  Permission.NotificationReadOwn,
  Permission.HospitalDoctorRead,
  Permission.HospitalDoctorManage,
  Permission.HospitalPatientRead,
  Permission.HospitalAppointmentRead,
  Permission.HospitalManageOwn,
  Permission.FeedbackReadHospitalScoped,
  // Template governance (UI_ATLAS persona P-02, S-06-10). Promoting a
  // personal template facility-wide is an administrative act with a named
  // owner and a review date — not something a clinician does for themselves.
  Permission.TemplatePromoteFacility,
];

export const ROLE_PERMISSIONS: Record<RoleName, readonly PermissionName[]> = {
  [RoleName.Patient]: PATIENT_PERMISSIONS,
  [RoleName.Doctor]: DOCTOR_PERMISSIONS,
  [RoleName.Resident]: RESIDENT_PERMISSIONS,
  [RoleName.HealthcareWorker]: HEALTHCARE_WORKER_PERMISSIONS,
  [RoleName.LabTechnician]: LAB_TECHNICIAN_PERMISSIONS,
  [RoleName.Admin]: ADMIN_PERMISSIONS,
  [RoleName.HospitalAdmin]: HOSPITAL_ADMIN_PERMISSIONS,
};

/**
 * Does this role hold this permission?
 *
 * The eslint-plugin-security object-injection warning is suppressed rather
 * than worked around: `role` is a RoleName enum value that originates from the
 * database and is re-read on every request by the authenticate middleware. It
 * is never attacker-supplied string input, so there is no prototype-pollution
 * or unexpected-key path here. Using a Map purely to silence the rule would
 * add indirection without adding safety.
 */
export function roleHasPermission(role: RoleName, permission: PermissionName): boolean {
  // eslint-disable-next-line security/detect-object-injection
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Every permission a role holds — used to shape the client's capability list. */
export function permissionsForRole(role: RoleName): readonly PermissionName[] {
  // eslint-disable-next-line security/detect-object-injection -- see above
  return ROLE_PERMISSIONS[role] ?? [];
}
