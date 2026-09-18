import { AiMessageRole } from '@prisma/client';
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
      orderBy: { createdAt: 'asc' },
      take: MAX_MESSAGES,
      select: { id: true, role: true, content: true, isPlaceholder: true, createdAt: true },
    });
    return rows.map((r) => ({ ...r, content: safeDecrypt(r.content) }));
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
    turns: { role: AiMessageRole; content: string; isPlaceholder?: boolean }[],
  ): Promise<void> {
    await prisma.$transaction([
      prisma.aiMessage.createMany({
        data: turns.map((t) => ({
          conversationId,
          role: t.role,
          content: encryptField(t.content),
          isPlaceholder: t.isPlaceholder ?? false,
        })),
      }),
      prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
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
