import { Router } from 'express';
import {
  listAppointments,
  getAppointment,
  createAppointment,
  cancelAppointment,
} from './appointment.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Router
//
// Guarded with requirePermission rather than authorize(RoleName.Patient):
// routes declare WHAT capability they need and config/permissions.ts decides
// which roles hold it, so granting clinicians access later is one edit there
// rather than a change to every route file.
//
// Ownership is NOT enforced here — the permission layer only answers "may this
// role ever do this?". "Is this row yours?" is enforced in the service, which
// scopes every query to the caller's own patient profile.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get('/', authenticate, requirePermission(Permission.AppointmentReadOwn), listAppointments);
router.post('/', authenticate, requirePermission(Permission.AppointmentCreateOwn), createAppointment);
router.get('/:id', authenticate, requirePermission(Permission.AppointmentReadOwn), getAppointment);
router.patch(
  '/:id/cancel',
  authenticate,
  requirePermission(Permission.AppointmentCancelOwn),
  cancelAppointment,
);

export { router as appointmentRouter };
