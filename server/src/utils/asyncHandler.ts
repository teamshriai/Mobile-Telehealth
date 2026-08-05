import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Async Route Handler Wrapper
//
// Eliminates try/catch boilerplate in every route handler.
// Any thrown error is forwarded to Express's global error handler.
//
// Usage:
//   router.post('/login', asyncHandler(authController.login));
// ─────────────────────────────────────────────────────────────────────────────

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (fn: AsyncRouteHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
