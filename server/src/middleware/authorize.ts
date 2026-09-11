import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { asyncHandler } from '../utils/asyncHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import type { RoleName } from '../types/auth.types';
import { roleHasPermission, type PermissionName } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Authorize Middleware — Role-Based Access Control
//
// Usage: router.get('/admin', authenticate, authorize('Admin'), handler)
//
// Must always be placed AFTER authenticate — relies on req.user being set.
// Unauthorized attempts are audit-logged with Warning severity.
// ─────────────────────────────────────────────────────────────────────────────

export const authorize = (...allowedRoles: RoleName[]): ReturnType<typeof asyncHandler> =>
  asyncHandler((req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.user === undefined) {
      throw new AppError('Authentication required.', 401);
    }

    const userRole = req.user.roleName as RoleName;

    if (!allowedRoles.includes(userRole)) {
      auditService.log({
        action: AuditAction.UnauthorizedAccess,
        userId: req.user.id,
        severity: AuditSeverity.Warning,
        ipAddress: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: {
          userRole,
          allowedRoles,
          attemptedPath: req.originalUrl,
          method: req.method,
        },
      });

      throw new AppError('You do not have permission to access this resource.', 403);
    }

    next();
    return Promise.resolve();
  });

// ─────────────────────────────────────────────────────────────────────────────
// Permission Middleware — the preferred guard
//
// `authorize('Doctor', 'Admin')` hardcodes WHO. `requirePermission('patient:
// read:assigned')` declares WHAT, and lets config/permissions.ts decide who.
// Prefer this: granting a role a new capability then becomes one edit in the
// permission map rather than a hunt through route files.
//
// Scope note: this answers "may this ROLE ever do this?" only. Row ownership
// ("is this MY record?") is a service-layer concern — see requireCareRelationship.
// ─────────────────────────────────────────────────────────────────────────────

export const requirePermission = (...required: PermissionName[]): ReturnType<typeof asyncHandler> =>
  asyncHandler((req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.user === undefined) {
      throw new AppError('Authentication required.', 401);
    }

    const userRole = req.user.roleName as RoleName;

    // ALL listed permissions must be held — an endpoint that both reads and
    // writes should require both, not either.
    const missing = required.filter((p) => !roleHasPermission(userRole, p));

    if (missing.length > 0) {
      auditService.log({
        action: AuditAction.UnauthorizedAccess,
        userId: req.user.id,
        severity: AuditSeverity.Warning,
        ipAddress: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: {
          userRole,
          required,
          missing,
          attemptedPath: req.originalUrl,
          method: req.method,
        },
      });

      // Deliberately does not name the missing permission — that would tell an
      // attacker the shape of the permission model.
      throw new AppError('You do not have permission to access this resource.', 403);
    }

    next();
    return Promise.resolve();
  });

// ─────────────────────────────────────────────────────────────────────────────
// Any-Permission Middleware — OR semantics
//
// requirePermission() is AND: every listed permission must be held. Some
// endpoints are legitimately reachable via more than one distinct
// capability — e.g. GET /patients/:id is reachable by a clinician with
// `patient:read:assigned` (row-scoped, checked afterward by
// careRelationship.service) OR by a caller holding the broader
// `patient:read:any`. Modelling that as two permissions on one route would
// force AND semantics (the caller would need both); modelling it as two
// separate routes would duplicate the entire handler. This is the smaller,
// more honest option.
//
// Used sparingly and deliberately — most endpoints should still express a
// single required capability via requirePermission().
// ─────────────────────────────────────────────────────────────────────────────

export const requireAnyPermission = (
  ...acceptable: PermissionName[]
): ReturnType<typeof asyncHandler> =>
  asyncHandler((req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.user === undefined) {
      throw new AppError('Authentication required.', 401);
    }

    const userRole = req.user.roleName as RoleName;

    const holdsAny = acceptable.some((p) => roleHasPermission(userRole, p));

    if (!holdsAny) {
      auditService.log({
        action: AuditAction.UnauthorizedAccess,
        userId: req.user.id,
        severity: AuditSeverity.Warning,
        ipAddress: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: {
          userRole,
          acceptable,
          attemptedPath: req.originalUrl,
          method: req.method,
        },
      });

      throw new AppError('You do not have permission to access this resource.', 403);
    }

    next();
    return Promise.resolve();
  });
