import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { medicationPeriod, replacedAt } from '../medicationPeriod';
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

describe('replacedAt — a renewal replaces the course it renews', () => {
  const d = (iso: string): Date => new Date(iso);
  const old = { drugId: 'levo', prescriptionId: 'rx1', signedAt: d('2026-06-26T10:00:00Z') };
  it('a later prescription for the same medicine replaces the earlier line', () => {
    const renewal = { drugId: 'levo', prescriptionId: 'rx2', signedAt: d('2026-06-27T10:00:00Z') };
    assert.equal(replacedAt(old, [old, renewal])?.toISOString(), renewal.signedAt.toISOString());
    assert.equal(replacedAt(renewal, [old, renewal]), null);
  });
  it('the EARLIEST later renewal is the one that replaced it', () => {
    const a = { drugId: 'levo', prescriptionId: 'rx3', signedAt: d('2026-08-01T10:00:00Z') };
    const b = { drugId: 'levo', prescriptionId: 'rx2', signedAt: d('2026-07-01T10:00:00Z') };
    assert.equal(replacedAt(old, [old, a, b])?.toISOString(), b.signedAt.toISOString());
  });
  it('lines on the same prescription never replace each other', () => {
    const sibling = { drugId: 'levo', prescriptionId: 'rx1', signedAt: d('2026-06-26T10:00:00Z') };
    assert.equal(replacedAt(old, [old, sibling]), null);
  });
  it('a different medicine does not replace it', () => {
    const other = { drugId: 'iron', prescriptionId: 'rx2', signedAt: d('2026-07-01T10:00:00Z') };
    assert.equal(replacedAt(old, [old, other]), null);
  });
  it('a replaced course is finished even inside its prescribed duration', () => {
    const p = medicationPeriod(
      old.signedAt,
      180,
      d('2026-07-10T00:00:00Z'),
      d('2026-06-27T10:00:00Z'),
    );
    assert.equal(p.status, 'completed');
    assert.equal(p.replacedAt?.toISOString(), '2026-06-27T10:00:00.000Z');
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
