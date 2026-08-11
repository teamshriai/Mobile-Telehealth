import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authService } from '../auth/auth.service';
import { hash, verify } from '@node-rs/argon2';

async function runTests() {
  console.log('--- Starting Password Reset Security & Integration Suite ---');
  const testEmail = `test_reset_${Date.now()}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'NewSecurePassword456!';

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
  console.log('✔ Test user created:', user.id);

  // Test 1: forgotPassword generates 32-byte raw token and stores SHA-256 hash
  const res = await authService.forgotPassword(
    { email: testEmail },
    { ipAddress: '127.0.0.1' },
  );

  if (!res.token || res.token.length !== 64) {
    throw new Error('Test 1 Failed: Token not generated or length mismatch');
  }
  const expectedHash = crypto.createHash('sha256').update(res.token).digest('hex');
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: expectedHash },
  });
  if (!tokenRecord || tokenRecord.userId !== user.id) {
    throw new Error('Test 1 Failed: Token hash record not stored correctly in PostgreSQL');
  }
  console.log('✔ Test 1 Passed: 32-byte raw token generated and SHA-256 stored in DB');

  // Test 2: forgotPassword non-existent email anti-enumeration
  const nonExistentRes = await authService.forgotPassword(
    { email: 'nonexistent_account_987@example.com' },
    { ipAddress: '127.0.0.1' },
  );
  if (nonExistentRes.token !== null) {
    throw new Error('Test 2 Failed: Token generated for non-existent user!');
  }
  console.log('✔ Test 2 Passed: Anti-enumeration generic response working');

  // Test 3: verifyResetToken
  const validCheck = await authService.verifyResetToken({ token: res.token });
  const invalidCheck = await authService.verifyResetToken({ token: 'a'.repeat(64) });
  if (!validCheck.valid || invalidCheck.valid) {
    throw new Error('Test 3 Failed: verifyResetToken returned unexpected status');
  }
  console.log('✔ Test 3 Passed: Token verification correctly distinguishes valid vs invalid');

  // Test 4: resetPassword updates Argon2id hash & invalidates token
  await authService.resetPassword(
    { token: res.token, password: newPassword },
    { ipAddress: '127.0.0.1' },
  );
  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  const isNewPasswordValid = await verify(updatedUser!.passwordHash, newPassword);
  if (!isNewPasswordValid || !updatedUser?.passwordChangedAt) {
    throw new Error('Test 4 Failed: New password or passwordChangedAt timestamp not set');
  }

  // Reuse check
  let errorThrown = false;
  try {
    await authService.resetPassword(
      { token: res.token, password: 'AnotherPassword789!' },
      { ipAddress: '127.0.0.1' },
    );
  } catch {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('Test 4 Failed: Token was reused!');
  }
  console.log('✔ Test 4 Passed: Argon2id hash updated & single-use token invalidated');

  // Cleanup test user
  await prisma.user.delete({ where: { id: user.id } });
  console.log('✔ Cleaned up test data');
  console.log('--- ALL SECURITY & INTEGRATION TESTS PASSED ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test Runner Failed:', err);
  process.exit(1);
});
