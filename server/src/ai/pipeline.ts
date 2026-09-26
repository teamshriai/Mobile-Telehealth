import { env } from '../config/env.config';
import {
  estimateTokens,
  reserveBudget,
  type BudgetDenialReason,
  type BudgetScope,
} from './budget/aiBudget';
import { callModel, type ChatMessage, type ProviderOutcome } from './provider/groqClient';

// ─────────────────────────────────────────────────────────────────────────────
// One assistant reply: reserve → call → (retry once) → commit.
//
//  - PACING. When only the shared per-minute window is full and it frees up
//    within ~20s, wait for it rather than telling the patient "busy" — the
//    free tier allows about two turns a minute, and a patient typing a
//    follow-up is usually inside that minute.
//  - ONE RETRY. A reply that comes back empty or cut off at the length limit
//    (a reasoning model can spend its cap thinking) is asked again once, with
//    more room and a request to be brief. A partial answer is never shown.
//  - Every reservation is committed with the real usage or released, so the
//    budget ledger never drifts.
// ─────────────────────────────────────────────────────────────────────────────

const PACE_MAX_WAIT_S = 20;
const BRIEF_HINT = '\n\n(Answer briefly — under 150 words.)';

export type GenerateResult =
  | {
      kind: 'ok';
      content: string;
      finishReason: string;
      promptTokens: number;
      completionTokens: number;
      attempts: number;
      durationMs: number;
    }
  | { kind: 'budget'; reason: BudgetDenialReason; retryAfterSeconds: number }
  | {
      kind: 'provider_error';
      outcome: Exclude<ProviderOutcome, { kind: 'ok' }>;
      durationMs: number;
    }
  | { kind: 'no_answer'; attempts: number; durationMs: number };

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function estimateFor(messages: ChatMessage[], completion: number): number {
  const chars = messages.reduce((n, m) => n + m.content.length, 0);
  return estimateTokens(chars, messages.length) + completion;
}

type Reservation = Extract<Awaited<ReturnType<typeof reserveBudget>>, { ok: true }>;

async function reservePaced(
  userId: string,
  estimatedTokens: number,
  scope: BudgetScope,
  deadlineAt: number,
): Promise<Reservation | { ok: false; reason: BudgetDenialReason; retryAfterSeconds: number }> {
  const first = await reserveBudget({ userId, estimatedTokens, scope });
  if (first.ok) return first;
  const minuteOnly =
    first.reason === 'shared_minute_tokens' || first.reason === 'shared_minute_requests';
  const waitMs = first.retryAfterSeconds * 1000 + 250;
  // Leave room for the call itself after waiting.
  if (
    !minuteOnly ||
    first.retryAfterSeconds > PACE_MAX_WAIT_S ||
    Date.now() + waitMs + 8_000 > deadlineAt
  ) {
    return first;
  }
  await sleep(waitMs);
  return reserveBudget({ userId, estimatedTokens, scope });
}

const usable = (o: ProviderOutcome): o is Extract<ProviderOutcome, { kind: 'ok' }> =>
  o.kind === 'ok' && o.content.trim() !== '' && o.finishReason !== 'length';

export async function generateReply(params: {
  userId: string;
  messages: ChatMessage[];
  /** 'patient' spends the patient's daily allowance; 'system' only the shared budget. */
  scope?: 'patient' | 'system';
  deadlineAt?: number;
}): Promise<GenerateResult> {
  const startedAt = Date.now();
  const deadlineAt = params.deadlineAt ?? startedAt + env.AI_OVERALL_DEADLINE_MS;
  const { userId, messages } = params;
  const firstScope: BudgetScope = params.scope === 'system' ? 'system' : 'patient';
  const retryScope: BudgetScope = params.scope === 'system' ? 'system' : 'patient-retry';

  const first = await reservePaced(
    userId,
    estimateFor(messages, env.AI_MAX_COMPLETION_TOKENS),
    firstScope,
    deadlineAt,
  );
  if (!first.ok)
    return { kind: 'budget', reason: first.reason, retryAfterSeconds: first.retryAfterSeconds };

  const outcome = await callModel(messages, {
    maxTokens: env.AI_MAX_COMPLETION_TOKENS,
    deadlineAt,
  });
  if (outcome.kind !== 'ok') {
    first.release();
    return { kind: 'provider_error', outcome, durationMs: Date.now() - startedAt };
  }
  await first.commit({
    promptTokens: outcome.promptTokens,
    completionTokens: outcome.completionTokens,
  });
  let promptTokens = outcome.promptTokens;
  let completionTokens = outcome.completionTokens;
  if (usable(outcome)) {
    return {
      kind: 'ok',
      content: outcome.content,
      finishReason: outcome.finishReason,
      promptTokens,
      completionTokens,
      attempts: 1,
      durationMs: Date.now() - startedAt,
    };
  }

  // ── The one retry: more room, and asked to be brief ──────────────────────
  const last = messages[messages.length - 1];
  const retryMessages: ChatMessage[] = [
    ...messages.slice(0, -1),
    { ...last, content: last.content + BRIEF_HINT },
  ];
  const second = await reservePaced(
    userId,
    estimateFor(retryMessages, env.AI_RETRY_COMPLETION_TOKENS),
    retryScope,
    deadlineAt,
  );
  if (!second.ok) return { kind: 'no_answer', attempts: 1, durationMs: Date.now() - startedAt };
  const retry = await callModel(retryMessages, {
    maxTokens: env.AI_RETRY_COMPLETION_TOKENS,
    deadlineAt,
  });
  if (retry.kind !== 'ok') {
    second.release();
    return { kind: 'no_answer', attempts: 2, durationMs: Date.now() - startedAt };
  }
  await second.commit({
    promptTokens: retry.promptTokens,
    completionTokens: retry.completionTokens,
  });
  promptTokens += retry.promptTokens;
  completionTokens += retry.completionTokens;
  if (!usable(retry)) return { kind: 'no_answer', attempts: 2, durationMs: Date.now() - startedAt };
  return {
    kind: 'ok',
    content: retry.content,
    finishReason: retry.finishReason,
    promptTokens,
    completionTokens,
    attempts: 2,
    durationMs: Date.now() - startedAt,
  };
}
