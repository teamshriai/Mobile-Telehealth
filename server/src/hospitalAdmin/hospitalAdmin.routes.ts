import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import {
  getOwnStaffProfile,
  updateOwnStaffProfile,
  createOwnHospital,
  joinExistingHospital,
  completeStaffOnboarding,
} from './staffProfile.controller';
import {
  getOwnHospital,
  updateOwnHospital,
  listHospitalDoctors,
  verifyHospitalDoctor,
  setHospitalDoctorActive,
  listHospitalPatients,
  listHospitalAppointments,
  approveHospitalAppointment,
  declineHospitalAppointment,
  getHospitalAnalytics,
  listHospitalFeedback,
  listPatientCareTeam,
  assignPatientCareTeam,
  endPatientCareTeam,
  provisionHospitalStaff
} from './hospitalAdmin.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Hospital Admin Router — mounted at /api/v1/hospital-admin.
//
// Self-service (profile/hospital-setup/onboarding) is gated on the generic
// ProfileReadOwn/ProfileUpdateOwn permissions, same as every other role's
// own-profile routes. Management endpoints are gated on the
// HospitalDoctorRead/Manage/HospitalPatientRead/etc. permissions added to
// HOSPITAL_ADMIN_PERMISSIONS only — Admin, Doctor and every other role are
// unaffected, and row-level hospital scoping is enforced inside
// hospitalAdmin.service.ts (requireHospitalScope), not here.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// ── Self-service ─────────────────────────────────────────────────────────
router.get(
  '/profile',
  authenticate,
  requirePermission(Permission.ProfileReadOwn),
  getOwnStaffProfile,
);
router.patch(
  '/profile',
  authenticate,
  requirePermission(Permission.ProfileUpdateOwn),
  updateOwnStaffProfile,
);
router.post(
  '/hospital/create',
  authenticate,
  requirePermission(Permission.ProfileUpdateOwn),
  createOwnHospital,
);
router.post(
  '/hospital/join',
  authenticate,
  requirePermission(Permission.ProfileUpdateOwn),
  joinExistingHospital,
);
router.post(
  '/onboarding-complete',
  authenticate,
  requirePermission(Permission.ProfileUpdateOwn),
  completeStaffOnboarding,
);

// ── Management (hospital-scoped) ─────────────────────────────────────────
router.get(
  '/hospital',
  authenticate,
  requirePermission(Permission.HospitalManageOwn),
  getOwnHospital,
);
router.patch(
  '/hospital',
  authenticate,
  requirePermission(Permission.HospitalManageOwn),
  updateOwnHospital,
);

router.get(
  '/doctors',
  authenticate,
  requirePermission(Permission.HospitalDoctorRead),
  listHospitalDoctors,
);
// ⚠️ THE REPLACEMENT FOR PUBLIC DOCTOR SIGN-UP. Gated on the same capability
// as verify/deactivate: creating a clinician account is the same class of act
// as attesting to one, and both are scoped to the admin's own hospital inside
// the service.
router.post(
  '/staff',
  authenticate,
  requirePermission(Permission.HospitalDoctorManage),
  provisionHospitalStaff,
);
// ⚠️ Kept as an alias so the earlier doctor-only path does not 404 for any
// caller already using it. Same handler; the role defaults to Doctor.
router.post(
  '/doctors',
  authenticate,
  requirePermission(Permission.HospitalDoctorManage),
  provisionHospitalStaff,
);
router.post(
  '/doctors/:doctorId/verify',
  authenticate,
  requirePermission(Permission.HospitalDoctorManage),
  verifyHospitalDoctor,
);
router.patch(
  '/doctors/:doctorId/active',
  authenticate,
  requirePermission(Permission.HospitalDoctorManage),
  setHospitalDoctorActive,
);

router.get(
  '/patients',
  authenticate,
  requirePermission(Permission.HospitalPatientRead),
  listHospitalPatients,
);

// ── Care-team assignment ─────────────────────────────────────────────────
// Gated on HospitalDoctorManage rather than HospitalPatientRead: assigning a
// patient to a doctor GRANTS that doctor access to the clinical record (see
// careRelationship.service), so it is a management action, not a read.
router.get(
  '/patients/:patientId/care-team',
  authenticate,
  requirePermission(Permission.HospitalPatientRead),
  listPatientCareTeam,
);
router.post(
  '/care-team',
  authenticate,
  requirePermission(Permission.HospitalDoctorManage),
  assignPatientCareTeam,
);
router.delete(
  '/care-team/:id',
  authenticate,
  requirePermission(Permission.HospitalDoctorManage),
  endPatientCareTeam,
);

router.get(
  '/appointments',
  authenticate,
  requirePermission(Permission.HospitalAppointmentRead),
  listHospitalAppointments,
);
router.post(
  '/appointments/:id/approve',
  authenticate,
  requirePermission(Permission.HospitalAppointmentManage),
  approveHospitalAppointment,
);
router.post(
  '/appointments/:id/decline',
  authenticate,
  requirePermission(Permission.HospitalAppointmentManage),
  declineHospitalAppointment,
);
router.get(
  '/analytics',
  authenticate,
  requirePermission(Permission.HospitalPatientRead),
  getHospitalAnalytics,
);
router.get(
  '/feedback',
  authenticate,
  requirePermission(Permission.FeedbackReadHospitalScoped),
  listHospitalFeedback,
);

export { router as hospitalAdminRouter };
