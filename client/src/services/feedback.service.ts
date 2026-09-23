/**
 * feedback.service.ts
 *
 * A patient's own feedback on a doctor, hospital service, or the app.
 */

import apiClient from '../lib/apiClient'
import type { Feedback, FeedbackCategory } from '../types/domain'

export interface SubmitFeedbackPayload {
  category: FeedbackCategory
  rating: number
  comment?: string | null
  doctorId?: string | null
  appointmentId?: string | null
}

export async function submitFeedback(payload: SubmitFeedbackPayload): Promise<Feedback> {
  const { feedback } = await apiClient.post<{ feedback: Feedback }>('/feedback', payload)
  return feedback
}
