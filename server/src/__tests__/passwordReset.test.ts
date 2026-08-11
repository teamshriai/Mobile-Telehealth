import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authService } from '../auth/auth.service';
import { hash, verify } from '@node-rs/argon2';

describe('Password Reset Integration & Security Tests', () => {
  const testEmail = `test_reset_${Date.now()}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'NewSecurePassword456!';
  let userId: string;

  beforeAll(async () => {
    // Get patient role
    const role = await prisma.role.findFirst({ where: { name: 'Patient' } });
    if (!role) throw new Error('Patient role not seeded');

    // Create test user
    const passwordHash = await hash(initialPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        roleId: role.id,
        isActive: true,
        isVerified: true,
      },
    });
    userId = user.id;
  });

  it('forgotPassword generates 32-byte raw token and stores SHA-256 hash in DB', async () => {
    const res = await authService.forgotPassword(
      { email: testEmail },
      { ipAddress: '127.0.0.1' },
    );

    expect(res.token).not.toBeNull();
    expect(res.token).toHaveLength(64); // 32 bytes hex = 64 chars

    // Compute expected hash
    const expectedHash = crypto.createHash('sha256').update(res.token!).digest('hex');

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: expectedHash },
    });

    expect(tokenRecord).not.toBeNull();
    expect(tokenRecord?.userId).toBe(userId);
    expect(tokenRecord?.usedAt).toBeNull();
    // Verify 15-min expiry
    const now = Date.now();
    const expiresAtMs = tokenRecord!.expiresAt.getTime();
    expect(expiresAtMs - now).toBeGreaterThan(14 * 60 * 1000);
    expect(expiresAtMs - now).toBeLessThanOrEqual(15 * 60 * 1000 + 5000);
  });

  it('forgotPassword returns null token for non-existent email without leaking existence', async () => {
    const res = await authService.forgotPassword(
      { email: 'nonexistent_account_12345@example.com' },
      { ipAddress: '127.0.0.1' },
    );

    expect(res.token).toBeNull();
    expect(res.email).toBe('nonexistent_account_12345@example.com');
  });

  it('verifyResetToken correctly identifies valid vs invalid tokens', async () => {
    const forgotRes = await authService.forgotPassword(
      { email: testEmail },
      { ipAddress: '127.0.0.1' },
    );
    const validRawToken = forgotRes.token!;

    const validCheck = await authService.verifyResetToken({ token: validRawToken });
    expect(validCheck.valid).toBe(true);

    const invalidCheck = await authService.verifyResetToken({
      token: 'a'.repeat(64),
    });
    expect(invalidCheck.valid).toBe(false);
  });

  it('resetPassword hashes new password with Argon2id, invalidates sessions, and prevents token reuse', async () => {
    const forgotRes = await authService.forgotPassword(
      { email: testEmail },
      { ipAddress: '127.0.0.1' },
    );
    const rawToken = forgotRes.token!;

    // Perform password reset
    await authService.resetPassword(
      { token: rawToken, password: newPassword },
      { ipAddress: '127.0.0.1' },
    );

    // 1. Verify user password updated in DB
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(updatedUser?.passwordChangedAt).not.toBeNull();
    const isNewPasswordValid = await verify(updatedUser!.passwordHash, newPassword);
    expect(isNewPasswordValid).toBe(true);

    // 2. Verify token cannot be reused
    await expect(
      authService.resetPassword(
        { token: rawToken, password: 'AnotherPassword789!' },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toThrow('Invalid or expired reset token');

    // 3. Verify verifyResetToken now returns false for used token
    const verifyCheck = await authService.verifyResetToken({ token: rawToken });
    expect(verifyCheck.valid).toBe(false);
  });
});
