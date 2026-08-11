import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { authRepository } from '../auth/auth.repository';
import { AppError } from './errorHandler';
import { asyncHandler } from '../utils/asyncHandler';

// ─────────────────────────────────────────────────────────────────────────────
// Authenticate Middleware
//
// 1. Extracts Bearer token from Authorization header.
// 2. Verifies signature and expiry via verifyAccessToken().
//    On failure: JsonWebTokenError / TokenExpiredError propagate to errorHandler.
// 3. Fetches user from DB on every request — validates the account still
//    exists, is active, and has not been soft-deleted.
//    This step prevents stale tokens from working after account changes.
// 4. Attaches typed req.user for downstream handlers.
//
// SECURITY NOTES:
// - Token is extracted only from the Authorization header — never from query params.
//   Query params are logged by servers/proxies, which would leak the token.
// - Role is re-read from DB here so it always reflects the current state.
// ─────────────────────────────────────────────────────────────────────────────

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Provide a Bearer token.', 401);
    }

    // Extract token — substring(7) removes 'Bearer ' prefix
    const token = authHeader.substring(7);

    if (token.length === 0) {
      throw new AppError('Authentication token is missing.', 401);
    }

    // Verify signature + expiry. Throws on failure — caught by asyncHandler → errorHandler.
    const payload = verifyAccessToken(token);

    // Re-validate against DB: ensures deactivated or deleted accounts cannot use old tokens
    const user = await authRepository.findById(payload.sub);

    if (user === null) {
      throw new AppError('Account not found.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated.', 401);
    }

    // Invalidate sessions issued before the latest password change
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedTime = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < passwordChangedTime) {
        throw new AppError('Session invalidated due to password change. Please sign in again.', 401);
      }
    }

    // Attach typed user context to request
    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
    };

    next();
  },
);
