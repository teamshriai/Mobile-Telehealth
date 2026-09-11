import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateShriPatientId, isValidShriPatientId, normalizeShriPatientId } from '../shriId';

// ─────────────────────────────────────────────────────────────────────────────
// SHRI-AI Patient ID — pure-function tests
//
// Run with: npx tsx --test src/utils/__tests__/shriId.test.ts
//
// This and identityScoring.test.ts are the two files in the codebase this
// phase deliberately added test coverage for (using node:test — built into
// Node 20, zero new dependency) rather than leaving as scratch scripts. Both
// are pure functions with exact expected outputs, and both are precisely the
// kind of logic that rots silently without a check: a checksum or a scoring
// table that "looks right" but is subtly wrong (as an earlier version of the
// checksum here was — see the corruption-detection test below) is not
// something a manual smoke test reliably catches.
// ─────────────────────────────────────────────────────────────────────────────

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

describe('generateShriPatientId', () => {
  test('produces the documented format: SHRI-XXXXXX-C', () => {
    const id = generateShriPatientId();
    assert.match(id, /^SHRI-[0-9A-HJKMNP-TV-Z]{6}-[0-9A-HJKMNP-TV-Z]$/);
  });

  test('never contains the excluded ambiguous characters I, L, O, U in the generated payload/checksum', () => {
    // Check only the payload + check character — NOT the fixed "SHRI" prefix,
    // which legitimately contains an I. The earlier version of this test
    // incorrectly scanned the whole string including the prefix.
    for (let i = 0; i < 500; i++) {
      const id = generateShriPatientId();
      const [, payloadAndCheck] = id.match(/^SHRI-(.+)$/) ?? [];
      assert.ok(payloadAndCheck, `unexpected id shape: ${id}`);
      assert.doesNotMatch(
        payloadAndCheck,
        /[ILOU]/,
        `generated id's payload/checksum contained an excluded character: ${id}`,
      );
    }
  });

  test('every generated id passes its own checksum', () => {
    for (let i = 0; i < 5000; i++) {
      const id = generateShriPatientId();
      assert.equal(isValidShriPatientId(id), true, `${id} failed its own checksum`);
    }
  });

  test('collision rate matches the expected birthday-paradox math at 32^6 space', () => {
    // At n draws from a space of size N, expected collisions ≈ n²/(2N).
    // For n=50,000 and N=32^6≈1.073B, expected ≈ 1.16. Assert it stays in a
    // sane range rather than pinning an exact number, since this is
    // inherently probabilistic.
    const n = 50_000;
    const seen = new Set<string>();
    let collisions = 0;
    for (let i = 0; i < n; i++) {
      const id = generateShriPatientId();
      if (seen.has(id)) collisions++;
      seen.add(id);
    }
    // Generous upper bound (10x expected) — this is a sanity check against a
    // badly broken RNG or a shrunk keyspace, not a tight statistical test.
    assert.ok(
      collisions < 20,
      `saw ${collisions} collisions in ${n} draws — keyspace may be smaller than intended`,
    );
  });
});

describe('isValidShriPatientId', () => {
  test('rejects a malformed string outright', () => {
    assert.equal(isValidShriPatientId('not-an-id'), false);
    assert.equal(isValidShriPatientId(''), false);
    assert.equal(isValidShriPatientId('SHRI-ABC-1'), false); // payload too short
  });

  test('rejects a well-formed id with a tampered check character', () => {
    const id = generateShriPatientId();
    const wrongCheckChar = ALPHABET[(ALPHABET.indexOf(id.slice(-1)) + 1) % 32];
    const tampered = id.slice(0, -1) + wrongCheckChar;
    assert.equal(isValidShriPatientId(tampered), false);
  });

  test('catches 100% of single-character substitutions in the payload (measured)', () => {
    const SAMPLE = 2000;
    let caught = 0;
    for (let i = 0; i < SAMPLE; i++) {
      const id = generateShriPatientId();
      const chars = id.split('');
      const payloadIndex = 5 + Math.floor(Math.random() * 6); // "SHRI-" is 5 chars
      let replacement: string;
      do {
        replacement = ALPHABET[Math.floor(Math.random() * 32)];
      } while (replacement === chars[payloadIndex]);
      chars[payloadIndex] = replacement;
      const corrupted = chars.join('');
      if (!isValidShriPatientId(corrupted)) caught++;
    }
    assert.equal(caught, SAMPLE, 'a single-character substitution slipped past the checksum');
  });

  test('catches the large majority of adjacent transpositions (measured, not guaranteed 100%)', () => {
    // Documented honestly in shriId.ts: a weighted-sum checksum cannot
    // mathematically guarantee catching every transposition. This asserts
    // the measured floor rather than an unachievable 100%.
    const SAMPLE = 3000;
    let caught = 0;
    let comparable = 0;
    for (let i = 0; i < SAMPLE; i++) {
      const id = generateShriPatientId();
      const chars = id.split('');
      const pos = 5 + Math.floor(Math.random() * 5);
      if (chars[pos] === chars[pos + 1]) continue; // swapping identical chars isn't an error
      comparable++;
      [chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]];
      if (!isValidShriPatientId(chars.join(''))) caught++;
    }
    const rate = caught / comparable;
    assert.ok(
      rate > 0.85,
      `transposition catch rate ${(rate * 100).toFixed(1)}% fell below the 85% floor`,
    );
  });
});

describe('normalizeShriPatientId', () => {
  test('uppercases and trims', () => {
    assert.equal(normalizeShriPatientId('  shri-abc123-9  '), 'SHRI-ABC123-9');
  });
});
