import { hash, verify, Algorithm } from '@node-rs/argon2';
import { RoleName } from '@prisma/client';
import crypto from 'crypto';
import { env } from '../config/env.config';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/audit.service';
import { AuditAction, AuditSeverity } from '../services/audit.service';
import { signAccessToken } from '../utils/jwt';
import { normalizeMobile } from '../utils/phone';
import { hmacBlindIndex } from '../utils/encryption';
import { authRepository, type UserWithRole } from './auth.repository';
import { refreshTokenService } from './refreshToken.service';
import { issuePasswordToken, RESET_TOKEN_TTL_MS, SETUP_TOKEN_TTL_MS } from './passwordToken';
import { decryptProfile } from '../profile/profile.repository';
import { toProfileResponseShape } from '../profile/profile.service';
import { toDoctorProfileResponseShape } from '../doctor/doctorProfile.service';
import { toStaffProfileResponseShape } from '../hospitalAdmin/staffProfile.service';
import { CURRENT_TERMS_VERSION } from './auth.validator';
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './auth.validator';
import type { SanitizedUser } from '../types/auth.types';
import { permissionsForRole } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Pre-computed dummy hash — used to prevent timing-based user enumeration.
// When a login attempt uses an email that does not exist, we still call
// verify() against this hash so the response time is indistinguishable
// from a valid-email/wrong-password attempt.
let _dummyHash: string | null = null;

async function getDummyHash(): Promise<string> {
  if (_dummyHash === null) {
    _dummyHash = await hash('stroke-ai-timing-prevention-dummy-value-v1', {
      algorithm: Algorithm.Argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });
  }
  return _dummyHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a sanitized user object — safe to include in API responses.
 * NEVER expose passwordHash, verificationToken, lockedUntil, or failedLoginAttempts.
 */
function sanitize(user: UserWithRole): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role.name,
    isVerified: user.isVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ THE ONE PLACE A SESSION IS CREATED.
 *
 * Password login and OTP login both end here, and that is the entire point:
 * two call sites minting their own tokens is how a system acquires a second,
 * subtly weaker authentication path that nobody audits. In particular
 * `refreshTokenService.issue()` is the sole minting point for a `familyId` —
 * writing a RefreshToken row directly anywhere else would break rotation,
 * reuse detection and family revocation all at once.
 *
 * `method` is recorded on the audit row so "how did this session start" is
 * answerable after the fact, which matters the first time a password login
 * appears on an account that is supposed to be OTP-only.
 */
async function establishSession(
  user: UserWithRole,
  meta: { ipAddress?: string; userAgent?: string },
  method: 'password' | 'otp',
): Promise<{ token: string; refreshToken: string; user: SanitizedUser }> {
  await authRepository.recordSuccessfulLogin(user.id);

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role.name,
  });

  const refresh = await refreshTokenService.issue(user.id, meta);

  auditService.log({
    action: AuditAction.UserLoginSuccess,
    userId: user.id,
    severity: AuditSeverity.Info,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: { method },
  });

  return { token, refreshToken: refresh.token, user: sanitize(user) };
}

