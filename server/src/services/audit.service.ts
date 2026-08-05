import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Audit Service
//
// All security-relevant events are logged through this single interface.
// Callers fire-and-forget — auditService.log() is never awaited, so it
// never blocks or delays an HTTP response.
//
// Phase 1 : writes to the audit_logs table in PostgreSQL.
// Phase 2 : swap this implementation to publish to Kafka/SQS without
//            changing any calling code — the interface never changes.
//
// HIPAA / GDPR: audit logs are immutable. This service only INSERTs.
// ─────────────────────────────────────────────────────────────────────────────

export enum AuditAction {
  UserRegistered = 'UserRegistered',
  UserLoginSuccess = 'UserLoginSuccess',
  UserLoginFailed = 'UserLoginFailed',
  UserLogout = 'UserLogout',
  PasswordChanged = 'PasswordChanged',
  AccountLocked = 'AccountLocked',
  AccountUnlocked = 'AccountUnlocked',
  EmailVerified = 'EmailVerified',
  UnauthorizedAccess = 'UnauthorizedAccess',
  ProfileUpdated = 'ProfileUpdated',
  ProfilePhotoUpdated = 'ProfilePhotoUpdated',
  RoleChanged = 'RoleChanged',
}

export enum AuditSeverity {
  Info = 'Info',
  Warning = 'Warning',
  Critical = 'Critical',
}

export interface AuditPayload {
  action: AuditAction;
  userId?: string;
  resource?: string;
  resourceId?: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

class AuditService {
  /**
   * Log a security-relevant event.
   * This method is synchronous from the caller's perspective.
   * The DB write is fire-and-forget — errors are caught and logged to stderr
   * so a failing audit write never breaks the primary request flow.
   */
  log(payload: AuditPayload): void {
    const { action, userId, resource, resourceId, severity, ipAddress, userAgent, metadata } =
      payload;

    // Map string enums to Prisma enums
    const prismaAction = action as unknown as import('@prisma/client').AuditAction;
    const prismaSeverity = (severity ??
      AuditSeverity.Info) as unknown as import('@prisma/client').AuditSeverity;

    prisma.auditLog
      .create({
        data: {
          action: prismaAction,
          severity: prismaSeverity,
          userId: userId ?? null,
          resource: resource ?? null,
          resourceId: resourceId ?? null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          metadata:
            metadata !== undefined
              ? (metadata as import('@prisma/client').Prisma.InputJsonValue)
              : undefined,
        },
      })
      .catch((err: unknown) => {
        // Audit write failure must NEVER crash the server or fail the request
        console.error('[AuditService] Failed to write audit log:', err);
      });
  }
}

export const auditService = new AuditService();
