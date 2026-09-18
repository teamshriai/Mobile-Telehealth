import { AiMessageKind, AiMessageRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { aiRepository, type ConversationSummary, type MessageRow } from './ai.repository';
import { AppError } from '../middleware/errorHandler';
import type { SendMessageDto, RenameConversationDto } from './ai.validator';
import { env, aiEnabled } from '../config/env.config';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { detectEmergency, emergencyReply, SAFETY_RULE_VERSION } from './safety/emergency.guard';
import { checkOutput, OUTPUT_BLOCKED_REPLY } from './safety/outputGuard';
import { reserveBudget, estimateTokens } from './budget/aiBudget';
import {
  buildPatientContext,
  contextCharCount,
  type PatientContext,
} from './context/patientContext';
import { retrievePatientContext } from './memory/retrieval';
import { assemblePrompt, type RecentTurn } from './prompt/assemblePrompt';
import { PROMPT_VERSION } from './prompt/systemPrompt';
import { callModel } from './provider/groqClient';
import { shouldSummarise, summariseConversation } from './memory/summariser';

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights service — Phase 8.
//
// The order of checks in `sendMessage` is deliberate and safety-load-bearing:
//
//   1. Input validation (the caller, ai.controller.ts, already did this)
//   2. EMERGENCY INTERLOCK — pure, local, zero I/O, zero tokens. Runs before
//      anything else can delay or skip it. See safety/emergency.guard.ts.
//   3. Data-policy gate — real patient data must not transit an unvetted
//      inference tier. See §0.1: fails closed on anything not explicitly
//      flagged synthetic.
//   4. Budget reservation — before the provider is ever called.
//   5. Context + prompt assembly, provider call, output checks.
//
// Every non-Model turn (interlock, policy block, budget deferral, output
// rejection) is a FIXED, versioned string — never model-composed — so the
// transcript can never imply the assistant said something clinical that it
// did not. This is the same discipline the placeholder-only version of this
// file already had; the model landing does not relax it.
// ─────────────────────────────────────────────────────────────────────────────

const RECENT_TURNS_FOR_PROMPT = 6;
const LONG_TERM_MEMORY_LIMIT = 2;

/** Shown only when AI_ENABLED effectively has no key configured at all — the
 *  documented, supported "not connected yet" state from before this phase. */
const NOT_CONNECTED_REPLY =
  'The assistant is not connected yet, so I cannot answer this. Your question ' +
  'has been saved. Once it is switched on it will answer from your own ' +
  'medicines, visits and recovery — and never from guesswork. For anything ' +
  'urgent, contact your care team or call 108.';

const POLICY_BLOCKED_REPLY =
  'The assistant is not enabled for real patient records on this deployment ' +
  'yet. Your question has been saved. For anything urgent, contact your care ' +
  'team or call 108.';

function budgetDeferredReply(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.round(retryAfterSeconds / 60));
  return (
    `The assistant is busy right now. Your question has been saved — please try ` +
    `again in about ${minutes} minute${minutes === 1 ? '' : 's'}. For anything urgent, ` +
    'contact your care team or call 108.'
  );
}

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
): Promise<{ conversationId: string; messages: MessageRow[] }> {
  await aiRepository.appendTurn(conversationId, [
    { role: AiMessageRole.User, content: userQuestion },
    { role: AiMessageRole.Assistant, content: reply, kind, safetyRuleVersion: SAFETY_RULE_VERSION },
  ]);
  return { conversationId, messages: await aiRepository.listMessages(conversationId) };
}

/** After the summarisation window is passed, folds new turns into the
 *  conversation's rolling summary. Runs fire-and-forget from the caller —
 *  never on the patient's critical path — and any failure here is silent by
 *  design (the next turn just carries a slightly stale summary). */
