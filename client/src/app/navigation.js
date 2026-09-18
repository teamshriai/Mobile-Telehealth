import {
  Home, Calendar, Pill, FolderHeart, Users, Siren, User, Settings, Sparkles,
} from 'lucide-react'

/**
 * Patient portal navigation — the Phase 1 §I information architecture.
 *
 * Reduced from 9 destinations to 6. What changed and why:
 *
 *  - Timeline + Health Records + Reports → "My Health". Three top-level
 *    destinations for "information about me" was the oncology-era structure;
 *    the timeline is a VIEW of my health, not a peer of it.
 *  - Appointments + Online Meetings → "Appointments". To a patient a video
 *    consultation is an appointment that happens to be remote. Two nav items
 *    for one concept is a needless choice at every visit.
 *  - "Medicines" added. Secondary stroke prevention is overwhelmingly a
 *    medication-adherence problem and it had no home at all.
 *  - "My Care Team" added. Stroke recovery is multi-disciplinary; the data
 *    already existed in fixtures with nowhere to live.
 *  - "Emergency" promoted to top level. It was a dashboard component; on a
 *    stroke product it must be one tap from anywhere.
 *  - "Care Guide" (the AI assistant) was REMOVED from navigation — it returned
 *    three random canned replies presented as clinical reassurance.
 *  - "AI Insights" is its replacement, and is NOT a walk-back of that rule.
 *    The screen is the finished interface with no model behind it, and it says
 *    so on itself: it declines to answer rather than inventing reassurance.
 *    The thing that got Care Guide removed was fabricated clinical confidence,
 *    not the presence of an assistant.
 *
 * Phase 1 also found the same route carrying up to four different names across
 * sidebar, search index, spoke rail and page <h1>. This file is now the single
 * source for labels, so those cannot drift apart again.
 */

export const PATIENT_NAV = [
  {
    label: 'Home',
    path: '/app',
    icon: Home,
    end: true,
    description: 'Your day at a glance',
  },
  {
    label: 'Appointments',
    path: '/app/appointments',
    icon: Calendar,
    description: 'Visits and video consultations',
  },
  {
    label: 'Medicines',
    path: '/app/medicines',
    icon: Pill,
    description: 'What to take, and when',
  },
  {
    label: 'My Health',
    path: '/app/health',
    icon: FolderHeart,
    description: 'Records, reports and your recovery',
  },
  {
    label: 'AI Insights',
    path: '/app/ai-insights',
    icon: Sparkles,
    description: 'Ask about your reports and medicines',
  },
  {
    label: 'My Care Team',
    path: '/app/care-team',
    icon: Users,
    description: 'The people looking after you',
  },
  {
    label: 'Emergency',
    path: '/app/emergency',
    icon: Siren,
    description: 'Get help fast',
    /** Rendered in the emergency treatment, visually separated from the rest. */
    tone: 'emergency',
  },
]

/** Account items — same nav, visually separated in a footer group. */
export const PATIENT_ACCOUNT_NAV = [
  { label: 'Profile', path: '/app/profile', icon: User },
  { label: 'Settings', path: '/app/settings', icon: Settings },
]

/**
 * Breadcrumb/document titles, keyed by path.
 * One map, so the sidebar label and the page title cannot disagree.
 */
export const ROUTE_TITLES = {
  '/app': 'Home',
  '/app/appointments': 'Appointments',
  '/app/medicines': 'Medicines',
  '/app/health': 'My Health',
  '/app/ai-insights': 'AI Insights',
  '/app/care-team': 'My Care Team',
  '/app/emergency': 'Emergency',
  '/app/profile': 'Profile',
  '/app/settings': 'Settings',
}

export function titleForPath(pathname) {
  // Exact match first (the common case), then fall back to the longest
  // registered prefix — so a future nested route like
  // /app/appointments/:id still resolves to "Appointments" rather than the
  // generic "Stroke AI" fallback.
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]

  const prefixes = Object.keys(ROUTE_TITLES)
    .filter((p) => p !== '/app' && pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)

  return ROUTE_TITLES[prefixes[0]] ?? 'Stroke AI'
}
