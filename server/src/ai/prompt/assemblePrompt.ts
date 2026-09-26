import type { ChatMessage } from '../provider/groqClient';
import { SYSTEM_PROMPT, delimitUntrustedContent } from './systemPrompt';
import { todayLine } from '../context/format';
import { env } from '../../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt assembly — v2.
//
//   system       the rules (trusted)
//   …history     the kept recent turns, oldest first
//   user         <patient_record> · <past_conversation> · today's date · the question
//
// The record sits in the FINAL user turn, directly above the question:
// instruction adherence on a 20B model is strongest at the tail, and the
// record is what the answer must come from. v1 put it in a first user turn
// followed by a canned assistant reply ("I will answer only from that
// record") — which taught the model to refuse anything not spelled out.
//
// Budget (tokens, estimated at 3.6 chars/token):
//   record          AI_CONTEXT_TOKENS (retrieval already selected to fit it;
//                   this is the last-resort cut, at a line boundary)
//   memory          200 across-conversation + 200 this conversation
//   recent turns    700, newest kept
//   question        1000, trimmed with a visible marker, never dropped
// ─────────────────────────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 3.6;
const toTokens = (chars: number): number => Math.ceil(chars / CHARS_PER_TOKEN);
const toChars = (tokens: number): number => Math.floor(tokens * CHARS_PER_TOKEN);

export const BUDGET = {
  longTermMemory: 200,
  conversationSummary: 200,
  recentTurns: 700,
  question: 1000,
} as const;

/** Kinds as stored on an assistant turn (AiMessageKind), plus 'User'. */
export type TurnKind =
  | 'Model'
  | 'Placeholder'
  | 'SafetyInterlock'
  | 'SafetyBlocked'
  | 'BudgetDeferred'
  | 'PolicyBlocked'
  | 'ProviderUnavailable';

export type RecentTurn = { role: 'User' | 'Assistant'; content: string; kind?: TurnKind };

export type AssemblePromptInput = {
  /** Already selected by retrieval to fit the budget. */
  patientContext: { demographicsLine: string; contextText: string } | null;
  longTermMemorySummaries: string[];
  conversationSummary: string | null;
  recentTurns: RecentTurn[];
  question: string;
  /** For today's date line; defaults to now. */
  now?: Date;
  /**
   * Whether the record carries source tags to cite. The chat's record does;
   * the medicine summary's short medicine list does not, and a model told to
   * cite tags that do not exist invents them (which the guard then rejects).
   */
  citeSources?: boolean;
};

export type AssembledPrompt = {
  messages: ChatMessage[];
  /** What was cut, for observability — never contains the cut text itself. */
  trimmed: string[];
  /** Everything the model was shown as data this turn: record, memory, kept
   *  turns, today's line. The output guard grounds the reply in this. */
  groundText: string;
};

function fitToBudget(
  text: string,
  maxTokens: number,
  marker: string,
): { text: string; trimmed: boolean } {
  const maxChars = toChars(maxTokens);
  if (text.length <= maxChars) return { text, trimmed: false };
  return { text: text.slice(0, Math.max(0, maxChars - marker.length)) + marker, trimmed: true };
}

/** Cut at a line boundary — a record line is never shown half-written. */
function fitLines(text: string, maxTokens: number): { text: string; trimmed: boolean } {
  const maxChars = toChars(maxTokens);
  if (text.length <= maxChars) return { text, trimmed: false };
  const cut = text.slice(0, maxChars);
  const at = cut.lastIndexOf('\n');
  return { text: `${at > 0 ? cut.slice(0, at) : ''}\n(older records not included)`, trimmed: true };
}

/**
 * The conversation so far, as the model should see it.
 *
 * ⚠️ A refused or failed turn is dropped TOGETHER WITH its question. Left in,
 * a fixed refusal ("I can't answer that one safely…") is copied by the model
 * into its next reply, and one refusal becomes a conversation of them. An
 * emergency interlock is kept as a one-line marker, because what comes next
 * ("what do I do now?") depends on it.
 */
