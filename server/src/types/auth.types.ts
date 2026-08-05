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
 * Role names — must stay in sync with the `role_name` enum in schema.prisma.
 */
export enum RoleName {
  Admin = 'Admin',
  Patient = 'Patient',
  Doctor = 'Doctor',
  HealthcareWorker = 'HealthcareWorker',
  LabTechnician = 'LabTechnician',
}

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
