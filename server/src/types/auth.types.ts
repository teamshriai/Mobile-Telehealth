// ─────────────────────────────────────────────────────────────────────────────
// Shared Auth Domain Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * JWT payload shape. Role is included per product requirement.
 * Trade-off: role is cached in the token (15 min max).
 * The authenticate middleware ALWAYS re-validates the user exists and is active
 * against the DB — preventing stale/revoked sessions from working.
 */
export interface JwtPayload {
  sub: string; // User UUID
  email: string;
  role: string; // RoleName
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

/**
 * Role names.
 *
 * Re-exported from the Prisma client rather than hand-mirrored. The previous
 * hand-written copy was structurally identical but a DIFFERENT TypeScript type,
 * so every value crossing the Prisma boundary needed a cast — which is exactly
 * how the two silently drift apart. Aliasing means adding a role to
 * schema.prisma propagates here on the next `prisma generate`, and a role
 * removed from the schema becomes a compile error rather than dead runtime code.
 */
export { RoleName } from '@prisma/client';
export type { RoleName as RoleNameType } from '@prisma/client';

/**
 * Sanitized user object — safe to return in API responses.
 * Never contains passwordHash, verificationToken, or internal fields.
 */
export interface SanitizedUser {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}
