import { Router } from 'express';
import {
  register,
  login,
  requestOtp,
  verifyOtp,
  logout,
  refresh,
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
  loginLimiter,
  loginSlowDown,
  refreshLimiter,
  forgotPasswordLimiter,
  verifyTokenLimiter,
  resetPasswordLimiter,
  otpRequestPerIdentifierLimiter,
  otpRequestPerIpLimiter,
  otpVerifyPerChallengeLimiter,
  otpVerifyPerIpLimiter,
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
router.post('/login', loginSlowDown, loginLimiter, login);

// Refresh is public — the caller has no valid access token by definition.
// Authentication comes from the httpOnly refresh cookie. Rate-limited because
// it is an unauthenticated endpoint that performs database writes.
// ── Mobile OTP login ────────────────────────────────────────────────────────
// ⚠️ TWO LIMITERS EACH, per-identity AND per-IP, and a request must satisfy
// both. See the long note in middleware/rateLimiter.ts: a single combined
// bucket is bypassed by varying whichever component is cheapest for the
// attacker, so the axes are kept independent on purpose.
router.post('/otp/request', otpRequestPerIpLimiter, otpRequestPerIdentifierLimiter, requestOtp);
router.post('/otp/verify', otpVerifyPerIpLimiter, otpVerifyPerChallengeLimiter, verifyOtp);

router.post('/refresh', refreshLimiter, refresh);

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
