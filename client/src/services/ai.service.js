/**
 * ai.service.js
 *
 * Thin wrapper over the AI Insights endpoints. Same shape as the other
 * services: pure async functions, one apiClient import, no UI or state.
 */

import apiClient from '../lib/apiClient'

export async function listConversations() {
  const { conversations } = await apiClient.get('/ai/conversations')
  return conversations
}

export async function getConversation(id) {
  const { conversation } = await apiClient.get(`/ai/conversations/${id}`)
  return conversation
}

/**
 * Sends a message. Omit `conversationId` to start a new conversation — the
 * server creates it from the first question, so an empty thread never exists.
 *
 * @returns {Promise<{ conversationId: string, messages: Array }>}
 */
export async function sendMessage(content, conversationId = null) {
  return apiClient.post('/ai/messages', { content, conversationId })
}

export async function renameConversation(id, title) {
  return apiClient.patch(`/ai/conversations/${id}`, { title })
}

export async function deleteConversation(id) {
  return apiClient.delete(`/ai/conversations/${id}`)
}
