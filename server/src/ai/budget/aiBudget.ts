import { prisma } from '../../lib/prisma';
import { env } from '../../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// AI usage budget — reserve, call, reconcile.
//
// Two of the four vendor limits (tokens/min, tokens/day) are only known AFTER
// the response arrives, so this cannot be a simple counter that decrements on
// arrival the way express-rate-limit works. It has to reserve an ESTIMATE
// before calling upstream, then reconcile to the real usage afterwards —
// otherwise a burst of concurrent requests could all pass a check that reads
// stale numbers and blow through the vendor's per-minute ceiling together.
//
// Two storage tiers, deliberately:
//   - per-minute counters live in memory. A restart losing them is
//     acceptable: it fails safe into the configured headroom, not into an
//     unbounded burst.
//   - per-day counters live in Postgres (`AiUsageDaily`). A restart at 6pm
//     must NOT hand every patient a fresh daily allowance and let the app
//     drain the whole day's quota twice. This is the one piece of AI state
//     that genuinely needs to survive a process restart.
//
// Limits are read from env (AI_LIMIT_*), never hardcoded — changing vendor
// tier must be a config change, not a code change.
// ─────────────────────────────────────────────────────────────────────────────

export type BudgetDenialReason =
  | 'patient_daily_messages'
  | 'shared_minute_tokens'
  | 'shared_minute_requests'
  | 'shared_daily_tokens'
  | 'shared_daily_requests';

export type BudgetDenial = {
  ok: false;
  reason: BudgetDenialReason;
  retryAfterSeconds: number;
};

export type BudgetReservation = {
  ok: true;
  release: () => void;
  commit: (actual: { promptTokens: number; completionTokens: number }) => Promise<void>;
};

export type BudgetResult = BudgetDenial | BudgetReservation;

type MinuteWindow = { windowStartMs: number; requests: number; tokens: number };

/** In-memory per-minute counters. Keyed by 'global' and by userId, so the
 *  per-patient rpm cap and the shared rpm cap are tracked independently. */
const minuteWindows = new Map<string, MinuteWindow>();

function currentMinuteWindow(key: string): MinuteWindow {
  const now = Date.now();
  const bucketStart = Math.floor(now / 60_000) * 60_000;
  const existing = minuteWindows.get(key);
  if (existing !== undefined && existing.windowStartMs === bucketStart) return existing;
  const fresh: MinuteWindow = { windowStartMs: bucketStart, requests: 0, tokens: 0 };
  minuteWindows.set(key, fresh);
  return fresh;
}

