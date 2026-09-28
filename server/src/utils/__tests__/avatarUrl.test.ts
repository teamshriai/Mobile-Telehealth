import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { avatarUrl } from '../avatarUrl';

// Run with: npx tsx --test src/utils/__tests__/avatarUrl.test.ts
//
// The portrait key a doctor can type is untrusted. These cases pin down that
// only our own self-hosted portraits ever reach a patient's page.

describe('avatarUrl', () => {
  test('builds the self-hosted URL for a valid key', () => {
    assert.equal(avatarUrl('doctors/priya-nair.webp'), '/avatars/doctors/priya-nair.webp');
    assert.equal(
      avatarUrl('patients/meenakshi-subramaniam.webp'),
      '/avatars/patients/meenakshi-subramaniam.webp',
    );
    assert.equal(avatarUrl('  doctors/rohit-desai.webp  '), '/avatars/doctors/rohit-desai.webp');
  });

  test('nothing is returned for a missing value', () => {
    assert.equal(avatarUrl(null), null);
    assert.equal(avatarUrl(undefined), null);
    assert.equal(avatarUrl(''), null);
  });

  test('anything that is not a known-safe key becomes null', () => {
    for (const unsafe of [
      'https://tracker.example/pixel.webp',
      '//evil.example/doctors/a.webp',
      'javascript:alert(1)',
      'data:image/webp;base64,AAAA',
      '/avatars/doctors/priya-nair.webp', // a URL, not a key
      'doctors/../../etc/passwd.webp',
      'doctors/Priya-Nair.webp', // upper case
      'doctors/priya nair.webp',
      'doctors/priya-nair.png',
      'doctors/priya-nair.webp?x=1',
      'staff/priya-nair.webp',
      'doctors/-leading.webp',
      'doctors/trailing-.webp',
      'doctors/.webp',
    ]) {
      assert.equal(avatarUrl(unsafe), null, unsafe);
    }
  });
});