export function historyTurns(turns: RecentTurn[]): RecentTurn[] {
  const out: RecentTurn[] = [];
  for (let i = 0; i < turns.length; i += 1) {
    const t = turns[i];
    const next = turns[i + 1];
    if (
      t.role === 'User' &&
      next?.role === 'Assistant' &&
      next.kind !== undefined &&
      next.kind !== 'Model'
    ) {
      if (next.kind === 'SafetyInterlock') {
        out.push(t, {
          role: 'Assistant',
          content: '[The emergency message was shown: call 108 now.]',
          kind: next.kind,
        });
      }
      i += 1;
      continue;
    }
    if (
      t.role === 'Assistant' &&
      t.kind !== undefined &&
      t.kind !== 'Model' &&
      t.kind !== 'SafetyInterlock'
    )
      continue;
    out.push(t);
  }
  return out;
}

export function assemblePrompt(input: AssemblePromptInput): AssembledPrompt {
  const trimmed: string[] = [];
  const dataBlocks: string[] = [];

  if (input.patientContext !== null) {
    const record = fitLines(input.patientContext.contextText, env.AI_CONTEXT_TOKENS + 200);
    if (record.trimmed) trimmed.push('clinicalContext');
    const body = record.text.includes(input.patientContext.demographicsLine)
      ? record.text
      : `${input.patientContext.demographicsLine}\n\n${record.text}`;
    if (body.trim() !== '') dataBlocks.push(delimitUntrustedContent('patient_record', body));
  }

  if (input.longTermMemorySummaries.length > 0) {
    const fitted = fitToBudget(
      input.longTermMemorySummaries.join('\n---\n'),
      BUDGET.longTermMemory,
      ' [truncated]',
    );
    if (fitted.trimmed) trimmed.push('longTermMemory');
    dataBlocks.push(
      delimitUntrustedContent('past_conversation', `Earlier conversations: ${fitted.text}`),
    );
  } else {
    trimmed.push('longTermMemory:none');
  }

  if (input.conversationSummary !== null && input.conversationSummary.trim() !== '') {
    const fitted = fitToBudget(
      input.conversationSummary,
      BUDGET.conversationSummary,
      ' [truncated]',
    );
    if (fitted.trimmed) trimmed.push('conversationSummary');
    dataBlocks.push(
      delimitUntrustedContent('past_conversation', `Earlier in this conversation: ${fitted.text}`),
    );
  }

  // Recent turns: keep the newest, drop the oldest first if over budget.
  const history = historyTurns(input.recentTurns);
  let left = toChars(BUDGET.recentTurns);
  const kept: RecentTurn[] = [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].content.length > left) {
      trimmed.push('recentTurns');
      break;
    }
    left -= history[i].content.length;
    kept.unshift(history[i]);
  }
  // A kept history must not open with an orphaned reply.
  while (kept.length > 0 && kept[0].role === 'Assistant') kept.shift();

  const fittedQuestion = fitToBudget(input.question, BUDGET.question, ' [question trimmed]');
  if (fittedQuestion.trimmed) trimmed.push('question');
  const today = todayLine(input.now ?? new Date());

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...kept.map((t): ChatMessage => ({
      role: t.role === 'User' ? 'user' : 'assistant',
      content: t.content,
    })),
    {
      role: 'user',
      // The reminder sits last, where a small model attends most.
      content: [
        ...dataBlocks,
        today,
        `Question: ${fittedQuestion.text}`,
        input.citeSources === false
          ? '(This record has no source tags: do not write any text in square brackets.)'
          : '(When you use the record, copy the source tag after each fact.)',
      ].join('\n\n'),
    },
  ];

  return {
    messages,
    trimmed,
    groundText: [...dataBlocks, today, ...kept.map((t) => t.content)].join('\n'),
  };
}

/** Total prompt character count, for the pre-call token estimate. */
export function promptCharCount(prompt: AssembledPrompt): number {
  return prompt.messages.reduce((sum, m) => sum + m.content.length, 0);
}

export { toTokens };
