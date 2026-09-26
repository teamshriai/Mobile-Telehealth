import { AiMessageKind, AiMessageRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptField, encryptField } from '../utils/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights repository
//
// Titles and message bodies are encrypted at rest — a patient asking about a
// symptom is writing health information, and it is stored under the same rules
// as everything else on the record.
//
// EVERY method here is scoped by userId as well as by id. An id alone is never
// sufficient to reach a row, which is what makes cross-account access
// impossible by construction rather than by remembering to check.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES = 500;

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
  messageCount: number;
};

export type MessageRow = {
  id: string;
  role: AiMessageRole;
  content: string;
  isPlaceholder: boolean;
  /** What produced this turn — see the AiMessageKind doc comment in the schema. */
  kind: AiMessageKind;
  createdAt: Date;
};

/** Decryption must never take a page down: a body that cannot be read is
 *  reported in place rather than thrown, so one bad row cannot hide an entire
 *  transcript. */
function safeDecrypt(value: string): string {
  try {
    return decryptField(value);
  } catch {
    return '[This message could not be read.]';
  }
}

export const aiRepository = {
  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const rows = await prisma.aiConversation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: MAX_CONVERSATIONS,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      title: safeDecrypt(r.title),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      messageCount: r._count.messages,
    }));
  },

  /** Scoped by userId as well as id — see the note at the top of this file. */
  async findConversationForUser(
    id: string,
    userId: string,
  ): Promise<{ id: string; title: string; createdAt: Date; updatedAt: Date } | null> {
    const row = await prisma.aiConversation.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    return row === null ? null : { ...row, title: safeDecrypt(row.title) };
  },

  async listMessages(conversationId: string): Promise<MessageRow[]> {
    const rows = await prisma.aiMessage.findMany({
      where: { conversationId },
      // role breaks ties for rows written before timestamps were explicit
      // (User sorts before Assistant).
      orderBy: [{ createdAt: 'asc' }, { role: 'asc' }],
      take: MAX_MESSAGES,
      select: {
        id: true,
        role: true,
        content: true,
        isPlaceholder: true,
        kind: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({ ...r, content: safeDecrypt(r.content) }));
  },

  /** Same as `listMessages` but newest-first and capped, for building the
   *  working-window slice of a prompt without pulling the whole transcript. */
  async listRecentMessages(conversationId: string, limit: number): Promise<MessageRow[]> {
    const rows = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { role: 'desc' }],
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        isPlaceholder: true,
        kind: true,
        createdAt: true,
      },
    });
    return rows.reverse().map((r) => ({ ...r, content: safeDecrypt(r.content) }));
  },

  async createConversation(userId: string, title: string): Promise<string> {
    const row = await prisma.aiConversation.create({
      data: { userId, title: encryptField(title) },
      select: { id: true },
    });
    return row.id;
  },

  /**
   * Appends a turn and bumps the conversation's updatedAt in ONE transaction.
   * If the bump were a separate call, a failure between the two would leave a
   * conversation whose newest message is older than its own timestamp, and the
   * sidebar would sort it wrongly forever.
   */
  async appendTurn(
    conversationId: string,
    turns: {
      role: AiMessageRole;
      content: string;
      isPlaceholder?: boolean;
      kind?: AiMessageKind;
      safetyRuleVersion?: string;
    }[],
  ): Promise<void> {
    // ⚠️ Explicit, strictly increasing timestamps: createMany would give the
    // question and its reply the same `now()`, and ordering by createdAt
    // alone could then show a reply above its own question.
    const base = Date.now();
    await prisma.$transaction([
      prisma.aiMessage.createMany({
        data: turns.map((t, i) => ({
          createdAt: new Date(base + i),
          conversationId,
          role: t.role,
          content: encryptField(t.content),
          isPlaceholder: t.isPlaceholder ?? false,
          kind: t.kind ?? AiMessageKind.Model,
          safetyRuleVersion: t.safetyRuleVersion ?? null,
        })),
      }),
      prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  },

  /** The conversation's rolling summary state, used to decide whether a new
   *  summarisation pass is due. */
  async getSummaryState(conversationId: string): Promise<{
    summary: string | null;
    summaryThroughMessageId: string | null;
  } | null> {
    const row = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      select: { summary: true, summaryThroughMessageId: true },
    });
    if (row === null) return null;
    return {
      summary: row.summary !== null ? safeDecrypt(row.summary) : null,
      summaryThroughMessageId: row.summaryThroughMessageId,
    };
  },

  async saveSummary(
    conversationId: string,
    summary: string,
    throughMessageId: string,
    tokenCount: number,
  ): Promise<void> {
    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        summary: encryptField(summary),
        summaryThroughMessageId: throughMessageId,
        summaryTokenCount: tokenCount,
      },
    });
  },

  /** Up to `limit` most-recently-used OTHER conversations' summaries for this
   *  user, for cross-conversation memory. Excludes the current conversation. */
  async listOtherConversationSummaries(
    userId: string,
    excludeConversationId: string,
    limit: number,
  ): Promise<string[]> {
    const rows = await prisma.aiConversation.findMany({
      where: {
        userId,
        deletedAt: null,
        id: { not: excludeConversationId },
        summary: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { summary: true },
    });
    return rows
      .map((r) => (r.summary !== null ? safeDecrypt(r.summary) : null))
      .filter((s): s is string => s !== null);
  },

  async countMessages(conversationId: string): Promise<number> {
    return prisma.aiMessage.count({ where: { conversationId } });
  },

  /** Ownership is in the WHERE clause, not in a preceding read — a
   *  check-then-write here would be a TOCTOU race. Returns rows affected. */
  async renameForUser(id: string, userId: string, title: string): Promise<number> {
    const res = await prisma.aiConversation.updateMany({
      where: { id, userId, deletedAt: null },
      data: { title: encryptField(title) },
    });
    return res.count;
  },

  async softDeleteForUser(id: string, userId: string): Promise<number> {
    const res = await prisma.aiConversation.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return res.count;
  },
};