function secondsUntilNextMinute(): number {
  return Math.ceil((60_000 - (Date.now() % 60_000)) / 1000);
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function secondsUntilMidnightUtc(): number {
  const now = new Date();
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((midnight - now.getTime()) / 1000);
}

/** Token estimate before a tokenizer-accurate count exists. Clinical text
 *  (drug names, Crockford ids, Indian names) undercounts on chars/4, and
 *  undercounting is the unsafe direction for a budget check — 3.6 errs a
 *  little high instead. Self-correction against real `usage` happens in
 *  `commit`, via the rolling ratio in `estimateRatio`. */
export function estimateTokens(promptChars: number, messageCount: number): number {
  return Math.ceil(promptChars / 3.6) + 4 * messageCount;
}

/** Rolling correction factor: actual ÷ estimate, averaged over the last 32
 *  calls. Dependency-free alternative to a real tokenizer. */
let estimateRatioSamples: number[] = [];
const MAX_RATIO_SAMPLES = 32;

function recordRatio(estimated: number, actual: number): void {
  if (estimated <= 0 || actual <= 0) return;
  estimateRatioSamples.push(actual / estimated);
  if (estimateRatioSamples.length > MAX_RATIO_SAMPLES) estimateRatioSamples.shift();
}

export function currentEstimateRatio(): number {
  if (estimateRatioSamples.length === 0) return 1;
  return estimateRatioSamples.reduce((a, b) => a + b, 0) / estimateRatioSamples.length;
}

/**
 * Raw SQL, not Prisma's typed `findUnique`/`upsert`, because the compound
 * unique key includes a nullable column (`userId IS NULL` identifies the
 * shared/global row). Prisma's generated compound-key type requires a
 * non-null value even though the migration declared the index
 * `NULLS NOT DISTINCT` specifically so `(NULL, today)` collides with itself —
 * `ON CONFLICT` is what actually exploits that, and only raw SQL can express it.
 */
async function readDailyTotals(userId: string | null): Promise<{
  requests: number;
  tokens: number;
}> {
  const rows = await prisma.$queryRaw<
    { requests: number; prompt_tokens: number; completion_tokens: number }[]
  >`
    SELECT requests, prompt_tokens, completion_tokens
    FROM ai_usage_daily
    WHERE user_id IS NOT DISTINCT FROM ${userId}::uuid
      AND day = ${todayUtc()}::date
  `;
  const row = rows[0];
  if (row === undefined) return { requests: 0, tokens: 0 };
  return { requests: row.requests, tokens: row.prompt_tokens + row.completion_tokens };
}

async function bumpDaily(
  userId: string | null,
  delta: { requests: number; promptTokens: number; completionTokens: number; blocked?: boolean },
): Promise<void> {
  const id = crypto.randomUUID();
  const blockedDelta = delta.blocked === true ? 1 : 0;
  await prisma.$executeRaw`
    INSERT INTO ai_usage_daily
      (id, user_id, day, requests, prompt_tokens, completion_tokens, blocked_count, updated_at)
    VALUES
      (${id}::uuid, ${userId}::uuid, ${todayUtc()}::date,
       ${delta.requests}, ${delta.promptTokens}, ${delta.completionTokens}, ${blockedDelta}, now())
    ON CONFLICT (user_id, day) DO UPDATE SET
      requests          = ai_usage_daily.requests + EXCLUDED.requests,
      prompt_tokens     = ai_usage_daily.prompt_tokens + EXCLUDED.prompt_tokens,
      completion_tokens = ai_usage_daily.completion_tokens + EXCLUDED.completion_tokens,
      blocked_count     = ai_usage_daily.blocked_count + EXCLUDED.blocked_count,
      updated_at        = now()
  `;
}

/**
 * Reserve → call → commit/release.
 *
 * `estimatedTokens` must include the full completion cap as its worst case
 * (see the prompt-assembly budget table), not just the prompt — reserving
 * only the prompt would let several concurrent long replies blow the
 * per-minute ceiling even though every individual reservation looked fine.
 */
export async function reserveBudget(params: {
  userId: string;
  estimatedTokens: number;
}): Promise<BudgetResult> {
  const { userId, estimatedTokens } = params;
  const headroom = env.AI_LIMIT_HEADROOM;
  const rpmCap = Math.floor(env.AI_LIMIT_RPM * headroom);
  const tpmCap = Math.floor(env.AI_LIMIT_TPM * headroom);
  const rpdCap = Math.floor(env.AI_LIMIT_RPD * headroom);
  const tpdCap = Math.floor(env.AI_LIMIT_TPD * headroom);

  // ── Per-patient daily message cap — cheapest check, evaluated first ──────
  const patientDaily = await readDailyTotals(userId);
  if (patientDaily.requests >= env.AI_PATIENT_DAILY_MESSAGES) {
    return {
      ok: false,
      reason: 'patient_daily_messages',
      retryAfterSeconds: secondsUntilMidnightUtc(),
    };
  }

  // ── Shared minute window (global, across all users) ──────────────────────
  const globalMinute = currentMinuteWindow('global');
  if (globalMinute.requests + 1 > rpmCap) {
    return {
      ok: false,
      reason: 'shared_minute_requests',
      retryAfterSeconds: secondsUntilNextMinute(),
    };
  }
  if (globalMinute.tokens + estimatedTokens > tpmCap) {
    return {
      ok: false,
      reason: 'shared_minute_tokens',
      retryAfterSeconds: secondsUntilNextMinute(),
    };
  }

  // ── Shared daily window ───────────────────────────────────────────────────
  const globalDaily = await readDailyTotals(null);
  if (globalDaily.requests + 1 > rpdCap) {
    return {
      ok: false,
      reason: 'shared_daily_requests',
      retryAfterSeconds: secondsUntilMidnightUtc(),
    };
  }
  if (globalDaily.tokens + estimatedTokens > tpdCap) {
    return {
      ok: false,
      reason: 'shared_daily_tokens',
      retryAfterSeconds: secondsUntilMidnightUtc(),
    };
  }

  // ── Commit the reservation synchronously (in-process, single-threaded —
  //    this is what makes it atomic without a lock). The Postgres side is
  //    updated on commit/release, not here, since it needs the real numbers.
  globalMinute.requests += 1;
  globalMinute.tokens += estimatedTokens;
  let settled = false;

  return {
    ok: true,
    /** Call failed before a response arrived: refund tokens, but the request
     *  itself still consumed one of the vendor's rpm slots, so that stays. */
    release: () => {
      if (settled) return;
      settled = true;
      globalMinute.tokens = Math.max(0, globalMinute.tokens - estimatedTokens);
      void bumpDaily(userId, { requests: 1, promptTokens: 0, completionTokens: 0, blocked: false });
      void bumpDaily(null, { requests: 1, promptTokens: 0, completionTokens: 0 });
    },
    commit: async (actual) => {
      if (settled) return;
      settled = true;
      const actualTotal = actual.promptTokens + actual.completionTokens;
      recordRatio(estimatedTokens, actualTotal);
      // Reconcile the in-memory minute window to the real figure.
      globalMinute.tokens = Math.max(0, globalMinute.tokens - estimatedTokens + actualTotal);
      await Promise.all([
        bumpDaily(userId, {
          requests: 1,
          promptTokens: actual.promptTokens,
          completionTokens: actual.completionTokens,
        }),
        bumpDaily(null, {
          requests: 1,
          promptTokens: actual.promptTokens,
          completionTokens: actual.completionTokens,
        }),
      ]);
    },
  };
}

/**
 * Called when Groq's own rate-limit headers arrive. The vendor is
 * authoritative — this overwrites the in-memory minute window rather than
 * trusting our own estimate, which self-heals any drift between the two.
 */
export function reconcileFromVendorHeaders(headers: {
  remainingTokens?: number;
  remainingRequests?: number;
}): void {
  if (headers.remainingTokens === undefined && headers.remainingRequests === undefined) return;
  const globalMinute = currentMinuteWindow('global');
  const rpmCap = Math.floor(env.AI_LIMIT_RPM * env.AI_LIMIT_HEADROOM);
  const tpmCap = Math.floor(env.AI_LIMIT_TPM * env.AI_LIMIT_HEADROOM);
  if (headers.remainingRequests !== undefined) {
    globalMinute.requests = Math.max(0, rpmCap - headers.remainingRequests);
  }
  if (headers.remainingTokens !== undefined) {
    globalMinute.tokens = Math.max(0, tpmCap - headers.remainingTokens);
  }
}

/** Test-only: clear in-memory state between test cases. */
export function __resetBudgetStateForTests(): void {
  minuteWindows.clear();
  estimateRatioSamples = [];
}
