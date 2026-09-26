import { AiMessageKind, AiMessageRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { aiRepository, type ConversationSummary, type MessageRow } from './ai.repository';
import { AppError } from '../middleware/errorHandler';
import type { SendMessageDto, RenameConversationDto } from './ai.validator';
import { env, aiEnabled } from '../config/env.config';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { detectEmergency, emergencyReply, SAFETY_RULE_VERSION } from './safety/emergency.guard';
import { checkOutput, OUTPUT_GUARD_VERSION } from './safety/outputGuard';
import { corpusFromText, type GuardCorpus } from './safety/guardCorpus';
import {
  buildPatientContext,
  contextCharCount,
  type PatientContext,
} from './context/patientContext';
import { retrievePatientContext } from './memory/retrieval';
import { assemblePrompt, type RecentTurn } from './prompt/assemblePrompt';
import { PROMPT_VERSION } from './prompt/systemPrompt';
import { generateReply } from './pipeline';
import { shouldSummarise, summariseConversation } from './memory/summariser';
import {
  NOT_CONNECTED_REPLY,
  NO_ANSWER_REPLY,
  OUTPUT_BLOCKED_REPLY,
  POLICY_BLOCKED_REPLY,
  PROVIDER_UNAVAILABLE_REPLY,
  budgetDeferredReply,
} from './replies';

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights service — assistant v2 (25 Sep 2026).
//
// The order of checks in `sendMessage` is deliberate and safety-load-bearing:
//
//   1. Input validation (the caller, ai.controller.ts, already did this)
//   2. EMERGENCY INTERLOCK — pure, local, zero I/O, zero tokens. Runs before
//      anything else can delay or skip it. See safety/emergency.guard.ts.
//   3. Data-policy gate — real patient data must not transit an unvetted
//      inference tier. Fails closed on anything not explicitly flagged
//      synthetic.
//   4. Record → retrieval → prompt (the record the portal shows the patient,
//      selected for this question; see context/ and memory/retrieval.ts).
//   5. Budget reservation, provider call, one retry (pipeline.ts).
//   6. Output guard over the reply, grounded in exactly what the model saw.
//
// Every non-Model turn (interlock, policy block, budget deferral, provider
// failure, output rejection) is a FIXED, versioned string — never
// model-composed — so the transcript can never imply the assistant said
// something clinical that it did not.
// ─────────────────────────────────────────────────────────────────────────────

const RECENT_TURNS_FOR_PROMPT = 8;
const LONG_TERM_MEMORY_LIMIT = 2;
/** Stored on every generated turn: which prompt, guard and interlock rules
 *  produced and checked it. */
const TURN_VERSION = `${PROMPT_VERSION}|${OUTPUT_GUARD_VERSION}|${SAFETY_RULE_VERSION}`;

/**
 * Whose allowance a turn spends. `evaluation` is the operator's evaluation
 * harness (scripts/ai-eval.ts): it spends the SHARED provider budget like
 * any turn, but never the patient's own daily question allowance. Not
 * reachable over HTTP.
 */
export type Accounting = 'patient' | 'evaluation';

/** A conversation is named after the question that started it, which is what
 *  makes the history list scannable without opening anything. */
function deriveTitle(firstMessage: string): string {
  const oneLine = firstMessage.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 60) return oneLine;
  const cut = oneLine.slice(0, 60);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

async function requireOwnConversation(id: string, userId: string): Promise<void> {
  const found = await aiRepository.findConversationForUser(id, userId);
  // 404, not 403: a conversation belonging to someone else must be
  // indistinguishable from one that does not exist, or the id space itself
  // becomes enumerable.
  if (found === null) throw new AppError('Conversation not found.', 404);
}

/** One fixed, versioned reply, stored and returned without calling the model. */
async function shortCircuit(
  conversationId: string,
  userQuestion: string,
  kind: AiMessageKind,
  reply: string,
  version: string = SAFETY_RULE_VERSION,
): Promise<{ conversationId: string; messages: MessageRow[] }> {
  await aiRepository.appendTurn(conversationId, [
    { role: AiMessageRole.User, content: userQuestion },
    { role: AiMessageRole.Assistant, content: reply, kind, safetyRuleVersion: version },
  ]);
  return { conversationId, messages: await aiRepository.listMessages(conversationId) };
}

/** After the summarisation window is passed, folds new turns into the
 *  conversation's rolling summary. Runs fire-and-forget from the caller —
 *  never on the patient's critical path — and any failure here is silent by
 *  design (the next turn just carries a slightly stale summary). */
async function maybeSummarise(
  userId: string,
  conversationId: string,
  requestId: string,
): Promise<void> {
  try {
    const [messageCount, summaryState] = await Promise.all([
      aiRepository.countMessages(conversationId),
      aiRepository.getSummaryState(conversationId),
    ]);
    if (summaryState === null) return;
    if (!shouldSummarise(messageCount, summaryState.summaryThroughMessageId)) return;

    const recent = await aiRepository.listRecentMessages(
      conversationId,
      RECENT_TURNS_FOR_PROMPT * 2,
    );
    if (recent.length === 0) return;

    const result = await summariseConversation(userId, summaryState.summary, recent);
    if (result === null) return;

    await aiRepository.saveSummary(
      conversationId,
      result.summary,
      recent[recent.length - 1].id,
      result.tokenCount,
    );
  } catch (err) {
    console.error(
      `[ai][${requestId}] summariser failed (non-fatal):`,
      err instanceof Error ? err.message : err,
    );
  }
}

export const aiService = {
  async listConversations(userId: string): Promise<ConversationSummary[]> {
    return aiRepository.listConversations(userId);
  },

  async getConversation(
    userId: string,
    id: string,
  ): Promise<{ id: string; title: string; messages: MessageRow[] }> {
    const conversation = await aiRepository.findConversationForUser(id, userId);
    if (conversation === null) throw new AppError('Conversation not found.', 404);

    const messages = await aiRepository.listMessages(id);
    return { id: conversation.id, title: conversation.title, messages };
  },

  /**
   * Sends a message. Creates the conversation on the first message rather than
   * requiring a separate "new chat" call, so an empty conversation can never
   * exist in the sidebar.
   */
  async sendMessage(
    userId: string,
    conversationId: string | null,
    dto: SendMessageDto,
    requestId: string = randomUUID(),
    accounting: Accounting = 'patient',
  ): Promise<{ conversationId: string; messages: MessageRow[] }> {
    let id = conversationId;
    if (id === null) {
      id = await aiRepository.createConversation(userId, deriveTitle(dto.content));
    } else {
      await requireOwnConversation(id, userId);
    }

    // ── 1. Emergency interlock — before anything else, zero tokens ──────────
    const emergency = detectEmergency(dto.content);
    if (emergency !== null) {
      auditService.log({
        action: AuditAction.AiEmergencyInterlockTriggered,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity: AuditSeverity.Critical,
        metadata: {
          requestId,
          source: 'input',
          category: emergency.category,
          ruleId: emergency.ruleId,
          ruleVersion: emergency.ruleVersion,
        },
      });
      return shortCircuit(
        id,
        dto.content,
        AiMessageKind.SafetyInterlock,
        emergencyReply(emergency.category),
      );
    }

    // ── 2. Is the assistant even switched on? ────────────────────────────────
    if (!aiEnabled) {
      return shortCircuit(id, dto.content, AiMessageKind.Placeholder, NOT_CONNECTED_REPLY);
    }

    // ── 3. Data-policy gate — fails CLOSED ───────────────────────────────────
    const now = new Date();
    const patientContext: PatientContext | null = await buildPatientContext(userId, now);
    const isSynthetic = patientContext?.isSyntheticData === true;
    if (env.AI_DATA_POLICY === 'synthetic-only' && !isSynthetic) {
      auditService.log({
        action: AuditAction.AiPolicyBlocked,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity: AuditSeverity.Warning,
        metadata: { requestId, policy: env.AI_DATA_POLICY },
      });
      return shortCircuit(id, dto.content, AiMessageKind.PolicyBlocked, POLICY_BLOCKED_REPLY);
    }

    // ── 4. Record → retrieval → prompt ───────────────────────────────────────
    // Awaited, not fire-and-forget: a patient who just edited a medication
    // and immediately asks about it must see the new text on THIS turn.
    const [recentRows, summaryState, longTermSummaries] = await Promise.all([
      aiRepository.listRecentMessages(id, RECENT_TURNS_FOR_PROMPT),
      aiRepository.getSummaryState(id),
      aiRepository.listOtherConversationSummaries(userId, id, LONG_TERM_MEMORY_LIMIT),
    ]);
    const previousQuestion =
      [...recentRows].reverse().find((r) => r.role === AiMessageRole.User)?.content ?? null;
    const retrieval =
      patientContext !== null
        ? await retrievePatientContext(userId, patientContext, dto.content, previousQuestion)
        : null;
    const recentTurns: RecentTurn[] = recentRows.map((r) => ({
      role: r.role === AiMessageRole.User ? 'User' : 'Assistant',
      content: r.content,
      kind: r.kind,
    }));

    const prompt = assemblePrompt({
      patientContext:
        patientContext !== null && retrieval !== null
          ? { demographicsLine: patientContext.demographicsLine, contextText: retrieval.text }
          : null,
      longTermMemorySummaries: longTermSummaries,
      conversationSummary: summaryState?.summary ?? null,
      recentTurns,
      question: dto.content,
      now,
    });

    // The guard grounds the reply in exactly what the model was shown this
    // turn (a record line it never saw is not "supplied context"), plus the
    // whole-record facts that are true regardless of selection.
    const corpus: GuardCorpus =
      patientContext !== null
        ? { text: prompt.groundText, question: dto.content, ...patientContext.guard }
        : { ...corpusFromText(prompt.groundText), question: dto.content };

    auditService.log({
      action: AuditAction.AiMessageSent,
      userId,
      resource: 'ai_conversation',
      resourceId: id,
      metadata: {
        requestId,
        promptVersion: PROMPT_VERSION,
        trimmed: prompt.trimmed,
        recordLines: retrieval?.chunkCount ?? 0,
        wholeRecord: retrieval?.usedAll ?? false,
        similarity: retrieval?.usedSimilaritySearch ?? false,
        accounting,
      },
    });

    // ── 5. Reserve, call, retry once ─────────────────────────────────────────
    const result = await generateReply({
      userId,
      messages: prompt.messages,
      scope: accounting === 'evaluation' ? 'system' : 'patient',
    });

    if (result.kind === 'budget') {
      auditService.log({
        action: AuditAction.AiBudgetExceeded,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity: AuditSeverity.Warning,
        metadata: { requestId, reason: result.reason },
      });
      return shortCircuit(
        id,
        dto.content,
        AiMessageKind.BudgetDeferred,
        budgetDeferredReply(result.reason, result.retryAfterSeconds),
      );
    }

    if (result.kind === 'provider_error' || result.kind === 'no_answer') {
      const outcome = result.kind === 'provider_error' ? result.outcome : null;
      const status = outcome !== null && 'statusCode' in outcome ? outcome.statusCode : undefined;
      auditService.log({
        action: AuditAction.AiProviderError,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity: status === 401 || status === 403 ? AuditSeverity.Critical : AuditSeverity.Warning,
        // Category and status only — never the upstream body, never the key.
        metadata: {
          requestId,
          outcome: outcome?.kind ?? 'no_answer',
          statusCode: status,
          attempts: result.kind === 'no_answer' ? result.attempts : 1,
          durationMs: result.durationMs,
        },
      });
      return shortCircuit(
        id,
        dto.content,
        AiMessageKind.ProviderUnavailable,
        result.kind === 'no_answer' ? NO_ANSWER_REPLY : PROVIDER_UNAVAILABLE_REPLY,
        TURN_VERSION,
      );
    }

    // ── 6. Post-generation output checks ─────────────────────────────────────
    const check = checkOutput(result.content, corpus, { finishReason: result.finishReason });
    let finalReply = result.content.trim();
    let finalKind: AiMessageKind = AiMessageKind.Model;

    if (!check.ok) {
      auditService.log({
        action: AuditAction.AiOutputBlocked,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity: AuditSeverity.Warning,
        metadata: {
          requestId,
          failure: check.failure,
          promptVersion: PROMPT_VERSION,
          guardVersion: OUTPUT_GUARD_VERSION,
        },
      });
      if (check.emergencyCategory !== undefined) {
        // The reply restated an emergency happening now: show the fixed
        // interlock, not a refusal.
        auditService.log({
          action: AuditAction.AiEmergencyInterlockTriggered,
          userId,
          resource: 'ai_conversation',
          resourceId: id,
          severity: AuditSeverity.Critical,
          metadata: {
            requestId,
            source: 'output',
            category: check.emergencyCategory,
            ruleVersion: SAFETY_RULE_VERSION,
          },
        });
        finalReply = emergencyReply(check.emergencyCategory);
        finalKind = AiMessageKind.SafetyInterlock;
      } else {
        finalReply = OUTPUT_BLOCKED_REPLY;
        finalKind = AiMessageKind.SafetyBlocked;
      }
    } else {
      auditService.log({
        action: AuditAction.AiResponseGenerated,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        metadata: {
          requestId,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          finishReason: result.finishReason,
          attempts: result.attempts,
          durationMs: result.durationMs,
          promptVersion: PROMPT_VERSION,
          guardVersion: OUTPUT_GUARD_VERSION,
        },
      });
    }

    await aiRepository.appendTurn(id, [
      { role: AiMessageRole.User, content: dto.content },
      {
        role: AiMessageRole.Assistant,
        content: finalReply,
        kind: finalKind,
        safetyRuleVersion: TURN_VERSION,
      },
    ]);

    // Fire-and-forget: never on the patient's critical path.
    void maybeSummarise(userId, id, requestId);

    return { conversationId: id, messages: await aiRepository.listMessages(id) };
  },

  async rename(userId: string, id: string, dto: RenameConversationDto): Promise<void> {
    const count = await aiRepository.renameForUser(id, userId, dto.title);
    if (count === 0) throw new AppError('Conversation not found.', 404);
  },

  async remove(userId: string, id: string): Promise<void> {
    const count = await aiRepository.softDeleteForUser(id, userId);
    if (count === 0) throw new AppError('Conversation not found.', 404);
    auditService.log({
      action: AuditAction.AiConversationDeleted,
      userId,
      resource: 'ai_conversation',
      resourceId: id,
    });
  },
};

/** Exported for the freshness/staleness test — never used in the request path. */
export { contextCharCount };
