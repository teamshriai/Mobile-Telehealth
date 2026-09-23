import apiClient from '../lib/apiClient'
import type {
  BreakGlassIdentity,
  BreakGlassGrantView,
  BreakGlassReviewRow,
  BreakGlassReason,
} from '../types/domain'

/**
 * breakGlass.service.ts — emergency access (UI_ATLAS §3.2 / DD-014).
 *
 * The flow: a clinical read 403s with `breakGlass: true` → the UI fetches
 * `getIdentity` (name and UHID only) → the clinician states a reason →
 * `requestGrant` → the original read is retried and now succeeds.
 */

/** The five fixed categories. ⚠️ Not extensible without a spec change. */
export const BREAK_GLASS_REASONS: Array<{ value: BreakGlassReason; label: string }> = [
  { value: 'EmergencyCare', label: 'Emergency care' },
  { value: 'CoveringColleague', label: 'Covering a colleague' },
  { value: 'OnCallReview', label: 'On-call review' },
  { value: 'QualityReview', label: 'Quality review' },
  { value: 'Other', label: 'Other' },
]

/** ⚠️ Name and UHID only. Nothing clinical renders before a reason is given. */
export async function getIdentity(shriPatientId: string): Promise<BreakGlassIdentity> {
  const { identity } = await apiClient.get<{ identity: BreakGlassIdentity }>(
    `/breakglass/identity/${shriPatientId}`,
  )
  return identity
}

export interface RequestGrantPayload {
  reasonCategory: BreakGlassReason
  reason: string
  acknowledged: true
}

export async function requestGrant(
  shriPatientId: string,
  payload: RequestGrantPayload,
): Promise<{ grant: { id: string; expiresAt: string }; audited: boolean }> {
  return apiClient.post(`/breakglass/grants/${shriPatientId}`, payload)
}

/** Drives the persistent GP-10 amber banner. */
export async function listActiveGrants(): Promise<BreakGlassGrantView[]> {
  const { grants } = await apiClient.get<{ grants: BreakGlassGrantView[] }>(
    '/breakglass/grants/active',
  )
  return grants
}

export async function listForReview(includeReviewed = false): Promise<BreakGlassReviewRow[]> {
  const { grants } = await apiClient.get<{ grants: BreakGlassReviewRow[] }>('/breakglass/review', {
    params: { includeReviewed: String(includeReviewed) },
  })
  return grants
}

export async function reviewGrant(
  id: string,
  outcome: 'Appropriate' | 'Inappropriate',
  reviewNote?: string | null,
): Promise<void> {
  return apiClient.patch(`/breakglass/review/${id}`, { outcome, reviewNote: reviewNote ?? null })
}
