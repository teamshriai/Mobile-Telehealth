import { AiMessageRole } from '@prisma/client';
import { aiRepository, type ConversationSummary, type MessageRow } from './ai.repository';
import { AppError } from '../middleware/errorHandler';
import type { SendMessageDto, RenameConversationDto } from './ai.validator';

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights service
//
// There is no model behind this yet. Every assistant turn is therefore stored
// as an explicit placeholder saying so, rather than as prose that could later
// be mistaken for something the assistant actually advised.
//
// That is a deliberate product rule, not a stub: navigation.js records that the
// previous assistant was REMOVED from this product for "three random canned
// replies presented as clinical reassurance". Persisting invented answers into
// a permanent, encrypted transcript would be a worse version of the same
// mistake. When a real model is connected, the only change here is producing
// the assistant turn from it and setting isPlaceholder false.
// ─────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_REPLY =
  'The assistant is not connected yet, so I cannot answer this. Your question ' +
  'has been saved. Once it is switched on it will answer from your own ' +
  'records — your reports, medicines and care-team notes — and never from ' +
  'guesswork. For anything urgent, contact your care team or call 108.';

/** A conversation is named after the question that started it, which is what
 *  makes the history list scannable without opening anything. */
function deriveTitle(firstMessage: string): string {
  const oneLine = firstMessage.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 60) return oneLine;
  // Prefer a word boundary so titles do not end mid-word.
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
  ): Promise<{ conversationId: string; messages: MessageRow[] }> {
    let id = conversationId;

    if (id === null) {
      id = await aiRepository.createConversation(userId, deriveTitle(dto.content));
    } else {
      await requireOwnConversation(id, userId);
    }

    await aiRepository.appendTurn(id, [
      { role: AiMessageRole.User, content: dto.content },
      { role: AiMessageRole.Assistant, content: PLACEHOLDER_REPLY, isPlaceholder: true },
    ]);

    return { conversationId: id, messages: await aiRepository.listMessages(id) };
  },

  async rename(userId: string, id: string, dto: RenameConversationDto): Promise<void> {
    const count = await aiRepository.renameForUser(id, userId, dto.title);
    if (count === 0) throw new AppError('Conversation not found.', 404);
  },

  async remove(userId: string, id: string): Promise<void> {
    const count = await aiRepository.softDeleteForUser(id, userId);
    if (count === 0) throw new AppError('Conversation not found.', 404);
  },
};
