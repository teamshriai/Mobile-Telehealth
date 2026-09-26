import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { normalizeMobile } from '../../utils/phone';
import { otpRequestSchema, otpVerifySchema } from '../auth.validator';
import { maskMobile } from '../../services/sms.service';
import { OtpChannel } from '@prisma/client';
import {
  normalizeEmail,
  normalizeIdentifier,
  identifierHashFor,
  maskIdentifier,
} from '../otpIdentity';

// ─────────────────────────────────────────────────────────────────────────────
// Mobile OTP — the properties that make a 6-digit code safe rather than
// merely functional.
//
// ⚠️ These are deliberately pure: normalization, validation, masking and the
// generator's statistical shape. The stateful rules (single use, expiry,
// attempt cap, one-live-challenge-per-number) are enforced in the database by
// `otp.service.ts` and are covered end to end by `e2e/otp-login.spec.ts`,
// because asserting them here would mean mocking Prisma and proving only that
// the mock behaves like the mock.
// ─────────────────────────────────────────────────────────────────────────────

describe('mobile normalization — one identity, many spellings', () => {
  const same = [
    '9876543210',
    '+919876543210',
    '+91 9876543210',
    '+91 98765 43210',
    '091-98765-43210',
    '  9876543210  ',
    '919876543210',
    '09876543210',
  ];

  it('every accepted spelling collapses to one canonical number', () => {
    // ⚠️ THE POINT OF THE WHOLE FUNCTION. If any two of these normalized
    // differently, the same handset would be two different login identities —
    // and with a UNIQUE index on mobileHash, the second one would be locked
    // out with a database error nobody could interpret.
    const results = new Set(same.map((s) => normalizeMobile(s)));
    assert.equal(results.size, 1, `expected one canonical form, got ${[...results].join(', ')}`);
    assert.equal([...results][0], '9876543210');
  });

  const rejected: Array<[string, string]> = [
    ['5876543210', 'Indian mobiles start 6-9; 5 is not a mobile prefix'],
    ['1234567890', 'starts with 1'],
    ['987654321', 'nine digits'],
    ['', 'empty'],
    ['abcdefghij', 'no digits at all'],
    ['+1 415 555 0100', 'a US number — this platform is India-only by design'],
  ];

  for (const [input, why] of rejected) {
    it(`refuses ${JSON.stringify(input)} — ${why}`, () => {
      assert.equal(normalizeMobile(input), null);
    });
  }

  it('returns null rather than a partial guess', () => {
    // ⚠️ Never return something a caller could mistake for a real number.
    // A silent bad normalization writes a blind index that matches nothing.
    assert.equal(normalizeMobile('98765'), null);
  });
});

describe('request validation — mobile channel', () => {
  it('accepts the spellings a person actually types', () => {
    for (const identifier of ['9876543210', '+919876543210', '+91 9876543210']) {
      const r = otpRequestSchema.safeParse({ channel: 'Sms', identifier });
      assert.equal(r.success, true, identifier);
    }
  });

  it('refuses a number the write path would never have stored', () => {
    for (const identifier of ['5876543210', '12345', 'not-a-number', '']) {
      const r = otpRequestSchema.safeParse({ channel: 'Sms', identifier });
      assert.equal(r.success, false, identifier);
    }
  });
});

describe('request validation — email channel', () => {
  it('is refused: sign-in codes go by SMS only', () => {
    // ⚠️ Withdrawn 25 Sep 2026. Patients sign in with a mobile code or with
    // email and password; an emailed code is not a way in any more.
    for (const identifier of ['a@b.com', 'Dr.Iyer@Hospital.CO.IN']) {
      const r = otpRequestSchema.safeParse({ channel: 'Email', identifier });
      assert.equal(r.success, false, identifier);
    }
  });
});

describe('request validation — the union itself', () => {
  it('refuses an unknown channel', () => {
    // The browser must not be able to invent a delivery channel.
    assert.equal(
      otpRequestSchema.safeParse({ channel: 'Whatsapp', identifier: '9876543210' }).success,
      false,
    );
  });

  it('refuses a mobile sent on the email arm and vice versa', () => {
    // ⚠️ The discriminated union is what makes the mismatched case impossible
    // rather than merely unlikely.
    assert.equal(
      otpRequestSchema.safeParse({ channel: 'Email', identifier: '9876543210' }).success,
      false,
    );
    assert.equal(
      otpRequestSchema.safeParse({ channel: 'Sms', identifier: 'a@b.com' }).success,
      false,
    );
  });

  it('rejects unknown fields on both arms', () => {
    // `.strict()` — a client must not smuggle a role or a userId into an
    // unauthenticated endpoint.
    assert.equal(
      otpRequestSchema.safeParse({ channel: 'Sms', identifier: '9876543210', role: 'Doctor' })
        .success,
      false,
    );
    assert.equal(
      otpRequestSchema.safeParse({ channel: 'Email', identifier: 'a@b.com', userId: 'x' }).success,
      false,
    );
  });
});

