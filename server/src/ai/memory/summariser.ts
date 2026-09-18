import { callModel } from '../provider/groqClient';
import { PROMPT_VERSION } from '../prompt/systemPrompt';
import type { MessageRow } from '../ai.repository';

// ─────────────────────────────────────────────────────────────────────────────
// Rolling conversation summariser.
//
// Runs AFTER a reply has already been returned to the patient, never before —
// its latency and failure mode must stay off the critical path. A failed run
// just means the next turn carries a slightly stale summary, which is a far
// smaller problem than a slower reply.
//
// It is also the first thing sacrificed under budget pressure: the caller
// skips invoking this entirely once the daily ledger is past 80% used (see
// aiService), because a summary is a convenience and every token it spends
// competes with a real patient question for the same shared quota.
// ─────────────────────────────────────────────────────────────────────────────

const SUMMARISE_EVERY_N_MESSAGES = 12;
const MAX_SUMMARY_TOKENS = 200;

export function shouldSummarise(
  totalMessageCount: number,
  alreadySummarisedThrough: string | null,
): boolean {
  // Only ever true right after a multiple-of-12 message has just been
  // written, so this fires at most once per 12 turns per conversation.
  if (alreadySummarisedThrough !== null) {
    // Caller passes the count as of NOW; a prior summary exists, so only fire
    // again once another full window has accumulated past it.
    return totalMessageCount % SUMMARISE_EVERY_N_MESSAGES === 0;
  }
  return (
    totalMessageCount >= SUMMARISE_EVERY_N_MESSAGES &&
    totalMessageCount % SUMMARISE_EVERY_N_MESSAGES === 0
  );
}

function renderTurnsForSummarising(turns: MessageRow[]): string {
  return turns.map((t) => `${t.role}: ${t.content}`).join('\n');
}

/**
 * Produces a new rolling summary folding `priorSummary` (if any) with the
 * given turns. Returns null on any failure — the caller keeps the old
 * summary rather than losing memory to a failed model call.
 */
export async function summariseConversation(
  priorSummary: string | null,
  turnsToFold: MessageRow[],
): Promise<{ summary: string; tokenCount: number } | null> {
  if (turnsToFold.length === 0) return null;

  const instructions =
    'Summarise this patient support conversation in under 120 words, in third person, ' +
    'for your own future reference. Note topics discussed and any facts stated, but do ' +
    'not add new medical claims, doses, or reassurance that were not already said.';

  const priorPart = priorSummary !== null ? `Prior summary: ${priorSummary}\n\n` : '';
  const userContent = `${priorPart}New turns to fold in:\n${renderTurnsForSummarising(turnsToFold)}`;

  const outcome = await callModel([
    { role: 'system', content: instructions },
    { role: 'user', content: userContent },
  ]);

  if (outcome.kind !== 'ok') return null;
  const summary = outcome.content.trim();
  if (summary === '') return null;

  return { summary, tokenCount: Math.min(outcome.completionTokens, MAX_SUMMARY_TOKENS) };
}

/** Referenced so a summary produced under one prompt convention is
 *  distinguishable from one produced under another, should the summariser's
 *  own instructions ever change. */
export const SUMMARISER_PROMPT_VERSION = PROMPT_VERSION;
