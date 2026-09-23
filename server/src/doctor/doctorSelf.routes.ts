import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import {
  getOwnDoctorProfile,
  updateOwnDoctorProfile,
  completeDoctorOnboarding,
} from './doctorProfile.controller';
import {
  listAvailability,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  setAvailabilitySlotActive,
  addLeave,
  removeLeave,
} from './doctorAvailability.controller';
import { listOwnPatients, listOpenEncounters } from './doctorPatients.controller';
import { getMyDay, listOwnAppointments } from './doctorDashboard.controller';
import {
  listOwnSlots,
  createAppointmentForPatient,
  updateAppointment,
} from '../scheduling/scheduling.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Self-Service Router — mounted at /api/v1/doctor (singular).
//
// Distinct from doctor.routes.ts, mounted at /api/v1/doctors (plural) — the
// PATIENT-facing bookable directory. Conflating the two under one path was
// the kind of ambiguity worth a deliberate naming split rather than a
// shared, overloaded router.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get(
  '/profile',
  authenticate,
  requirePermission(Permission.ProfileReadOwn),
  getOwnDoctorProfile,
);
router.patch(
  '/profile',
  authenticate,
  requirePermission(Permission.ProfileUpdateOwn),
  updateOwnDoctorProfile,
);
router.post(
  '/onboarding-complete',
  authenticate,
  requirePermission(Permission.ProfileUpdateOwn),
  completeDoctorOnboarding,
);

router.get(
  '/availability',
  authenticate,
  requirePermission(Permission.AvailabilityManageOwn),
  listAvailability,
);
router.post(
  '/availability',
  authenticate,
  requirePermission(Permission.AvailabilityManageOwn),
  addAvailabilitySlot,
);
router.delete(
  '/availability/:id',
  authenticate,
  requirePermission(Permission.AvailabilityManageOwn),
  removeAvailabilitySlot,
);
router.patch(
  '/availability/:id',
  authenticate,
  requirePermission(Permission.AvailabilityManageOwn),
  setAvailabilitySlotActive,
);
router.post('/leave', authenticate, requirePermission(Permission.AvailabilityManageOwn), addLeave);
router.delete(
  '/leave/:id',
  authenticate,
  requirePermission(Permission.AvailabilityManageOwn),
  removeLeave,
);

router.get(
  '/patients',
  authenticate,
  requirePermission(Permission.PatientReadAssigned),
  listOwnPatients,
);

// The "My Day" aggregate and the doctor's own diary. Both are gated on
// AppointmentReadAssigned, which DOCTOR_PERMISSIONS already grants — the
// dashboard shows nothing a doctor could not already read one panel at a
// time, it just spares the client five round trips to assemble one screen.
router.get(
  '/dashboard',
  authenticate,
  requirePermission(Permission.AppointmentReadAssigned),
  getMyDay,
);
router.get(
  '/appointments',
  authenticate,
  requirePermission(Permission.AppointmentReadAssigned),
  listOwnAppointments,
);

// ── Scheduling ───────────────────────────────────────────────────────────
// AppointmentManageAssigned has been granted to Doctor since the
// hospital-admin phase and used by nothing; these are its first consumers.
// Row scoping (is this MY appointment, is this MY patient) is enforced in
// scheduling.service, not here.
router.get(
  '/slots',
  authenticate,
  requirePermission(Permission.AppointmentReadAssigned),
  listOwnSlots,
);
router.post(
  '/appointments',
  authenticate,
  requirePermission(Permission.AppointmentManageAssigned),
  createAppointmentForPatient,
);
router.patch(
  '/appointments/:id',
  authenticate,
  requirePermission(Permission.AppointmentManageAssigned),
  updateAppointment,
);

/** Cross-patient list of this clinician's open encounters (S-06-01). */
router.get(
  '/encounters',
  authenticate,
  requirePermission(Permission.EncounterReadAssigned),
  listOpenEncounters,
);

export { router as doctorSelfRouter };
