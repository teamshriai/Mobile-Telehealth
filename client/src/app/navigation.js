import {
  Home, Calendar, Pill, FolderHeart, Users, Siren, User, Settings, Sparkles,
  CalendarClock, UserCircle, LayoutDashboard, Stethoscope, Building2,
  CalendarRange, MessageSquareHeart,
} from 'lucide-react'

/**
 * Navigation for every portal, in one file.
 *
 * Previously this was three files with three different item shapes
 * (`navigation.js`, `doctorNavigation.js`, `hospitalAdminNavigation.js`), and
 * two different shells rendered them two different ways — a fixed sidebar for
 * patients, a tab strip for staff. One product should navigate one way, so
 * both shells collapsed into AppShell and the descriptors collapsed here.
 *
 * Item shape, uniform across portals:
 *   { label, path, icon, end?, description?, tone? }
 *
 *   end         — exact-match only, for a portal's index route
 *   description — used by the mobile drawer; optional
 *   tone        — 'emergency' gets the critical treatment, and is the only
 *                 tone. Colour still is not the only carrier: the label says
 *                 "Emergency" and the icon is a siren.
 *
 * ── Patient IA, carried over from Phase 1 §I ──────────────────────────────
 * Reduced from 9 destinations to 6. Timeline + Health Records + Reports
 * became "My Health" (a timeline is a VIEW of my health, not a peer of it);
 * Appointments + Online Meetings became "Appointments" (to a patient a video
 * consultation is an appointment that happens to be remote); Medicines and
 * My Care Team were added; Emergency was promoted from a dashboard component
 * to top level, because on a stroke product it must be one tap from anywhere.
 * "Care Guide" was removed for returning canned replies as clinical
 * reassurance — "AI Insights" is not a walk-back of that: it declines to
 * answer rather than inventing confidence.
 */

export const PATIENT_NAV = [
  { label: 'Home', path: '/app', icon: Home, end: true, description: 'Your day at a glance' },
  { label: 'Appointments', path: '/app/appointments', icon: Calendar, description: 'Visits and video consultations' },
  { label: 'Medicines', path: '/app/medicines', icon: Pill, description: 'What to take, and when' },
  { label: 'My Health', path: '/app/health', icon: FolderHeart, description: 'Records, reports and your recovery' },
  { label: 'AI Insights', path: '/app/ai-insights', icon: Sparkles, description: 'Ask about your medicines and visits' },
  { label: 'My Care Team', path: '/app/care-team', icon: Users, description: 'The people looking after you' },
  { label: 'Emergency', path: '/app/emergency', icon: Siren, description: 'Get help fast', tone: 'emergency' },
]

export const DOCTOR_NAV = [
  { label: 'Home', path: '/clinic', icon: Home, end: true, description: 'Your day at a glance' },
  { label: 'My Patients', path: '/clinic/patients', icon: Users, description: 'Your active care team' },
  { label: 'Availability', path: '/clinic/availability', icon: CalendarClock, description: 'Weekly hours and leave' },
  { label: 'Profile', path: '/clinic/profile', icon: UserCircle, description: 'Your professional details' },
]

export const HOSPITAL_ADMIN_NAV = [
  { label: 'Overview', path: '/hospital-admin', icon: LayoutDashboard, end: true, description: 'Activity at your hospital' },
  { label: 'Doctors', path: '/hospital-admin/doctors', icon: Stethoscope, description: 'Roster and verification' },
  { label: 'Patients', path: '/hospital-admin/patients', icon: Users, description: 'Patients seen at your hospital' },
  { label: 'Appointments', path: '/hospital-admin/appointments', icon: CalendarRange, description: 'Operational view' },
  { label: 'Feedback', path: '/hospital-admin/feedback', icon: MessageSquareHeart, description: 'What patients said' },
  { label: 'Hospital', path: '/hospital-admin/hospital', icon: Building2, description: 'Your hospital profile' },
]

/**
 * Per-portal descriptor. `account` is what the navbar's account menu offers
 * besides Sign out.
 *
 * Only the patient portal has a Settings route today — /app/settings is
 * mounted under the patient tree and its content is patient-scoped. Staff get
 * Profile only rather than a link that 404s or renders someone else's
 * preferences.
 */
const PORTALS = {
  Patient: {
    label: 'Patient Portal',
    home: '/app',
    items: PATIENT_NAV,
    account: [
      { label: 'Profile', path: '/app/profile', icon: User },
      { label: 'Settings', path: '/app/settings', icon: Settings },
    ],
  },
  Doctor: {
    label: 'Doctor Portal',
    home: '/clinic',
    items: DOCTOR_NAV,
    account: [{ label: 'Profile', path: '/clinic/profile', icon: User }],
  },
  HospitalAdmin: {
    label: 'Hospital Admin',
    home: '/hospital-admin',
    items: HOSPITAL_ADMIN_NAV,
    account: [],
  },
}

/** Portals with no navigation of their own fall back to an empty shell rather
 *  than borrowing another role's menu. */
const EMPTY_PORTAL = { label: 'Stroke AI', home: '/', items: [], account: [] }

export function portalForRole(role) {
  return PORTALS[role] ?? EMPTY_PORTAL
}

/**
 * Document/breadcrumb titles for every route in every portal. One map, so a
 * nav label and a page title cannot drift apart.
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

  '/clinic': 'Home',
  '/clinic/patients': 'My Patients',
  '/clinic/availability': 'Availability',
  '/clinic/profile': 'Profile',

  '/hospital-admin': 'Overview',
  '/hospital-admin/doctors': 'Doctors',
  '/hospital-admin/patients': 'Patients',
  '/hospital-admin/appointments': 'Appointments',
  '/hospital-admin/feedback': 'Feedback',
  '/hospital-admin/hospital': 'Hospital',
}

/** Portal index routes, which must never win a prefix match — otherwise
 *  /hospital-admin/doctors resolves to "Overview". The old PortalShell had
 *  exactly that bug. */
const PORTAL_ROOTS = new Set(['/app', '/clinic', '/hospital-admin'])

export function titleForPath(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]

  // Longest registered prefix, so a nested route like
  // /clinic/patients/:id still resolves to "My Patients".
  const prefixes = Object.keys(ROUTE_TITLES)
    .filter((p) => !PORTAL_ROOTS.has(p) && pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)

  return ROUTE_TITLES[prefixes[0]] ?? 'Stroke AI'
}
