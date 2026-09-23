/**
 * Shipped-features gate.
 *
 * `/auth/me` advertises every permission the PATIENT ROLE holds — including
 * appointment/notification/care-team capabilities the backend has always been
 * able to grant, independent of whether those endpoints are actually mounted
 * yet. Gating the UI on the raw `permissions` array would render a feature
 * the moment its permission exists, not the moment its API does.
 *
 * This list is the single place that says "Phase 3 shipped this" — updated by
 * a human alongside the API/UI landing together, never inferred from the
 * server's permission map.
 */
export const SHIPPED_FEATURES = new Set([
  'appointments',
  'careTeam',
  'notifications',
  'healthHistory',
])

export function isFeatureShipped(name: string): boolean {
  return SHIPPED_FEATURES.has(name)
}
