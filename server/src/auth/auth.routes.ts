import { Router } from 'express';
import { register, login, logout, me } from './auth.controller';
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

// ── Protected ────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export { router as authRouter };
