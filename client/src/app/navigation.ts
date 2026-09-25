import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  CalendarClock, LayoutDashboard, Stethoscope, Building2,
  CalendarRange, MessageSquareHeart,
  FileCheck2,
  Home, Calendar, Pill, FolderHeart, Users, Siren, User, Settings, Sparkles, NotebookPen, FileScan,
  LayoutTemplate, ShieldAlert,
} from 'lucide-react'
import type { RoleName } from '../types/domain'
import type { IconTone } from '../components/common/iconTones'

/**
 * Navigation for every portal, in one file.
 *
 * Previously this was three files with three different item shapes
 * (`navigation.js`, `doctorNavigation.js`, `hospitalAdminNavigation.js`), and
 * two different shells rendered them two different ways — a fixed sidebar for
 * patients, a tab strip for staff. One product should navigate one way, so
 * both shells collapsed into AppShell and the descriptors collapsed here.
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

type IconType = ComponentType<LucideProps>

export interface NavItem {
  label: string
  path: string
  icon: IconType
  /** Exact-match only, for a portal's index route. */
  end?: boolean
  /** Used by the mobile drawer; optional. */
  description?: string
  /** 'emergency' gets the critical treatment, and is the only tone. Colour
   *  still is not the only carrier: the label says "Emergency" and the icon
   *  is a siren. */
  tone?: 'emergency'
  /** The destination's colour (icon tile in lists, tinted glyph in the bar). */
  hue?: IconTone
}

export interface AccountNavItem {
  label: string
  path: string
  icon: IconType
  hue?: IconTone
}

export interface PortalDescriptor {
  label: string
  home: string
  items: NavItem[]
  account: AccountNavItem[]
}

export const PATIENT_NAV: NavItem[] = [
  { label: 'Home', path: '/app', icon: Home, end: true, description: 'Your day at a glance', hue: 'blue' },
  { label: 'Appointments', path: '/app/appointments', icon: Calendar, description: 'Visits and video consultations', hue: 'orange' },
  { label: 'Medicines', path: '/app/medicines', icon: Pill, description: 'What your doctors have prescribed', hue: 'teal' },
  { label: 'My Health', path: '/app/health', icon: FolderHeart, description: 'Conditions, visits and instructions', hue: 'pink' },
  // ⚠️ Patient-GENERATED. Its own destination, not a tab inside My Health,
  // so a note the patient wrote is never shelved beside the record their
  // clinicians wrote as if it were the same kind of thing.
  { label: 'Health Notes', path: '/app/health-notes', icon: NotebookPen, description: 'Notes you write or speak', hue: 'amber' },
  { label: 'Reports', path: '/app/reports', icon: FileScan, description: 'X-rays, scans and test reports', hue: 'indigo' },
  { label: 'AI Insights', path: '/app/ai-insights', icon: Sparkles, description: 'Ask about your medicines and visits', hue: 'violet' },
  { label: 'My doctors', path: '/app/my-doctors', icon: Users, description: 'The doctors looking after you', hue: 'green' },
  { label: 'Emergency', path: '/app/emergency', icon: Siren, description: 'Get help fast', tone: 'emergency', hue: 'red' },
]

/**
 * The clinician nav (`GP-02`, UI_ATLAS S-06-01's `Z2` rail).
 *
 * ⚠️ GP-02's rule: "a module the user cannot enter is ABSENT, not disabled."
 * The atlas's rail also lists IP, Lab and Rad — those are M-08, M-14 and
 * M-15, which this product does not have. They are therefore not here at
 * all, rather than present and greyed: a disabled nav item advertises a
 * missing feature and invites a support call.
 *
 * Availability and Profile moved to the account menu. They are real,
 * working practice-management features, but they are not clinical
 * authoring, and the atlas structure is what this portal is now.
 */
export const DOCTOR_NAV: NavItem[] = [
  { label: 'My Day', path: '/clinician', icon: Home, end: true, description: 'Your clinic, ranked by who needs you first' },
  { label: 'Patients', path: '/clinician/patients', icon: Users, description: 'Your panel, and patient search' },
  { label: 'Co-sign', path: '/clinician/cosign', icon: FileCheck2, description: 'Notes awaiting your counter-signature' },
  { label: 'Templates', path: '/clinician/templates', icon: LayoutTemplate, description: 'Your note templates and order sets' },
]

