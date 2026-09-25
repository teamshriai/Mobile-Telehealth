import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { RoleName } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { normalizeMobile } from '../utils/phone';
import { encryptField, hmacBlindIndex } from '../utils/encryption';
import { authLimiter, authSlowDown } from '../middleware/rateLimiter';
import { sendPasswordSetupInvite } from '../auth/passwordToken';

// ─────────────────────────────────────────────────────────────────────────────
// Super-admin provisioning.
//
// ⚠️ THIS MODULE EXISTS TO CLOSE A BOOTSTRAP DEADLOCK. Locking public
// registration to Patient left `HospitalAdmin` creatable by nothing at all —
// and since `HospitalAdmin` is the only role holding `HospitalDoctorManage`,
// no doctor could be provisioned either. The chain is now:
//
//   create-admin CLI  →  Admin
//   Admin             →  HospitalAdmin   (here)
//   HospitalAdmin     →  Doctor / Resident / Nurse / LabTech
//   nobody            →  self-registers, except a Patient
//
// ⚠️ It is gated on `Permission.UserManageAny`, which already existed and was
// granted to Admin but had ZERO call sites. Consuming a declared-but-unused
// capability is better than minting a new one: the permission catalogue
// already said Admin manages users, and nothing honoured it.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

const provisionHospitalAdminSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').max(80),
    lastName: z.string().trim().min(1, 'Last name is required.').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    // Same India-only rule as the login box and the profile writer — an admin
    // must not be able to register a number the login box cannot parse.
    mobile: z
      .string()
      .trim()
      .regex(
        /^(\+91[\s-]?)?[6-9]\d{9}$/,
        'Enter a 10-digit Indian mobile number starting 6, 7, 8 or 9.',
      ),
    /** Optional: link them to a hospital now, or let them create/join one. */
    hospitalId: z.string().uuid().optional(),
  })
  .strict();

/**
 * POST /api/v1/admin/hospital-admins
 *
 * ⚠️ No password is set — the account authenticates by mobile or email OTP,
 * so an administrator never handles a credential belonging to someone else.
 */
router.post(
  '/hospital-admins',
  authSlowDown,
  authLimiter,
  authenticate,
  requirePermission(Permission.UserManageAny),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = provisionHospitalAdminSchema.parse(req.body);

    const mobile = normalizeMobile(dto.mobile);
    if (mobile === null) throw new AppError('Enter a valid Indian mobile number.', 400);
    const mobileHash = hmacBlindIndex(mobile);

    // Told apart deliberately: the two collisions need different corrections
    // from whoever is reading the message.
    if (await prisma.user.findUnique({ where: { email: dto.email } })) {
      throw new AppError('An account already exists with that email address.', 409);
    }
    if (await prisma.user.findFirst({ where: { mobileHash } })) {
      throw new AppError('An account already uses that mobile number.', 409);
    }

    const role = await prisma.role.findUnique({
      where: { name: RoleName.HospitalAdmin },
      select: { id: true },
    });
    if (role === null) throw new AppError('HospitalAdmin role is not configured.', 500);

    if (dto.hospitalId !== undefined) {
      const exists = await prisma.hospital.findUnique({ where: { id: dto.hospitalId } });
      if (exists === null) throw new AppError('That hospital does not exist.', 404);
    }

    // One transaction: a User without its StaffProfile can sign in and then
    // fail every admin screen that reads the profile.
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash: null,
          mobile: encryptField(mobile),
          mobileHash,
          roleId: role.id,
          isVerified: true,
          isActive: true,
        },
        select: { id: true },
      });
      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: mobile,
          hospitalId: dto.hospitalId ?? null,
          isVerified: true,
          verifiedAt: new Date(),
          // ⚠️ Only complete when a hospital is already linked. Without one
          // they must run the hospital create/join flow, and marking
          // onboarding done would skip the screen that does it.
          onboardingCompletedAt: dto.hospitalId === undefined ? null : new Date(),
        },
        select: { id: true },
      });
      return { userId: user.id, staffProfileId: profile.id };
    });

    auditService.log({
      action: AuditAction.HospitalAdminRegistered,
      userId: req.user!.id,
      severity: AuditSeverity.Info,
      resource: 'staff_profile',
      resourceId: created.staffProfileId,
      ...getRequestMeta(req),
      // The provisioned account and the acting admin — never the mobile number.
      metadata: { action: 'provisioned_by_admin', provisionedUserId: created.userId },
    });

    const invite = await sendPasswordSetupInvite(created.userId, dto.email);

    res.status(201).json(
      ApiResponseBuilder.success(
        invite.sent
          ? 'Hospital administrator added. A link to set their password has been emailed to them.'
          : 'Hospital administrator added. The set-password email could not be sent — they can use '
            + '"Forgot password" on the sign-in page with the email you registered.',
        { ...created, inviteSent: invite.sent },
      ),
    );
  }),
);

export { router as adminRouter };
