import { Router } from 'express';
import { register, login, logout, me, forgotPassword, resetPassword } from './auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authLimiter, authSlowDown } from '../middleware/rateLimiter';

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

// Forgot/reset password — rate-limited to prevent abuse
router.post('/forgot-password', authSlowDown, authLimiter, forgotPassword);
router.post('/reset-password', authSlowDown, authLimiter, resetPassword);

// ── Protected ────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export { router as authRouter };
