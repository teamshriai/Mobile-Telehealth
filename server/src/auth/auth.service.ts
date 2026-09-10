import { hash, verify, Algorithm } from '@node-rs/argon2';
import { RoleName } from '@prisma/client';
import crypto from 'crypto';
import { env } from '../config/env.config';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/audit.service';
import { AuditAction, AuditSeverity } from '../services/audit.service';
import { signAccessToken } from '../utils/jwt';
import { authRepository, type UserWithRole } from './auth.repository';
import { refreshTokenService } from './refreshToken.service';
import { decryptProfile } from '../profile/profile.repository';
import { toProfileResponseShape } from '../profile/profile.service';
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

export const authService = {
  /**
   * REGISTRATION
   *
   * 1. Validate email uniqueness
   * 2. Hash password with Argon2id
   * 3. Fetch Patient role
   * 4. Create User + PatientProfile in a transaction
   * 5. Sign JWT
   * 6. Write audit log
   * 7. Return token + sanitized user
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

    // 2. Hash password
    const passwordHash = await hash(dto.password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });

    // 3. Resolve Patient role
    const patientRole = await authRepository.findRoleByName(RoleName.Patient);
    if (patientRole === null) {
      // Roles not seeded — configuration error, not a user error
      throw new AppError('Service is not configured correctly. Please contact support.', 500);
    }

    // 4. Create user + profile atomically
    const user = await authRepository.createUserWithProfile({
      email: dto.email,
      passwordHash,
      roleId: patientRole.id,
      profile: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phoneNumber: dto.phoneNumber,
      },
    });

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
    const hashToVerify = user !== null ? user.passwordHash : await getDummyHash();
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
    });

    return { token, refreshToken: refresh.token, user: sanitize(user) };
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
   * Returns authenticated user + their patient profile.
   */
  async getProfile(userId: string) {
    const user = await authRepository.findWithProfile(userId);
    if (user === null) {
      throw new AppError('User not found.', 404);
    }

    return {
      user: sanitize(user),
      // The client uses `permissions` to decide what to RENDER (hide a button
      // the user cannot use). It is never the authorization decision itself —
      // every endpoint re-checks server-side. Sending it saves the frontend
      // from re-deriving the role→capability map and drifting out of sync.
      permissions: permissionsForRole(user.role.name as RoleName),
      // Reuse the profile module's curated shaper rather than returning the raw
      // row. Returning `decryptProfile(...)` directly leaked 41 fields — the
      // UNMASKED `aadhaarLast4` and the `abhaIdHash` blind index among them —
      // while GET /profile correctly returned 30 curated fields with
      // `aadhaarMasked`. One resource must have one wire shape, or a field
      // ends up protected on one route and exposed on the other.
      profile: user.patientProfile
        ? toProfileResponseShape(decryptProfile(user.patientProfile))
        : null,
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
  ): Promise<{ token: string | null; email: string }> {
    const user = await authRepository.findByEmail(dto.email);

    if (user === null || !user.isActive) {
      auditService.log({
        action: AuditAction.UserLoginFailed,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'forgot_password_email_not_found', email: dto.email },
      });
      return { token: null, email: dto.email };
    }

    // 1. Generate 32 bytes cryptographically secure random raw token (64 hex characters)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // 2. Compute SHA-256 hash for database storage
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 3. Set expiry to exactly 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 4. Save SHA-256 token hash to database atomically (invalidating prior tokens)
    await authRepository.savePasswordResetToken(user.id, tokenHash, expiresAt);

    auditService.log({
      action: AuditAction.PasswordChanged,
      userId: user.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { stage: 'reset_token_issued', email: user.email },
    });

    return { token: rawToken, email: user.email };
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
    await authRepository.resetPasswordWithToken(
      resetRecord.id,
      resetRecord.user.id,
      passwordHash,
    );

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