async function maybeSummarise(conversationId: string, requestId: string): Promise<void> {
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

    const result = await summariseConversation(summaryState.summary, recent);
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

    // ── 3. Data-policy gate — real patient data never transits an unvetted
    //      free tier. Fails CLOSED: no profile, or a profile not explicitly
    //      flagged synthetic, is treated as real. ───────────────────────────
    const patientContext: PatientContext | null = await buildPatientContext(userId);
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

    // ── 4. Retrieve (sync chunks, then bypass-all or top-k) ──────────────────
    // Awaited, not fire-and-forget: a patient who just edited a medication
    // and immediately asks about it must see the new text on THIS turn.
    const retrieval =
      patientContext !== null
        ? await retrievePatientContext(userId, patientContext, dto.content)
        : null;
    const promptContext =
      patientContext !== null && retrieval !== null
        ? { demographicsLine: patientContext.demographicsLine, contextText: retrieval.contextText }
        : null;

    // ── 5. Assemble the prompt (memory + context) ─────────────────────────────
    const [recentRows, summaryState, longTermSummaries] = await Promise.all([
      aiRepository.listRecentMessages(id, RECENT_TURNS_FOR_PROMPT),
      aiRepository.getSummaryState(id),
      aiRepository.listOtherConversationSummaries(userId, id, LONG_TERM_MEMORY_LIMIT),
    ]);
    const recentTurns: RecentTurn[] = recentRows.map((r) => ({
      role: r.role === AiMessageRole.User ? 'User' : 'Assistant',
      content: r.content,
    }));

    const prompt = assemblePrompt({
      patientContext: promptContext,
      longTermMemorySummaries: longTermSummaries,
      conversationSummary: summaryState?.summary ?? null,
      recentTurns,
      question: dto.content,
    });
    // Fabrication-checked against exactly what was RETRIEVED for this turn,
    // not the patient's whole record — under top-k search, a chunk the model
    // never saw must not count as "supplied context" for that check.
    const contextTextForFabricationCheck = retrieval?.contextText ?? '';

    // ── 6. Budget reservation, before the provider is ever called ────────────
    const promptChars = prompt.messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimated =
      estimateTokens(promptChars, prompt.messages.length) + env.AI_MAX_COMPLETION_TOKENS;
    const reservation = await reserveBudget({ userId, estimatedTokens: estimated });
    if (!reservation.ok) {
      auditService.log({
        action: AuditAction.AiBudgetExceeded,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity: AuditSeverity.Warning,
        metadata: { requestId, reason: reservation.reason },
      });
      return shortCircuit(
        id,
        dto.content,
        AiMessageKind.BudgetDeferred,
        budgetDeferredReply(reservation.retryAfterSeconds),
      );
    }

    auditService.log({
      action: AuditAction.AiMessageSent,
      userId,
      resource: 'ai_conversation',
      resourceId: id,
      metadata: { requestId, promptVersion: PROMPT_VERSION, trimmed: prompt.trimmed },
    });

    // ── 7. Call the model ─────────────────────────────────────────────────────
    const startedAt = Date.now();
    const outcome = await callModel(prompt.messages);
    const durationMs = Date.now() - startedAt;

    if (outcome.kind !== 'ok') {
      reservation.release();
      const severity =
        outcome.kind === 'terminal_error' &&
        (outcome.statusCode === 401 || outcome.statusCode === 403)
          ? AuditSeverity.Critical
          : AuditSeverity.Warning;
      auditService.log({
        action: AuditAction.AiProviderError,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity,
        // Category and status only — never the upstream body, never the key.
        metadata: {
          requestId,
          outcome: outcome.kind,
          statusCode: 'statusCode' in outcome ? outcome.statusCode : undefined,
          durationMs,
        },
      });
      return shortCircuit(id, dto.content, AiMessageKind.BudgetDeferred, budgetDeferredReply(60));
    }

    await reservation.commit({
      promptTokens: outcome.promptTokens,
      completionTokens: outcome.completionTokens,
    });

    // ── 8. Post-generation output checks ──────────────────────────────────────
    const check = checkOutput(outcome.content, contextTextForFabricationCheck);
    let finalReply = outcome.content;
    let finalKind: AiMessageKind = AiMessageKind.Model;

    if (!check.ok) {
      auditService.log({
        action: AuditAction.AiOutputBlocked,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        severity: AuditSeverity.Warning,
        metadata: { requestId, failure: check.failure, promptVersion: PROMPT_VERSION },
      });
      finalReply = OUTPUT_BLOCKED_REPLY;
      finalKind = AiMessageKind.SafetyBlocked;
    } else {
      auditService.log({
        action: AuditAction.AiResponseGenerated,
        userId,
        resource: 'ai_conversation',
        resourceId: id,
        metadata: {
          requestId,
          promptTokens: outcome.promptTokens,
          completionTokens: outcome.completionTokens,
          finishReason: outcome.finishReason,
          durationMs,
          promptVersion: PROMPT_VERSION,
        },
      });
    }

    await aiRepository.appendTurn(id, [
      { role: AiMessageRole.User, content: dto.content },
      { role: AiMessageRole.Assistant, content: finalReply, kind: finalKind },
    ]);

    // Fire-and-forget: never on the patient's critical path.
    void maybeSummarise(id, requestId);

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
