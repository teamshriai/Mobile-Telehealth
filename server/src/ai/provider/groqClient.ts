import { z } from 'zod';
import { env } from '../../config/env.config';
import { reconcileFromVendorHeaders } from '../budget/aiBudget';

// ─────────────────────────────────────────────────────────────────────────────
// Provider client — native fetch, no SDK, no new dependency.
//
// Written against Groq's OpenAI-compatible /chat/completions, but the shape
// is standard enough that AI_BASE_URL alone (no code change) is what makes a
// BAA-covered Groq deployment, OpenAI, or a self-hosted vLLM instance a
// config change rather than a rewrite.
// ─────────────────────────────────────────────────────────────────────────────

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type ProviderOutcome =
  | {
      kind: 'ok';
      content: string;
      promptTokens: number;
      completionTokens: number;
      finishReason: string;
    }
  | { kind: 'retryable_error'; statusCode: number; retryAfterMs?: number }
  | { kind: 'terminal_error'; statusCode: number }
  | { kind: 'network_error' }
  | { kind: 'timeout' }
  | { kind: 'bad_response' };

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          // Present when a provider ignores `include_reasoning: false`; a
          // defensive strip point in addition to the request parameter.
          reasoning: z.string().nullable().optional(),
        }),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

/** Strips reasoning artefacts regardless of what the request parameters
 *  achieved — see §0.2: settings can be ignored by a provider, the strip
 *  cannot be. Chain-of-thought reaching storage as clinical text is the
 *  single worst outcome this client could produce. */
function stripReasoningArtifacts(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\|channel\|>analysis[\s\S]*?(?=<\|channel\|>final|$)/gi, '')
    .replace(/<\|channel\|>final\|?>?/gi, '')
    .trim();
}

/** Redacts anything key-shaped before it ever reaches stderr — a last-resort
 *  net, not the primary control (the primary control is: never log the body). */
function redact(text: string): string {
  return text.replace(/(gsk_|sk-)[A-Za-z0-9_-]{16,}/g, '$1***REDACTED***');
}

function parseRetryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get('retry-after');
  if (raw === null) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

function parseRateLimitHeaders(headers: Headers): void {
  const remainingTokens = headers.get('x-ratelimit-remaining-tokens');
  const remainingRequests = headers.get('x-ratelimit-remaining-requests');
  reconcileFromVendorHeaders({
    remainingTokens: remainingTokens !== null ? Number(remainingTokens) : undefined,
    remainingRequests: remainingRequests !== null ? Number(remainingRequests) : undefined,
  });
}

/**
 * One attempt, no retry logic here — that lives in `callModel`. Never throws;
 * every failure mode is a variant of `ProviderOutcome` so the caller cannot
 * forget to handle one.
 */
async function attemptOnce(
  messages: ChatMessage[],
  maxTokens: number,
  signal: AbortSignal,
): Promise<ProviderOutcome> {
  let response: Response;
  try {
    response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      // No `user` field — no patient identifier leaves the building.
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        temperature: 0.2,
        top_p: 1,
        max_completion_tokens: maxTokens,
        stream: false,
        // §0.2: settled parameters for openai/gpt-oss-20b specifically.
        // Do NOT send `reasoning_format` for this model — that parameter
        // belongs to the non-GPT-OSS reasoning models on Groq and the two
        // are documented as mutually exclusive.
        reasoning_effort: env.AI_REASONING_EFFORT,
        include_reasoning: false,
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return { kind: 'timeout' };
    console.error('[ai/provider] network error:', redact(String(err)));
    return { kind: 'network_error' };
  }

  parseRateLimitHeaders(response.headers);

  if (!response.ok) {
    // Never log the response body — it can carry echoed prompt content.
    if (response.status === 429) {
      return {
        kind: 'retryable_error',
        statusCode: 429,
        retryAfterMs: parseRetryAfterMs(response.headers),
      };
    }
    if (response.status === 408 || response.status >= 500) {
      return { kind: 'retryable_error', statusCode: response.status };
    }
    // 400/401/403/404/413/422 and anything else unexpected: not retryable.
    return { kind: 'terminal_error', statusCode: response.status };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { kind: 'bad_response' };
  }

  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return { kind: 'bad_response' };

  // ⚠️ An EMPTY reply is still 'ok', with its finish reason. A reasoning
  // model that spends its whole cap thinking returns no content and
  // finish_reason "length"; the caller retries that once with more room
  // (ai/pipeline.ts). It used to be reported as a provider failure, which the
  // patient saw as "the assistant is busy".
  const choice = parsed.data.choices[0];
  const rawContent = choice.message.content ?? '';

  return {
    kind: 'ok',
    content: stripReasoningArtifacts(rawContent),
    promptTokens: parsed.data.usage?.prompt_tokens ?? 0,
    completionTokens: parsed.data.usage?.completion_tokens ?? 0,
    finishReason: choice.finish_reason ?? 'unknown',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CallOptions {
  /** Reply cap; defaults to AI_MAX_COMPLETION_TOKENS. */
  maxTokens?: number;
  /** Absolute time (ms) by which to give up. Defaults to 13s from now, under
   *  the 15s axios timeout of callers that use the shared client default. */
  deadlineAt?: number;
  signal?: AbortSignal;
}

/**
 * Reserve → call → reconcile is the caller's job (`aiBudget`). This function
 * only owns the HTTP conversation: timeout, retry on 429/5xx, and never
 * leaking the key or upstream body text.
 *
 * The server must give up before the client does, or the patient sees a raw
 * network error instead of our own copy — hence the deadline.
 */
export async function callModel(
  messages: ChatMessage[],
  options: CallOptions = {},
): Promise<ProviderOutcome> {
  const deadlineAt = options.deadlineAt ?? Date.now() + 13_000;
  const maxTokens = options.maxTokens ?? env.AI_MAX_COMPLETION_TOKENS;
  const externalSignal = options.signal;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) return { kind: 'timeout' };

    const attemptTimeoutMs = Math.min(env.AI_REQUEST_TIMEOUT_MS, remaining);
    const timeoutSignal = AbortSignal.timeout(attemptTimeoutMs);
    const signal =
      externalSignal !== undefined
        ? AbortSignal.any([timeoutSignal, externalSignal])
        : timeoutSignal;

    const outcome = await attemptOnce(messages, maxTokens, signal);
    if (outcome.kind !== 'retryable_error') return outcome;

    if (attempt === maxAttempts) return outcome;

    const backoffMs =
      outcome.retryAfterMs ?? Math.min(2000, 250 * 2 ** attempt) * (0.5 + Math.random());
    if (Date.now() + backoffMs >= deadlineAt) return outcome;
    await sleep(backoffMs);
  }

  // Unreachable, but keeps the return type total without a non-null assertion.
  return { kind: 'network_error' };
}
