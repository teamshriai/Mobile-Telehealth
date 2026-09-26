/**
 * ai.service.ts
 *
 * Thin wrapper over the AI Insights endpoints. Same shape as the other
 * services: pure async functions, one apiClient import, no UI or state.
 */

import apiClient from '../lib/apiClient'
import type { AiConversation, AiConversationSummary, AiMessage } from '../types/domain'

export async function listConversations(): Promise<AiConversationSummary[]> {
  const { conversations } = await apiClient.get<{ conversations: AiConversationSummary[] }>(
    '/ai/conversations',
  )
  return conversations
}

export async function getConversation(id: string): Promise<AiConversation> {
  const { conversation } = await apiClient.get<{ conversation: AiConversation }>(
    `/ai/conversations/${id}`,
  )
  return conversation
}

/**
 * Sends a message. Omit `conversationId` to start a new conversation — the
 * server creates it from the first question, so an empty thread never exists.
 */
export async function sendMessage(
  content: string,
  conversationId: string | null = null,
): Promise<{ conversationId: string; messages: AiMessage[] }> {
  // ⚠️ 45s, not the shared 15s: a turn may wait for the provider's per-minute
  // window and retry once (server AI_OVERALL_DEADLINE_MS = 30s). The server
  // always gives up first, so the patient sees its own words, never a raw
  // network timeout.
  return apiClient.post('/ai/messages', { content, conversationId }, { timeout: 45_000 })
}

export async function renameConversation(id: string, title: string): Promise<AiConversation> {
  return apiClient.patch(`/ai/conversations/${id}`, { title })
}

export async function deleteConversation(id: string): Promise<void> {
  return apiClient.delete(`/ai/conversations/${id}`)
}
