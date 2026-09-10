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

  // ── Clinician access (Phase 6 doctor portal; enforced from today) ───────
  PatientReadAssigned: 'patient:read:assigned',
  PatientUpdateAssigned: 'patient:update:assigned',
  AppointmentReadAssigned: 'appointment:read:assigned',
  AppointmentManageAssigned: 'appointment:manage:assigned',

  // ── Administrative ──────────────────────────────────────────────────────
  UserReadAny: 'user:read:any',
  UserManageAny: 'user:manage:any',
  RoleAssign: 'role:assign',
  DoctorVerify: 'doctor:verify',
  AuditRead: 'audit:read',
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
];

const DOCTOR_PERMISSIONS: PermissionName[] = [
  Permission.ProfileReadOwn,
  Permission.ProfileUpdateOwn,
  Permission.NotificationReadOwn,
  Permission.PatientReadAssigned,
  Permission.PatientUpdateAssigned,
  Permission.AppointmentReadAssigned,
  Permission.AppointmentManageAssigned,
];

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
];

export const ROLE_PERMISSIONS: Record<RoleName, readonly PermissionName[]> = {
  [RoleName.Patient]: PATIENT_PERMISSIONS,
  [RoleName.Doctor]: DOCTOR_PERMISSIONS,
  [RoleName.HealthcareWorker]: HEALTHCARE_WORKER_PERMISSIONS,
  [RoleName.LabTechnician]: LAB_TECHNICIAN_PERMISSIONS,
  [RoleName.Admin]: ADMIN_PERMISSIONS,
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
