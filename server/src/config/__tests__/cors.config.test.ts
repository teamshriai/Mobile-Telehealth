import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateNetworkOrigin } from '../cors.config';

// ─────────────────────────────────────────────────────────────────────────────
// LAN hosting — the private-network origin predicate.
//
// ⚠️ WHY THIS FILE EXISTS. This predicate widens CORS. A mistake here is not a
// rendering bug, it is an authenticated API accepting requests from an origin
// that should never have reached it — so the cases that matter most are the
// ones that must be REFUSED, and there are more of those below than accepted
// ones on purpose.
//
// Two traps this pins:
//
//  1. **Substring matching.** `http://192.168.1.5.evil.com` contains a private
//     address. A regex over the raw origin string finds it and passes. The
//     implementation parses with `URL` and reads `hostname`, which cannot be
//     fooled that way — this file fails if anyone "simplifies" it back.
//  2. **The 172 block is 172.16–172.31, not all of 172.** 172.15 and 172.32
//     are public internet addresses.
//
// ⚠️ NOTE WHAT THIS DOES NOT TEST: that the predicate is gated on
// NODE_ENV !== 'production'. That guard lives in `corsOptions.origin` and is
// the actual safety property — this function answering "yes" is only ever
// allowed to matter outside production.
// ─────────────────────────────────────────────────────────────────────────────

describe('isPrivateNetworkOrigin — accepted', () => {
  const accepted = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.1.2.3:5173',
    'http://[::1]:3000',
    'http://10.0.0.5:3000',
    'http://10.255.255.254:3000',
    'http://192.168.1.42:3000',
    'http://192.168.0.1:5173',
    'http://172.16.0.1:3000',
    'http://172.31.255.254:3000',
    'http://172.20.10.3:3000', // iPhone hotspot range
    'https://192.168.1.42:3000', // https on a LAN is unusual but not wrong
    'http://macbook-pro.local:3000', // mDNS, which is how Macs advertise
  ];

  for (const origin of accepted) {
    it(`accepts ${origin}`, () => {
      assert.equal(isPrivateNetworkOrigin(origin), true);
    });
  }
});

describe('isPrivateNetworkOrigin — refused', () => {
  const refused: Array<[string, string]> = [
    // ⚠️ The substring attack. Each of these CONTAINS a private address.
    ['http://192.168.1.5.evil.com', 'private address as a subdomain label'],
    ['http://10.0.0.1.attacker.io', 'private address as a subdomain label'],
    ['http://evil.com/192.168.1.1', 'private address in the path'],
    ['http://evil.com#192.168.1.1', 'private address in the fragment'],
    ['http://evil.com?h=192.168.1.1', 'private address in the query'],
    ['http://user@192.168.1.1.evil.com', 'private address before a userinfo @'],

    // ⚠️ 172 is only private from .16 to .31.
    ['http://172.15.0.1:3000', '172.15 is a public address'],
    ['http://172.32.0.1:3000', '172.32 is a public address'],
    ['http://172.9.0.1:3000', '172.9 is a public address'],

    // Neighbouring ranges that look private and are not.
    ['http://11.0.0.1:3000', '11/8 is public'],
    ['http://192.169.1.1:3000', '192.169 is public'],
    ['http://193.168.1.1:3000', '193.168 is public'],

    // Public hosts, plainly.
    ['https://stroke-ai.org', 'the production site is not a LAN host'],
    ['https://example.com', 'an ordinary public origin'],

    // Non-http schemes.
    ['file://192.168.1.1', 'file: is not a browser origin we serve'],
    ['ftp://192.168.1.1', 'ftp: is not http'],
    ['javascript:alert(1)', 'not a URL with a host at all'],

    // Malformed.
    ['not-a-url', 'unparseable'],
    ['', 'empty'],
    ['null', 'the literal string browsers send for opaque origins'],
  ];

  for (const [origin, why] of refused) {
    it(`refuses ${JSON.stringify(origin)} — ${why}`, () => {
      assert.equal(isPrivateNetworkOrigin(origin), false);
    });
  }
});
