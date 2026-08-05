// ─────────────────────────────────────────────────────────────────────────────
// Express Request Type Augmentation
//
// Extends the default Express Request interface to include:
//  - req.user     : populated by authenticate middleware after JWT verification
//  - req.requestId: unique UUID per request for tracing
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roleId: string;
        roleName: string;
      };
      requestId?: string;
    }
  }
}

export {};
