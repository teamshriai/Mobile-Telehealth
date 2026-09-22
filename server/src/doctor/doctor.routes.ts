import { Router } from 'express';
import { listDoctors } from './doctor.controller';
import { listDoctorSlots } from '../scheduling/scheduling.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Router — the directory backing appointment booking.
//
// Gated on AppointmentCreateOwn rather than a new permission: the only reason
// a patient needs this list is to choose someone to book with, so the two
// capabilities are the same capability. Authenticated regardless — a public
// clinician directory is a scraping target.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.get('/', authenticate, requirePermission(Permission.AppointmentCreateOwn), listDoctors);

// A clinician's free slots, so the patient books a time that actually
// exists. Returns availability only — no patient data — so the booking
// permission is the whole gate. Same generator the doctor's own calendar
// uses, which is what keeps the two sides agreeing about what is bookable.
router.get(
  '/:doctorId/slots',
  authenticate,
  requirePermission(Permission.AppointmentCreateOwn),
  listDoctorSlots,
);

export { router as doctorRouter };