export const authService = {
  /**
   * REGISTRATION
   *
   * 1. Validate email uniqueness
   * 2. Hash password with Argon2id
   * 3. Fetch the role matching dto.role (Patient/Doctor/HospitalAdmin — never
   *    Admin, which the validator does not even accept)
   * 4. Create User + the matching profile (Patient/Doctor/Staff) in one
   *    transaction
   * 5. Sign JWT
   * 6. Write audit log(s)
   * 7. Return token + sanitized user
   *
   * Every role is instant-active on creation (no approval gate blocks
   * login) — see the schema comments on DoctorProfile.isVerified /
   * StaffProfile.isVerified for why that flag exists anyway: it is a later,
   * separate credential-check a Hospital Admin (or the global Admin, for a
   * hospital's first doctor) sets, never a registration-time or login gate.
   */
  async register(
    dto: RegisterDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string; refreshToken: string; user: SanitizedUser }> {
    // 1. Duplicate email check
    const existing = await authRepository.findByEmail(dto.email);
    if (existing !== null) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    // 1b. The mobile becomes a login identity, and `User.mobileHash` is unique.
    // ⚠️ Same disclosure as the email check above — a registration form that
    // cannot say "that number is taken" leaves the person stuck — and the same
    // limiter covers both.
    const mobile = dto.phoneNumber === undefined ? null : normalizeMobile(dto.phoneNumber);
    if (
      mobile !== null &&
      (await authRepository.findByMobileHash(hmacBlindIndex(mobile))) !== null
    ) {
      throw new AppError('An account already uses this mobile number. Sign in instead.', 409);
    }

    // 2. Hash password
    const passwordHash = await hash(dto.password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });

    // 3. Resolve the requested role
    const role = await authRepository.findRoleByName(RoleName[dto.role]);
    if (role === null) {
      // Roles not seeded — configuration error, not a user error
      throw new AppError('Service is not configured correctly. Please contact support.', 500);
    }

    const termsAcceptedAt = dto.agreed ? new Date() : null;
    const termsVersion = dto.agreed ? CURRENT_TERMS_VERSION : null;

    // 4. Create user + patient profile atomically
    //
    // ⚠️ The Doctor and HospitalAdmin branches were removed with the role
    // enum above. The repository methods they called
    // (`createUserWithDoctorProfile`, `createUserWithStaffProfile`) are KEPT —
    // they are how a hospital admin provisions a clinician, and deleting a
    // working provisioning primitive because its only *public* caller went
    // away would have been the wrong cleanup.
    let user: UserWithRole;
    {
      user = await authRepository.createUserWithProfile({
        email: dto.email,
        passwordHash,
        roleId: role.id,
        mobile,
        termsAcceptedAt,
        termsVersion,
        profile: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: new Date(dto.dateOfBirth),
          gender: dto.gender,
          phoneNumber: dto.phoneNumber,
        },
      });
    }

    // 5. Sign JWT
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
    });

    // 6. Issue the session's first refresh token
    const refresh = await refreshTokenService.issue(user.id, meta);

    // 7. Audit log (fire-and-forget — never blocks the response)
    auditService.log({
      action: AuditAction.UserRegistered,
      userId: user.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { email: user.email, role: user.role.name },
    });

    // ⚠️ The HospitalAdminRegistered branch was removed with the role enum —
    // a hospital admin can no longer self-register, so this could never fire.
    // The AuditAction value itself stays (the enum comment in schema.prisma is
    // explicit that values are never removed), and historical rows keep their
    // meaning.

    return { token, refreshToken: refresh.token, user: sanitize(user) };
  },

  /**
   * LOGIN
   *
   * 1. Find user by email
   * 2. Run verify() regardless (prevents timing-based enumeration)
   * 3. Check account status (active, not locked)
   * 4. Handle wrong password (increment attempts, conditionally lock)
   * 5. On success: reset attempts, update lastLoginAt, sign JWT
   * 6. Write audit log
   */
  async login(
    dto: LoginDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string; refreshToken: string; user: SanitizedUser }> {
    const user = await authRepository.findByEmail(dto.email);

    // Always run verify() — prevents timing-based user enumeration.
    // If user doesn't exist, verify against a dummy hash.
    //
    // ⚠️ A NULL passwordHash takes the SAME path as a missing user. An account
    // provisioned for mobile + OTP has no password, and the honest answer to
    // "log me in with a password" is the same generic refusal a wrong password
    // gets — with the same timing, because the dummy verify still runs. Saying
    // "this account has no password" instead would confirm the account exists
    // AND disclose how it authenticates, which is two enumeration oracles in
    // one sentence. The user is told to use OTP by the login screen, not by
    // this endpoint's error.
    const hashToVerify = user?.passwordHash ?? (await getDummyHash());
    const isPasswordValid = await verify(hashToVerify, dto.password);

    // Generic error for non-existent user or wrong password — same message, same timing.
    if (user === null || !isPasswordValid) {
      // Increment failed attempts only when the user exists (no user = no row to update)
      if (user !== null) {
        const updated = await authRepository.incrementFailedLoginAttempts(
          user.id,
          MAX_FAILED_ATTEMPTS,
          LOCK_DURATION_MS,
        );

        auditService.log({
          action: AuditAction.UserLoginFailed,
          userId: user.id,
          severity:
            updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS
              ? AuditSeverity.Critical
              : AuditSeverity.Warning,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          metadata: {
            reason: 'invalid_password',
            failedAttempts: updated.failedLoginAttempts,
            accountLocked: updated.lockedUntil !== null,
          },
        });
      } else {
        auditService.log({
          action: AuditAction.UserLoginFailed,
          severity: AuditSeverity.Warning,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          metadata: { reason: 'email_not_found' },
        });
      }

      throw new AppError('Invalid credentials.', 401);
    }

    // Account lock check (checked AFTER password validation to prevent enumeration)
    if (user.lockedUntil !== null && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new AppError(
        `Account temporarily locked. Try again in ${minutesRemaining} minutes.`,
        423,
      );
    }

    // Account status checks
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 403);
    }

    // 5. Success path
    return establishSession(user, meta, 'password');
  },

  /**
   * LOGIN BY VERIFIED OTP
   *
   * ⚠️ The OTP is checked by `otp.service.ts` BEFORE this is called. This
   * function's only job is to turn an already-proven `userId` into exactly the
   * session a password login would have produced — which is why it ends in the
   * same `establishSession` call and not in a parallel implementation.
   */
  async loginWithVerifiedOtp(
    userId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string; refreshToken: string; user: SanitizedUser }> {
    const user = await authRepository.findById(userId);

    // ⚠️ Re-checked here, not trusted from the challenge. A challenge can
    // outlive the account it was issued against — deactivation and soft
    // delete both have to be able to stop a login that is already in flight.
    if (user === null || user.deletedAt !== null || !user.isActive) {
      throw new AppError('This account is no longer active. Contact your administrator.', 403);
    }

    // ⚠️ Defence in depth for the patient-only OTP rule. `otp.service.request`
    // already never binds a staff account to a challenge, so this is reached
    // only by a challenge issued before that rule existed. Same wording and
    // status as a wrong code, so it confirms nothing about the account.
    if (user.role.name !== RoleName.Patient) {
      throw new AppError('That code is not correct.', 401);
    }

    return establishSession(user, meta, 'otp');
  },

  /**
   * REFRESH
   *
   * Exchanges a valid refresh token for a new access token, rotating the
   * refresh token in the process. The user is re-read from the database so a
   * deactivated or soft-deleted account cannot keep refreshing its way to new
   * access tokens — the same guarantee `authenticate` provides per-request.
   */
  async refresh(
    rawRefreshToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string; refreshToken: string; user: SanitizedUser }> {
    const rotated = await refreshTokenService.rotate(rawRefreshToken, meta);

    const user = await authRepository.findById(rotated.userId);

    if (user === null || !user.isActive || user.deletedAt !== null) {
      // The session is real but the account is gone or disabled. Kill every
      // remaining token rather than leaving a usable family behind.
      await refreshTokenService.revokeAllForUser(rotated.userId, 'account_inactive_on_refresh');
      throw new AppError('Invalid or expired session. Please sign in again.', 401);
    }

    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
    });

    auditService.log({
      action: AuditAction.TokenRefreshed,
      userId: user.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { token, refreshToken: rotated.token, user: sanitize(user) };
  },

  /**
   * LOGOUT
   *
   * Revokes the presented refresh token so this device's session genuinely
   * ends server-side. The access token remains valid until it expires (≤15
   * min) — revoking that too would need a denylist; the short TTL is the
   * accepted trade-off, and it is now bounded rather than open-ended.
   */
  async logout(
    userId: string,
    rawRefreshToken: string | undefined,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    if (rawRefreshToken !== undefined && rawRefreshToken.length > 0) {
      await refreshTokenService.revoke(rawRefreshToken);
    }

    auditService.log({
      action: AuditAction.UserLogout,
      userId,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },

  /**
   * GET PROFILE
   *
   * Returns authenticated user + whichever profile actually exists for
   * their role. Previously this only ever looked at patientProfile — a
   * Doctor or HospitalAdmin's `/auth/me` silently returned `profile: null`
   * forever, which made onboardingCompletedAt unreadable for those roles
   * and onboarding routing impossible to implement for them. Branching here
   * (rather than returning all three profiles) keeps one wire shape per
   * role, matching this function's own existing discipline for Patient.
   */
  async getProfile(userId: string) {
    const user = await authRepository.findWithProfile(userId);
    if (user === null) {
      throw new AppError('User not found.', 404);
    }

    const profile = user.patientProfile
      ? // Reuse the profile module's curated shaper rather than returning the
        // raw row. Returning `decryptProfile(...)` directly leaked 41 fields
        // — the UNMASKED `aadhaarLast4` and the `abhaIdHash` blind index
        // among them — while GET /profile correctly returned 30 curated
        // fields with `aadhaarMasked`. One resource must have one wire
        // shape, or a field ends up protected on one route and exposed on
        // the other.
        toProfileResponseShape(decryptProfile(user.patientProfile))
      : user.doctorProfile
        ? toDoctorProfileResponseShape(user.doctorProfile)
        : user.staffProfile
          ? toStaffProfileResponseShape(user.staffProfile)
          : null;

    return {
      user: sanitize(user),
      // The client uses `permissions` to decide what to RENDER (hide a button
      // the user cannot use). It is never the authorization decision itself —
      // every endpoint re-checks server-side. Sending it saves the frontend
      // from re-deriving the role→capability map and drifting out of sync.
      permissions: permissionsForRole(user.role.name),
      profile,
    };
  },

  /**
   * FORGOT PASSWORD
   *
   * 1. Generates 32 bytes of cryptographically secure random data (`crypto.randomBytes(32)`).
   * 2. Computes SHA-256 hash of raw token (`crypto.createHash('sha256')`).
   * 3. Stores token hash in PasswordResetToken model with 15-minute expiration.
   * 4. Raw token is NEVER stored in database or logged.
   * 5. Returns generic response regardless of user existence (anti-enumeration).
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string | null; email: string; expiresAt: Date | null }> {
    const user = await authRepository.findByEmail(dto.email);

    if (!user?.isActive) {
      auditService.log({
        action: AuditAction.UserLoginFailed,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'forgot_password_email_not_found', email: dto.email },
      });
      return { token: null, email: dto.email, expiresAt: null };
    }

    const { rawToken, expiresAt } = await issuePasswordToken(user.id, RESET_TOKEN_TTL_MS);

    auditService.log({
      action: AuditAction.PasswordChanged,
      userId: user.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { stage: 'reset_token_issued', email: user.email },
    });

    return { token: rawToken, email: user.email, expiresAt };
  },

  /**
   * SET-PASSWORD INVITATION for a provisioned account.
   *
   * ⚠️ Provisioning never sets a password — no administrator ever types, sees
   * or relays one. The new staff member instead receives this single-use link
   * and chooses their own. It is the forgot-password token, reused: same
   * table, same hashing, same single-use sweep, same `/reset-password`
   * consumer. Only the lifetime differs, because an invitation is read on the
   * person's first shift, not within fifteen minutes.
   */
  async issuePasswordSetupToken(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
    return issuePasswordToken(userId, SETUP_TOKEN_TTL_MS);
  },

  /**
   * VERIFY RESET TOKEN
   *
   * Validates raw token format, computes SHA-256 hash, and verifies existence,
   * expiration, used status, and associated user status.
   */
  async verifyResetToken(dto: { token: string }): Promise<{ valid: boolean }> {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const resetRecord = await authRepository.findPasswordResetToken(tokenHash);

    if (!resetRecord) {
      return { valid: false };
    }

    if (
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt < new Date() ||
      !resetRecord.user ||
      !resetRecord.user.isActive ||
      resetRecord.user.deletedAt !== null
    ) {
      return { valid: false };
    }

    return { valid: true };
  },

  /**
   * RESET PASSWORD
   *
   * 1. Computes SHA-256 hash of incoming raw reset token.
   * 2. Finds PasswordResetToken record and verifies expiry, used status, user state.
   * 3. Hashes new password with Argon2id using existing configuration.
   * 4. Updates user password & marks token as used atomically in a transaction.
   * 5. Invalidation timestamp passwordChangedAt invalidates all existing JWT sessions.
   */
  async resetPassword(
    dto: ResetPasswordDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const resetRecord = await authRepository.findPasswordResetToken(tokenHash);

    if (
      !resetRecord ||
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt < new Date() ||
      !resetRecord.user ||
      !resetRecord.user.isActive ||
      resetRecord.user.deletedAt !== null
    ) {
      throw new AppError('Invalid or expired reset token. Please request a new link.', 400);
    }

    // Hash new password using Argon2id
    const passwordHash = await hash(dto.password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });

    // Execute atomic reset transaction
    await authRepository.resetPasswordWithToken(resetRecord.id, resetRecord.user.id, passwordHash);

    // A password reset is the canonical "I may have been compromised" event.
    // Every existing session must die, not just the one doing the reset.
    await refreshTokenService.revokeAllForUser(resetRecord.user.id, 'password_reset', meta);

    auditService.log({
      action: AuditAction.PasswordChanged,
      userId: resetRecord.user.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { stage: 'password_reset_complete' },
    });
  },

  /**
   * CHANGE PASSWORD (authenticated user, Settings page)
   *
   * Unlike resetPassword, this requires proving knowledge of the CURRENT
   * password rather than a mailed token. Same Argon2id verify/hash as
   * login/reset. Bumping passwordChangedAt invalidates old JWTs for free.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const user = await authRepository.findById(userId);
    if (user === null) {
      throw new AppError('User not found.', 404);
    }

    // ⚠️ Authenticated already, so there is no enumeration risk here and the
    // honest, actionable message is the right one — unlike login() above.
    if (user.passwordHash === null) {
      throw new AppError(
        'This account signs in with a mobile number and OTP, so it has no password to change.',
        400,
      );
    }

    const isCurrentPasswordValid = await verify(user.passwordHash, dto.currentPassword);
    if (!isCurrentPasswordValid) {
      auditService.log({
        action: AuditAction.UserLoginFailed,
        userId,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'change_password_wrong_current_password' },
      });
      throw new AppError('Current password is incorrect.', 401);
    }

    const passwordHash = await hash(dto.newPassword, {
      algorithm: Algorithm.Argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });

    await authRepository.updatePassword(userId, passwordHash);

    // passwordChangedAt already invalidates outstanding ACCESS tokens via the
    // authenticate middleware; this kills the refresh tokens too, so no device
    // can quietly mint a new access token after the change.
    await refreshTokenService.revokeAllForUser(userId, 'password_changed', meta);

    auditService.log({
      action: AuditAction.PasswordChanged,
      userId,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { stage: 'password_changed_by_user' },
    });
  },

  /**
   * DELETE ACCOUNT (self-service, Settings page)
   *
   * Requires the current password — this is permanent-from-the-user's-
   * perspective and irreversible without support intervention, so it gets
   * the same proof-of-identity bar as changing the password.
   */
  async deleteAccount(
    userId: string,
    currentPassword: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const user = await authRepository.findById(userId);
    if (user === null) {
      throw new AppError('User not found.', 404);
    }

    // ⚠️ FAIL CLOSED. Deleting an account is irreversible, and the password
    // prompt is the re-authentication that stops a walked-up-to, already-open
    // session from doing it. An OTP-only account has no password to re-check,
    // so the correct behaviour is to REFUSE — not to skip the check, which
    // would make account deletion strictly easier for passwordless users than
    // for everyone else. Re-verifying by OTP at this point is the right
    // feature; inventing it inside a delete handler is not.
    if (user.passwordHash === null) {
      throw new AppError(
        'This account signs in with a mobile number and OTP. Deleting it needs to be done by '
          + 'your hospital administrator, so the request can be confirmed with you directly.',
        400,
      );
    }

    const isPasswordValid = await verify(user.passwordHash, currentPassword);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect.', 401);
    }

    await authRepository.softDeleteAccount(userId);
    await refreshTokenService.revokeAllForUser(userId, 'account_deleted', meta);

    auditService.log({
      action: AuditAction.AccountDeleted,
      userId,
      severity: AuditSeverity.Critical,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },
};
