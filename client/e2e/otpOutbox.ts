import fs from 'node:fs'
import path from 'node:path'

/**
 * Reads the development outbox: OTP codes, and password-reset / set-password
 * links that could not be emailed.
 *
 * ⚠️ WHY A FILE. Automated tests need the code, and every convenient way of
 * handing it over the network is a production hole waiting to be forgotten —
 * a debug route that survives a deploy, a response field behind an `if (dev)`.
 * The server writes to a gitignored file that is never routed and never
 * served, and the harness reads it from the same machine. Production refuses
 * to write it at all (see server/src/services/otpOutbox.ts).
 *
 * ⚠️ Tests read the code from here even when the server runs with the demo
 * code (`OTP_DEV_FIXED_CODE`), so the suite passes the same way with a real,
 * random code — nothing here depends on the value being predictable.
 */

const OUTBOX = path.join(process.cwd(), '..', 'server', '.otp-outbox.json')

export interface OutboxEntry {
  kind?: 'otp' | 'password-reset' | 'password-setup'
  // OTP entries
  challengeId?: string
  code?: string
  // Link entries
  email?: string
  link?: string
  createdAt: string
  expiresAt: string
}

function read(): OutboxEntry[] {
  if (!fs.existsSync(OUTBOX)) return []
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(OUTBOX, 'utf8'))
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : []
  } catch {
    return []
  }
}

/**
 * The code for a specific challenge, waited for rather than read once —
 * the SMS write and the HTTP response race each other.
 */
export async function codeForChallenge(challengeId: string, timeoutMs = 5000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const hit = read().find((e) => e.challengeId === challengeId)
    if (hit?.code !== undefined) return hit.code
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(
    `no OTP in the outbox for challenge ${challengeId}. Is the API running with `
      + 'NODE_ENV != production and no SMS_* configured?',
  )
}

/** Whether ANY code was written for this challenge — for asserting none was. */
export function hasCodeForChallenge(challengeId: string): boolean {
  return read().some((e) => e.challengeId === challengeId)
}

/**
 * The newest reset or set-password link for an address, written after `since`.
 * Waited for, because the forgot-password response returns before the
 * (fire-and-forget) delivery finishes.
 */
export async function linkFor(
  email: string,
  kind: 'password-reset' | 'password-setup',
  since: number,
  timeoutMs = 8000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const hit = read().find(
      (e) => e.kind === kind && e.email === email && Date.parse(e.createdAt) >= since - 1000,
    )
    if (hit?.link !== undefined) return hit.link
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error(`no ${kind} link in the outbox for ${email}. Is email delivery configured and working?`)
}
