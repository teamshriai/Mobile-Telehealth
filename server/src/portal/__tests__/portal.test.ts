import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { medicationPeriod } from '../medicationPeriod';
import { frequencyInWords, routeInWords } from '../plainLanguage';
import { decryptBuffer, encryptBuffer } from '../../utils/encryption';

const DAY = 86_400_000;

describe('medicationPeriod — current vs finished, derived only from the prescription', () => {
  const signed = new Date('2026-09-01T10:00:00Z');
  it('a 7-day course covers the signing day plus six', () => {
    const p = medicationPeriod(signed, 7, new Date(signed.getTime() + 6 * DAY));
    assert.equal(p.status, 'current');
    assert.equal(p.endsAt?.toISOString(), new Date(signed.getTime() + 6 * DAY).toISOString());
  });
  it('the day after the last day, it is finished', () => {
    assert.equal(
      medicationPeriod(signed, 7, new Date(signed.getTime() + 7 * DAY + 1)).status,
      'completed',
    );
  });
  it('no duration means ongoing, with no invented end date', () => {
    const p = medicationPeriod(signed, null, new Date(signed.getTime() + 900 * DAY));
    assert.equal(p.status, 'current');
    assert.equal(p.endsAt, null);
  });
});

describe('plain-language labels — presentation only, never guessed', () => {
  it('translates the shorthand the seeded clinic actually uses', () => {
    assert.equal(frequencyInWords('OD'), 'Once a day');
    assert.equal(frequencyInWords('bd'), 'Twice a day');
    assert.equal(frequencyInWords('TDS'), 'Three times a day');
    assert.equal(frequencyInWords('QDS'), 'Four times a day');
    assert.equal(routeInWords('SC'), 'Injection under the skin');
    assert.equal(routeInWords('Oral'), 'By mouth');
  });
  it('an unknown value is shown as written, not translated', () => {
    assert.equal(frequencyInWords('Every 36 hours'), 'Every 36 hours');
  });
});

describe('encryptBuffer — voice-note audio at rest', () => {
  const audio = Buffer.from('RIFF....WAVEfmt pretend audio bytes');
  it('round-trips under the same storage key', () => {
    assert.deepEqual(decryptBuffer(encryptBuffer(audio, 'a'.repeat(32)), 'a'.repeat(32)), audio);
  });
  it('the ciphertext does not contain the plaintext', () => {
    assert.equal(encryptBuffer(audio, 'k').includes(Buffer.from('RIFF')), false);
  });
  it('a file moved under ANOTHER storage key refuses to decrypt', () => {
    assert.throws(() => decryptBuffer(encryptBuffer(audio, 'a'.repeat(32)), 'b'.repeat(32)));
  });
  it('a single flipped byte refuses to decrypt', () => {
    const c = encryptBuffer(audio, 'k');
    c[c.length - 1] ^= 1;
    assert.throws(() => decryptBuffer(c, 'k'));
  });
});
