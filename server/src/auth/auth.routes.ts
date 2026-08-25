import { Router } from 'express';
import {
  register,
  login,
  logout,
  me,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
  deleteAccount,
} from './auth.controller';
import { authenticate } from '../middleware/authenticate';
import {
  authLimiter,
  authSlowDown,
  forgotPasswordLimiter,
  verifyTokenLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimiter';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Router
//
// Public routes  : rate-limited + slow-down to resist brute force
// Protected routes: authenticate middleware validates JWT first
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/register', authSlowDown, authLimiter, register);
router.post('/login', authSlowDown, authLimiter, login);

// Forgot / verify token / reset password — rate-limited to prevent abuse
router.post('/forgot-password', authSlowDown, forgotPasswordLimiter, forgotPassword);
router.post('/verify-reset-token', verifyTokenLimiter, verifyResetToken);
router.post('/reset-password', authSlowDown, resetPasswordLimiter, resetPassword);

// ── Protected ────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
// Reuses the auth rate limiters — this is exactly the kind of credential
// operation they exist to slow down.
router.patch('/password', authSlowDown, authLimiter, authenticate, changePassword);
router.delete('/account', authSlowDown, authLimiter, authenticate, deleteAccount);

export { router as authRouter };