export const HOSPITAL_ADMIN_NAV: NavItem[] = [
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
const PORTALS: Partial<Record<RoleName, PortalDescriptor>> = {
  Patient: {
    label: 'Patient Portal',
    home: '/app',
    items: PATIENT_NAV,
    account: [
      { label: 'Profile', path: '/app/profile', icon: User, hue: 'blue' },
      { label: 'Settings', path: '/app/settings', icon: Settings, hue: 'gray' },
    ],
  },
  Doctor: {
    label: 'Clinician',
    home: '/clinician',
    items: DOCTOR_NAV,
    account: [
      { label: 'My availability', path: '/clinician/availability', icon: CalendarClock },
      { label: 'Profile', path: '/clinician/profile', icon: User },
    ],
  },
  Resident: {
    label: 'Clinician',
    home: '/clinician',
    /**
     * ⚠️ Co-sign is ABSENT here, not disabled (GP-02).
     *
     * An earlier version gave a Resident the consultant's nav on the reasoning
     * that "they still read the co-sign queue to see where their own notes are
     * sitting". That reasoning was wrong about the system it described:
     * `/notes/cosign-queue` requires `note:cosign:assigned`, which a Resident
     * does not hold, so the server refuses them and the screen could only ever
     * show an error. The nav was advertising a door that is locked.
     *
     * A resident-scoped "where are my submitted notes" view would be a real
     * and useful feature — it is M-06 S-06-09's other half and is not in this
     * release. Until it exists, the honest rendering is no entry at all.
     */
    items: DOCTOR_NAV.filter((item) => item.path !== '/clinician/cosign'),
    account: [
      { label: 'My availability', path: '/clinician/availability', icon: CalendarClock },
      { label: 'Profile', path: '/clinician/profile', icon: User },
    ],
  },
  HospitalAdmin: {
    label: 'Hospital Admin',
    home: '/hospital-admin',
    items: HOSPITAL_ADMIN_NAV,
    account: [],
  },
  /**
   * Admin has exactly one working screen this release, and it is deliberately
   * a compliance duty rather than a clinical one: `breakglass:review:any` is
   * held by a role with NO clinical read, so reviewing that an emergency
   * access happened never requires seeing what was accessed. Per GP-02 the
   * modules Admin cannot enter are absent from this list, not greyed in it.
   */
  Admin: {
    label: 'Administration',
    home: '/admin/breakglass-review',
    items: [
      {
        label: 'Emergency access',
        path: '/admin/breakglass-review',
        icon: ShieldAlert,
        description: 'Break-glass records awaiting a 24-hour decision',
      },
    ],
    account: [],
  },
}

/** Portals with no navigation of their own fall back to an empty shell rather
 *  than borrowing another role's menu. */
const EMPTY_PORTAL: PortalDescriptor = { label: 'Stroke AI', home: '/', items: [], account: [] }

export function portalForRole(role: string | null | undefined): PortalDescriptor {
  return (role && PORTALS[role as RoleName]) || EMPTY_PORTAL
}

/**
 * Document/breadcrumb titles for every route in every portal. One map, so a
 * nav label and a page title cannot drift apart.
 */
export const ROUTE_TITLES: Record<string, string> = {
  '/app': 'Home',
  '/app/appointments': 'Appointments',
  '/app/medicines': 'Medicines',
  '/app/health': 'My Health',
  '/app/health-notes': 'Health Notes',
  '/app/reports': 'Reports',
  '/app/notifications': 'Notifications',
  '/app/visits': 'Visit summary',
  '/app/ai-insights': 'AI Insights',
  '/app/my-doctors': 'My doctors',
  '/app/emergency': 'Emergency',
  '/app/profile': 'Profile',
  '/app/settings': 'Settings',

  '/clinician': 'My Day',
  '/clinician/patients': 'Patients',
  '/clinician/cosign': 'Co-sign queue',
  '/clinician/templates': 'Templates',
  '/clinician/availability': 'Availability',
  '/clinician/profile': 'Profile',
  '/admin/breakglass-review': 'Emergency access review',
  // Patient- and encounter-scoped screens sit at the top level, exactly as
  // UI_ATLAS M-06.4 specifies their routes.
  '/patient': 'Patient',
  '/encounter': 'Consultation',

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
const PORTAL_ROOTS = new Set(['/app', '/clinician', '/hospital-admin'])

export function titleForPath(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]

  // Longest registered prefix, so a nested route like
  // /clinic/patients/:id still resolves to "My Patients".
  const prefixes = Object.keys(ROUTE_TITLES)
    .filter((p) => !PORTAL_ROOTS.has(p) && pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)

  const best = prefixes[0]
  return (best && ROUTE_TITLES[best]) ?? 'Stroke AI'
}
