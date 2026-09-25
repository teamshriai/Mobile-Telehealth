import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { passwordLinkFor } from '../passwordLinkDelivery';
import { env } from '../../config/env.config';

// The link shape is the contract with `client/src/components/auth/ResetPassword.tsx`,
// which reads `token` and, for an invitation, `setup=1`.

describe('passwordLinkFor', () => {
  const token = 'a'.repeat(64);

  it('a reset link carries only the token', () => {
    assert.equal(passwordLinkFor('password-reset', token), `${env.CLIENT_URL}/reset-password?token=${token}`);
  });

  it('a setup link is the same consumer, marked as an invitation', () => {
    const url = new URL(passwordLinkFor('password-setup', token));
    assert.equal(url.pathname, '/reset-password');
    assert.equal(url.searchParams.get('token'), token);
    assert.equal(url.searchParams.get('setup'), '1');
  });
});
