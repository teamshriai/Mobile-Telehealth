/**
 * feedback.service.js
 *
 * A patient's own feedback on a doctor, hospital service, or the app.
 */

import apiClient from '../lib/apiClient'

export async function submitFeedback(payload) {
  const { feedback } = await apiClient.post('/feedback', payload)
  return feedback
}
