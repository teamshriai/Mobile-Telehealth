import { hash, verify, Algorithm } from '@node-rs/argon2';
import { RoleName } from '@prisma/client';
import { env } from '../config/env.config';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/audit.service';
import { AuditAction, AuditSeverity } from '../services/audit.service';
import { signAccessToken } from '../utils/jwt';
import { authRepository, type UserWithRole } from './auth.repository';
import type { RegisterDto, LoginDto } from './auth.validator';
import type { SanitizedUser } from '../types/auth.types';

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
    _dummyHash = await hash('oncotrace-timing-prevention-dummy-value-v1', {
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
  ): Promise<{ token: string; user: SanitizedUser }> {
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
      },
    });

    // 5. Sign JWT
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
    });

    // 6. Audit log (fire-and-forget — never blocks the response)
    auditService.log({
      action: AuditAction.UserRegistered,
      userId: user.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { email: user.email, role: user.role.name },
    });

    return { token, user: sanitize(user) };
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
  ): Promise<{ token: string; user: SanitizedUser }> {
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

    auditService.log({
      action: AuditAction.UserLoginSuccess,
      userId: user.id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { token, user: sanitize(user) };
  },

  /**
   * LOGOUT
   *
   * Without refresh tokens, logout is client-side (discard the token).
   * We record the audit event and return success.
   * A token denylist (Redis) would be required for true server-side revocation.
   */
  logout(userId: string, meta: { ipAddress?: string; userAgent?: string }): void {
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
      profile: user.patientProfile ?? null,
    };
  },
};