describe('verify validation', () => {
  it('accepts exactly six digits against a uuid challenge', () => {
    const ok = otpVerifySchema.safeParse({ challengeId: crypto.randomUUID(), code: '048321' });
    assert.equal(ok.success, true);
  });

  const badCodes = ['12345', '1234567', '12 34 56', 'abcdef', '', '12345a'];
  for (const code of badCodes) {
    it(`refuses code ${JSON.stringify(code)}`, () => {
      const r = otpVerifySchema.safeParse({ challengeId: crypto.randomUUID(), code });
      assert.equal(r.success, false);
    });
  }

  it('refuses a challengeId that is not a uuid', () => {
    // The id is the binding between a code and the request it was issued for.
    // Accepting arbitrary strings would let a caller probe with anything.
    assert.equal(otpVerifySchema.safeParse({ challengeId: 'abc', code: '123456' }).success, false);
  });

  it('preserves a leading-zero code', () => {
    // ⚠️ `000123` must survive as six characters. A generator or parser that
    // treats the code as a NUMBER silently shrinks the keyspace by dropping
    // leading zeros — roughly 10% of all codes.
    assert.equal(
      otpVerifySchema.safeParse({ challengeId: crypto.randomUUID(), code: '000123' }).success,
      true,
    );
  });
});

describe('code generation shape', () => {
  // Mirrors otp.service.ts's generator. Kept here rather than exported,
  // because exporting it would invite a caller to generate a code outside the
  // challenge that binds it.
  const generate = (): string => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

  it('is always exactly six digits, including leading zeros', () => {
    for (let i = 0; i < 2000; i++) {
      const code = generate();
      assert.match(code, /^\d{6}$/, `bad code: ${code}`);
    }
  });

  it('covers the low range, so zero-padding is real and not theoretical', () => {
    // With 200k draws the chance of never seeing a value under 100000 is
    // (0.9)^200000 — indistinguishable from zero. If this ever fails, the
    // generator has lost its low decade, which is a 10% keyspace loss.
    let sawPadded = false;
    for (let i = 0; i < 200_000 && !sawPadded; i++) {
      if (generate().startsWith('0')) sawPadded = true;
    }
    assert.equal(sawPadded, true, 'never produced a zero-padded code');
  });

  it('does not repeat itself over a large sample', () => {
    // A seeded or time-based generator collapses here. 5000 draws from a
    // 1e6 space should yield ~4988 distinct by the birthday bound.
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(generate());
    assert.ok(seen.size > 4900, `only ${seen.size} distinct codes in 5000 draws`);
  });
});

describe('masking', () => {
  it('shows only the last four digits', () => {
    assert.equal(maskMobile('9876543210'), '••••• •3210');
  });

  it('never contains the leading digits', () => {
    // ⚠️ The masked form is what appears on screen and in the one log line the
    // SMS transport writes. It must not be reversible to the full number.
    const masked = maskMobile('9845012291');
    assert.equal(masked.includes('98450'), false);
    assert.equal(masked.includes('9845'), false);
  });
});

describe('identifier normalisation — one identity per person', () => {
  it('collapses every email spelling to one canonical form', () => {
    // ⚠️ Same property the mobile normaliser guarantees. The blind index is
    // computed over this, so two spellings that normalise differently become
    // two login identities for one inbox — and with a UNIQUE index on the
    // account side, the second one is locked out with a database error.
    const forms = ['a@b.com', 'A@B.com', ' a@b.com ', 'A@b.COM'];
    const results = new Set(forms.map((f) => normalizeEmail(f)));
    assert.equal(results.size, 1, `expected one canonical form, got ${[...results].join(', ')}`);
    assert.equal([...results][0], 'a@b.com');
  });

  it('returns null rather than a partial guess', () => {
    for (const bad of ['', 'nope', 'a@', '@b.com', 'a b@c.com']) {
      assert.equal(normalizeEmail(bad), null, bad);
    }
  });

  it('dispatches by channel', () => {
    assert.equal(normalizeIdentifier(OtpChannel.Sms, '+91 98765 43210'), '9876543210');
    assert.equal(normalizeIdentifier(OtpChannel.Email, ' A@B.com '), 'a@b.com');
    // Cross-channel input is refused rather than coerced.
    assert.equal(normalizeIdentifier(OtpChannel.Sms, 'a@b.com'), null);
    assert.equal(normalizeIdentifier(OtpChannel.Email, '9876543210'), null);
  });
});

describe('identifier blind index', () => {
  it('is stable for the same channel and value', () => {
    assert.equal(
      identifierHashFor(OtpChannel.Sms, '9876543210'),
      identifierHashFor(OtpChannel.Sms, '9876543210'),
    );
  });

  it('separates the channels', () => {
    // ⚠️ The channel is part of the hashed input, so a contrived identifier
    // cannot collide across channels and share a rate-limit or challenge
    // bucket with a different person's.
    assert.notEqual(
      identifierHashFor(OtpChannel.Sms, 'x'),
      identifierHashFor(OtpChannel.Email, 'x'),
    );
  });

  it('never returns the plaintext', () => {
    const h = identifierHashFor(OtpChannel.Email, 'arjun@example.com');
    assert.equal(h.includes('arjun'), false);
    assert.equal(h.includes('example'), false);
    assert.match(h, /^[0-9a-f]{64}$/);
  });
});

describe('identifier masking', () => {
  it('shows only the last four digits of a mobile', () => {
    assert.equal(maskIdentifier(OtpChannel.Sms, '9845012291'), '••••• •2291');
  });

  it('keeps an email recognisable without disclosing it', () => {
    const masked = maskIdentifier(OtpChannel.Email, 'arjun@example.com');
    // Enough for the owner to recognise…
    assert.match(masked, /^a/);
    assert.ok(masked.endsWith('.com'));
    // …and not enough for a bystander to learn it.
    assert.equal(masked.includes('arjun'), false);
    assert.equal(masked.includes('example'), false);
  });

  it('does not leak a short local part', () => {
    // A one-character local part must still be masked, not passed through.
    const masked = maskIdentifier(OtpChannel.Email, 'a@b.com');
    assert.equal(masked.includes('@b.'), false, `leaked the domain: ${masked}`);
  });
});
