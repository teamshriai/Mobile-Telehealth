import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { asyncHandler } from '../utils/asyncHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import type { RoleName } from '../types/auth.types';

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
          attemptedPath: req.path,
          method: req.method,
        },
      });

      throw new AppError('You do not have permission to access this resource.', 403);
    }

    next();
    return Promise.resolve();
  });
