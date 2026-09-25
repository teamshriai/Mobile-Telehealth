import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// The development OTP outbox.
//
// ⚠️ WHY A FILE AND NOT AN ENDPOINT. Automated tests need the code, and every
// convenient way of giving it to them is a production hole waiting to be
// forgotten: a debug route that survives a deploy, a response field behind an
// `if (dev)`. A file cannot be reached over HTTP at all, so there is no route
// to accidentally expose.
//
// (The demo code `OTP_DEV_FIXED_CODE` is a separate, later decision taken for
// the no-SMS-provider period. It is confined to code generation and refused at
// boot in production — see env.config.ts. The outbox still records every code
// either way, so tests do not depend on which mode is on.)
//
// It also carries password-reset and set-password LINKS when email cannot be
// delivered, for the same reason: the link must reach a developer without
// being printed to a shared terminal or returned over HTTP.
//
// ⚠️ It is gitignored, capped, and REFUSED OUTRIGHT in production — even if
// someone removes the provider configuration. Extracted from sms.service.ts so
// both channels share one adapter rather than duplicating the file writing.
// ─────────────────────────────────────────────────────────────────────────────

const OUTBOX_PATH = path.join(process.cwd(), '.otp-outbox.json');
const OUTBOX_MAX_ENTRIES = 50;

export interface OtpOutboxEntry {
  kind?: 'otp';
  channel: string;
  identifierHash: string;
  code: string;
  challengeId: string;
  createdAt: string;
  expiresAt: string;
}

export interface LinkOutboxEntry {
  kind: 'password-reset' | 'password-setup';
  email: string;
  link: string;
  createdAt: string;
  expiresAt: string;
}

type OutboxEntry = OtpOutboxEntry | LinkOutboxEntry;

/** Returns false in production, or if the file could not be written. */
export function writeToOutbox(entry: OutboxEntry): boolean {
  if (env.NODE_ENV === 'production') {
    console.error('[otp] refusing to write the development outbox in production.');
    return false;
  }
  try {
    let existing: OutboxEntry[] = [];
    if (fs.existsSync(OUTBOX_PATH)) {
      const parsed: unknown = JSON.parse(fs.readFileSync(OUTBOX_PATH, 'utf8'));
      if (Array.isArray(parsed)) existing = parsed as OutboxEntry[];
    }
    // Newest first, capped — a development convenience, not a log.
    const next = [entry, ...existing].slice(0, OUTBOX_MAX_ENTRIES);
    fs.writeFileSync(OUTBOX_PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
    return true;
  } catch (err) {
    console.warn('[otp] could not write the development outbox:', (err as Error).message);
    return false;
  }
}
