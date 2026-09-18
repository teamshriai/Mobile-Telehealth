import type { ChatMessage } from '../provider/groqClient';
import { SYSTEM_PROMPT, delimitUntrustedContent } from './systemPrompt';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt assembly and the per-request token budget.
//
// Sections run stable → volatile, question last — instruction adherence on a
// 20B model is strongest at the tail, so the thing that most needs following
// (the actual question) sits closest to where generation begins.
//
// Trim order (first dropped first) when over budget:
//   1. long-term cross-conversation memory (nice-to-have)
//   2. the rolling conversation summary
//   3. older recent turns (keep the newest)
//   4. retrieved clinical context (should rarely trigger at today's volumes)
//   5. the question itself (truncated with a visible marker, never dropped)
// ─────────────────────────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 3.6;
const toTokens = (chars: number): number => Math.ceil(chars / CHARS_PER_TOKEN);
const toChars = (tokens: number): number => Math.floor(tokens * CHARS_PER_TOKEN);

export const BUDGET = {
  demographics: 60,
  clinicalContext: 600,
  longTermMemory: 200,
  conversationSummary: 200,
  recentTurns: 500,
  question: 1000,
} as const;

export type RecentTurn = { role: 'User' | 'Assistant'; content: string };

export type AssemblePromptInput = {
  /** Already retrieval-decided (bypass-all or top-k) — see
   *  ai/memory/retrieval.ts. assemblePrompt itself never decides how much of
   *  the record to use, only how to budget and delimit what it is given. */
  patientContext: { demographicsLine: string; contextText: string } | null;
  longTermMemorySummaries: string[];
  conversationSummary: string | null;
  recentTurns: RecentTurn[];
  question: string;
};

export type AssembledPrompt = {
  messages: ChatMessage[];
  /** What was cut, for observability — never contains the cut text itself. */
  trimmed: string[];
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

export function assemblePrompt(input: AssemblePromptInput): AssembledPrompt {
  const trimmed: string[] = [];
  const userSections: string[] = [];

  if (input.patientContext !== null) {
    userSections.push(input.patientContext.demographicsLine);

    const fittedContext = fitToBudget(
      input.patientContext.contextText,
      BUDGET.clinicalContext,
      ' [older records omitted]',
    );
    if (fittedContext.trimmed) trimmed.push('clinicalContext');
    if (fittedContext.text.trim() !== '') {
      userSections.push(delimitUntrustedContent('patient_record', fittedContext.text));
    }
  }

  if (input.longTermMemorySummaries.length > 0) {
    const joined = input.longTermMemorySummaries.join('\n---\n');
    const fitted = fitToBudget(joined, BUDGET.longTermMemory, ' [truncated]');
    if (fitted.trimmed) trimmed.push('longTermMemory');
    userSections.push(delimitUntrustedContent('past_conversation', fitted.text));
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
    userSections.push(
      delimitUntrustedContent('past_conversation', `Earlier in this conversation: ${fitted.text}`),
    );
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userSections.join('\n\n') },
    {
      role: 'assistant',
      content: 'Understood. I will answer only from that record and stay within the rules.',
    },
  ];

  // Recent turns: keep the newest, drop the oldest first if over budget.
  let recentBudgetChars = toChars(BUDGET.recentTurns);
  const keptTurns: RecentTurn[] = [];
  for (let i = input.recentTurns.length - 1; i >= 0; i -= 1) {
    const turn = input.recentTurns[i];
    if (turn.content.length > recentBudgetChars) {
      trimmed.push('recentTurns');
      break;
    }
    recentBudgetChars -= turn.content.length;
    keptTurns.unshift(turn);
  }
  for (const turn of keptTurns) {
    messages.push({ role: turn.role === 'User' ? 'user' : 'assistant', content: turn.content });
  }

  const fittedQuestion = fitToBudget(input.question, BUDGET.question, ' [question trimmed]');
  if (fittedQuestion.trimmed) trimmed.push('question');
  messages.push({ role: 'user', content: fittedQuestion.text });

  return { messages, trimmed };
}

/** Total prompt character count, for the pre-call token estimate. */
export function promptCharCount(prompt: AssembledPrompt): number {
  return prompt.messages.reduce((sum, m) => sum + m.content.length, 0);
}

export { toTokens };
