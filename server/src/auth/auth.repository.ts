import { type Gender, type Prisma, RoleName } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Repository
//
// All database access for the auth domain lives here.
// Services never call prisma directly — they go through this layer.
// Swapping the ORM requires changes only in this file.
// ─────────────────────────────────────────────────────────────────────────────

// The shape returned by most user queries (includes role relation)
const userWithRoleSelect = {
  id: true,
  email: true,
  passwordHash: true,
  roleId: true,
  isVerified: true,
  isActive: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  lastLoginAt: true,
  passwordChangedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export type UserWithRole = Prisma.UserGetPayload<{ select: typeof userWithRoleSelect }>;

const userWithProfileSelect = {
  ...userWithRoleSelect,
  patientProfile: true,
} satisfies Prisma.UserSelect;

export type UserWithProfile = Prisma.UserGetPayload<{ select: typeof userWithProfileSelect }>;

// ─────────────────────────────────────────────────────────────────────────────

export const authRepository = {
  /**
   * Find a non-deleted user by email with their role.
   * Used in: login, duplicate-email check during registration.
   */
  async findByEmail(email: string): Promise<UserWithRole | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: userWithRoleSelect,
    });
  },

  /**
   * Find a non-deleted user by ID with their role.
   * Used in: authenticate middleware.
   */
  async findById(id: string): Promise<UserWithRole | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userWithRoleSelect,
    });
  },

  /**
   * Find a user with their full profile.
   * Used in: GET /me endpoint.
   */
  async findWithProfile(id: string): Promise<UserWithProfile | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userWithProfileSelect,
    });
  },

  /**
   * Find a role by its name enum value.
   * Used in: registration (to assign default Patient role).
   */
  async findRoleByName(name: RoleName) {
    return prisma.role.findUnique({ where: { name } });
  },

  /**
   * Create a User and PatientProfile atomically in a single transaction.
   * If either operation fails, both are rolled back.
   */
  async createUserWithProfile(data: {
    email: string;
    passwordHash: string;
    roleId: string;
    profile: {
      firstName: string;
      lastName: string;
      dateOfBirth: Date;
      gender?: Gender;
    };
  }): Promise<UserWithRole> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          roleId: data.roleId,
          passwordChangedAt: new Date(),
          patientProfile: {
            create: {
              firstName: data.profile.firstName,
              lastName: data.profile.lastName,
              dateOfBirth: data.profile.dateOfBirth,
              gender: data.profile.gender,
            },
          },
        },
        select: userWithRoleSelect,
      });

      return user;
    });
  },

  /**
   * Record a successful login: update lastLoginAt and reset failed attempts.
   */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  },

  /**
   * Increment failed login attempts and lock the account if threshold is reached.
   * Returns the updated user so the service can decide the response.
   */
  async incrementFailedLoginAttempts(
    userId: string,
    maxAttempts: number,
    lockDurationMs: number,
  ): Promise<{ failedLoginAttempts: number; lockedUntil: Date | null }> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });

    // Lock the account if the threshold is hit
    if (user.failedLoginAttempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + lockDurationMs);
      await prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });
      return { ...user, lockedUntil };
    }

    return user;
  },
};
