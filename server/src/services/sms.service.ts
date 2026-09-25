import { z } from 'zod';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// SMS delivery — OTP only.
//
// ⚠️ NATIVE FETCH, NO SDK, mirroring `ai/provider/groqClient.ts`, which is the
// house pattern for a provider client and the reason this server has no HTTP
// dependency at all. A vendor SDK would drag in a transitive tree for one POST.
//
// ⚠️ NEVER THROWS, and the OTP is NEVER LOGGED. `maskMobile` produces the only
// form of a number permitted in a log line. The dev fallback lives in
// `otpDelivery.ts`, not here — this module either talks to a provider or
// reports honestly that it could not.
// ─────────────────────────────────────────────────────────────────────────────

const isConfigured = Boolean(env.SMS_PROVIDER && env.SMS_API_KEY && env.SMS_SENDER_ID);

/** `9876543210` → `••••• •3210`. The only form that may appear in a log. */
export function maskMobile(normalized: string): string {
  return `••••• •${normalized.slice(-4)}`;
}

/**
 * ⚠️ MSG91 answers 200 with `{"type":"error"}` for several real failures, so a
 * status check alone would report success for an undelivered message. The body
 * is parsed and the `type` field is what decides.
 */
const msg91Response = z.object({
  type: z.string().optional(),
  message: z.unknown().optional(),
  request_id: z.string().optional(),
});

/**
 * Two-level deadline, as in `groqClient.ts` — but far tighter. This sits
 * INLINE in a login request that a person is watching, so the whole attempt is
 * budgeted at 6s rather than the AI client's 13s.
 */
const OVERALL_DEADLINE_MS = 6_000;
const ATTEMPT_TIMEOUT_MS = 4_000;

type SmsOutcome =
  | { kind: 'ok' }
  | { kind: 'retryable'; status: number }
  | { kind: 'terminal'; status: number; detail?: string }
  | { kind: 'network' }
  | { kind: 'timeout' }
  | { kind: 'bad_response' };

async function sendViaMsg91(mobile: string, code: string, signal: AbortSignal): Promise<SmsOutcome> {
  let response: Response;
  try {
    // MSG91's OTP endpoint. `template_id` is the DLT-registered template —
    // Indian carriers reject transactional SMS without one, which is a
    // regulatory step outside this codebase.
    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('mobile', `91${mobile}`);
    url.searchParams.set('otp', code);
    url.searchParams.set('sender', env.SMS_SENDER_ID ?? '');
    if (env.SMS_TEMPLATE_ID !== undefined) url.searchParams.set('template_id', env.SMS_TEMPLATE_ID);

    response = await fetch(url, {
      method: 'POST',
      headers: { authkey: env.SMS_API_KEY ?? '', 'Content-Type': 'application/json' },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return { kind: 'timeout' };
    // ⚠️ The error is not interpolated — a fetch error can echo the URL, and
    // the URL carries the OTP and the destination number.
    console.error('[sms] network error reaching the provider.');
    return { kind: 'network' };
  }

  if (!response.ok) {
    if (response.status === 429 || response.status === 408 || response.status >= 500) {
      return { kind: 'retryable', status: response.status };
    }
    return { kind: 'terminal', status: response.status };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { kind: 'bad_response' };
  }
  const parsed = msg91Response.safeParse(json);
  if (!parsed.success) return { kind: 'bad_response' };

  if (parsed.data.type === 'error') {
    // The provider's own message names the cause (bad template, sender not
    // approved, number on DND). Safe to log: it never contains the OTP.
    const detail = typeof parsed.data.message === 'string' ? parsed.data.message : 'unspecified';
    return { kind: 'terminal', status: 200, detail };
  }
  return { kind: 'ok' };
}

export const smsService = {
  isConfigured,

  /**
   * ⚠️ Resolves `{ sent: false }` rather than throwing on every failure path.
   * The caller must behave identically whether this succeeded or not — telling
   * a user "we could not send an SMS to that number" would confirm the number
   * is registered.
   */
  async sendOtp(args: { mobile: string; code: string; expiresAt: Date }): Promise<{ sent: boolean }> {
    const masked = maskMobile(args.mobile);

    if (!isConfigured) {
      console.error(`[sms] not configured — OTP for ${masked} was NOT delivered.`);
      return { sent: false };
    }
    if (env.SMS_PROVIDER !== 'msg91') {
      // Honest rather than silently pretending. `env.config.ts` accepts
      // 'twilio' as a value; no client for it is implemented.
      console.error(
        `[sms] provider "${String(env.SMS_PROVIDER)}" has no client implemented — `
          + `OTP for ${masked} was NOT delivered.`,
      );
      return { sent: false };
    }

    const startedAt = Date.now();
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const remaining = OVERALL_DEADLINE_MS - (Date.now() - startedAt);
      if (remaining <= 0) break;

      const outcome = await sendViaMsg91(
        args.mobile,
        args.code,
        AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
      );

      if (outcome.kind === 'ok') return { sent: true };
      if (outcome.kind !== 'retryable') {
        console.error(
          `[sms] delivery to ${masked} failed: ${outcome.kind}`
            + ('status' in outcome ? ` (${outcome.status})` : '')
            + ('detail' in outcome && outcome.detail !== undefined ? ` — ${outcome.detail}` : ''),
        );
        return { sent: false };
      }
      if (attempt === 2) break;

      // Jittered backoff, clamped so it cannot blow the overall deadline.
      const backoff = Math.min(800, 250 * 2 ** attempt) * (0.5 + Math.random());
      if (Date.now() - startedAt + backoff >= OVERALL_DEADLINE_MS) break;
      await new Promise((r) => setTimeout(r, backoff));
    }

    console.error(`[sms] delivery to ${masked} failed after retries.`);
    return { sent: false };
  },
};
