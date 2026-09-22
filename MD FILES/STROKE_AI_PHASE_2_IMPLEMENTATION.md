# STROKE-AI — Phase 2 Implementation Report

**Date:** 9 September 2026
**Scope:** Production architecture, database, authentication, RBAC, patient portal foundation.
**Reference:** `STROKE_AI_PHASE_1_AUDIT.md`
**Status:** Complete. Phase 3 not started.

---

## 0. Summary

Phase 2 turned the audited codebase into a working production foundation. The
three tiers Phase 1 identified were treated differently, deliberately:

- **The backend was extended, not rewritten.** Its layering, Argon2id hashing,
  AES-256-GCM field encryption and audit log were already production-grade.
  New domains follow the existing module pattern exactly.
- **The landing page was left alone.** Zero files under `components/landing/`
  were modified. It was the best work in the repo and had no defects to fix.
- **The authenticated portal was rebuilt.** It was ~95% mock, US-flavoured, and
  in several places actively misleading. That could not be repaired in place.

Everything was verified against a running application and a live database, not
just a passing build. Two real bugs were found that way and fixed — see §11.

**Live data was never at risk:** 7 users, 7 patient profiles and 97 audit rows
existed at the start and are byte-for-byte intact at the end. The migration is
purely additive; a `pg_dump` backup was taken before it ran.

---

## 1. Database

### Migration `20260909091831_phase2_roles_sessions_care_appointments`

Verified non-destructive before applying — **no `DROP`, no `TRUNCATE`, no
column alterations, no `NOT NULL` added to an existing column.** Six new
tables, three new enums, three new enum values.

| Model | Purpose |
|---|---|
| `RefreshToken` | Rotating sessions with family-based reuse detection |
| `DoctorProfile` | Clinician identity — registration no., HPR id, specialty, verification |
| `StaffProfile` | Admin / HealthcareWorker / LabTechnician identity |
| `CareTeamMember` | **Patient ↔ doctor assignment** — the keystone of row-level authorization |
| `Appointment` | Real bookings, replacing the fabricated flow |
| `Notification` | Replaces the hardcoded notification array |

New enums: `AppointmentMode`, `AppointmentStatus`, `NotificationType`.
New `AuditAction` values: `TokenRefreshed`, `TokenReuseDetected`, `SessionRevoked`.

### Why `CareTeamMember` matters most

Phase 1 noted `profile.routes.ts` deliberately exposed no `GET /profile/:id`,
because there was no relationship to authorise against. That table now exists,
so every future doctor endpoint has a real answer to "is this patient yours?"
before any doctor UI is written.

### Deliberately not created

Messaging, billing, insurance claims, lab-order workflow, bed management,
ambulance dispatch, and a `Hospital` entity. All speculative until a real
requirement exists. `DoctorProfile.hospitalName` is free text for now.

---

## 2. Authentication

### Refresh tokens — the headline fix

Phase 1's H1: a 15-minute access token with no refresh signed patients out
mid-task every 15 minutes. For a population with post-stroke fatigue and motor
impairment, that alone made the portal unusable.

`server/src/auth/refreshToken.service.ts` implements:

- **Opaque 256-bit tokens, not JWTs.** Nothing to forge, and revocable before
  expiry — which a JWT is not.
- **SHA-256 hash storage only.** A database dump yields no usable tokens.
  SHA-256 rather than Argon2 is correct here: the input is 256 bits of entropy
  so there is no dictionary to attack, and refresh runs on every page load
  where a slow KDF would be a DoS vector.
- **Rotation on every refresh.** A token is valid exactly once.
- **Reuse detection.** Replaying a rotated token means two parties hold it.
  Since we cannot tell victim from attacker, the entire `familyId` is revoked
  and re-authentication forced. Logged as `TokenReuseDetected` / Critical.

Sessions are revoked server-side on password reset, password change, and
account deletion.

### Access token now in memory, refresh token in an httpOnly cookie

Phase 1's M-tier finding was the JWT sitting XSS-readable in `localStorage`.
Now:

- Access token → a module-scoped variable in `apiClient` (a closure an XSS
  payload cannot read), 15-minute TTL.
- Refresh token → `httpOnly`, `sameSite=lax`, `secure` in production, and
  `path`-scoped to `/api/v1/auth` so it is not attached to unrelated calls.
- Legacy `oncotrace_*` localStorage keys are actively purged on load.

### Silent refresh

`apiClient` retries a 401 once behind a **single-flight** refresh, then replays
the original request. Without single-flight, five parallel 401s would fire five
rotations, four of which would replay a revoked token and trip reuse detection —
signing the user out, the exact opposite of the intent.

### JWT rebrand with dual-accept

Issuer/audience moved `oncotrace-ai` → `stroke-ai`. Verification accepts both
old and new for one release, because live users held valid tokens at deploy
time. **Action for Phase 3: remove the legacy pair** (`jwt.config.ts`).

---

## 3. RBAC

Three layers, each answering a different question:

| Layer | Question | Where |
|---|---|---|
| `authenticate` | Who are you? | `middleware/authenticate.ts` |
| `requirePermission` | May your ROLE ever do this? | `middleware/authorize.ts` + `config/permissions.ts` |
| `careRelationshipService` | May you do it to THIS ROW? | `services/careRelationship.service.ts` |

`config/permissions.ts` maps role → permissions using the same
`resource:action` convention as the existing (still unpopulated) `Permission`
table, so moving to DB-backed permissions later is a data migration, not a
rewrite. Routes declare *what* they need, never *who* may do it.

Two deliberate choices:

- **Admin is enumerated, not wildcarded.** A wildcard silently absorbs every
  future permission — which is how an admin role ends up reading clinical
  records nobody decided it should read.
- **`requirePatientAccess` throws 404, never 403.** A 403 confirms the record
  exists, letting an attacker enumerate valid patient ids by status code.

Admin is denied clinical record access outright. If it is ever needed it must
be an explicit, separately audited break-glass flow.

### Verified, not assumed

```
patient  → /api/v1/profile   200
anonymous→ /api/v1/profile   401
tampered → /api/v1/profile   401
Admin    → /api/v1/profile   403   ← audit-logged with role + path
Doctor   → /api/v1/profile   403   ← permission set differs correctly
```

Role changes take effect immediately: `authenticate` re-reads the user from the
database every request rather than trusting the token's cached role.

---

## 4. Backend structure

No restructuring. New code follows the existing module pattern
(`routes → controller → service → repository`), and `prisma` is still imported
only by repositories and the two cross-cutting services.

Added: `auth/refreshToken.service.ts`, `services/careRelationship.service.ts`,
`config/permissions.ts`, `utils/authCookies.ts`.

**`RoleName` now re-exports the Prisma enum** instead of being hand-mirrored.
The old copy was structurally identical but a *different* TypeScript type, so
every value crossing the Prisma boundary needed a cast — the exact mechanism by
which two enums drift apart.

### Rate limiting corrected

`/auth/refresh` was initially placed behind the login limiter (10 / 15 min).
Because refresh fires on every page load, that would have locked ordinary users
out of their own valid sessions — a denial of service against legitimate users.
It now has `refreshLimiter` (60 / 15 min). Login keeps the strict limit because
each attempt there is a password guess. **Reuse detection, not rate limiting,
is what defends the refresh endpoint.**

---

## 5. Frontend architecture

```
src/
  app/          AuthContext · guards · navigation
  components/
    feedback/   ErrorBoundary · FullPageLoader · States
    layout/     PatientLayout · PatientSidebar · PatientTopbar
    common/     shared primitives (unchanged)
    landing/    UNTOUCHED
  pages/
    patient/    Home · Emergency · module placeholders
    portal/     Doctor/Admin placeholder
```

- **`AuthContext`** replaces the per-component `useAuth`. Phase 1 found every
  call site held an independent copy of the user, so signing out in the sidebar
  notified nobody.
- **`ErrorBoundary`** at the app root and around every patient route, keyed by
  path. Phase 1 found none anywhere — one throw white-screened the app.
- **Guards validate a real session**, not `localStorage.session === 'active'`.

### Deleted

19 files / ~4,000 lines: two orphaned stylesheets, four dead modules
(`AIInsights`, `EmptyState`, `useLocalStorage`, `usePageTransition`), the whole
`data/` mock directory, the `dashboard/` and `meetings/` component trees, and
the superseded layout. Every deletion was verified to have zero inbound
imports first.

**`client/node_modules` untracked: 15,452 → 133 tracked files.**

---

## 6. Patient portal

Navigation reduced from 9 destinations to 6, per Phase 1 §I. Timeline + Records
+ Reports merged into **My Health**; Appointments + Meetings merged;
**Medicines** and **My Care Team** added; **Emergency** promoted to top level.
`app/navigation.js` is the single source for labels, so the four-way naming
collisions Phase 1 found (sidebar vs. search vs. spoke rail vs. `<h1>`) cannot
recur.

**Care Guide was removed from navigation.** It returned three random canned
replies phrased as personalised clinical reassurance, with no disclaimer. It
returns when it is real.

### Emergency page

Three Phase 1 defects fixed:

1. The BE-FAST checklist was decorative — `handleSendAlert` never read it. It
   now drives the outcome and is the feature itself.
2. **108 and 112 are real `tel:` links.** Phase 1 found no dialable number
   anywhere and timeline copy saying "called 911".
3. Simulated dispatch (fake ETA, seven-stage tracker) removed. No dispatch
   integration exists, so none is implied.

### Honest placeholders

Appointments, Medicines, My Health and My Care Team state plainly that they are
not connected yet and list what will be there. No fabricated data.

---

## 7. Doctor & Administrator

`/clinic/*` and `/admin/*` are routed, role-guarded, and render a placeholder
that says the portal is not built. The **architecture** is real and shipping:
the account authenticates, the server assigns the role, `RequireAuth` routes by
it, and the permission layer already enforces. Only the UI is pending.

`ROLE_HOME` in `app/guards.jsx` maps role → landing path; login and register
both redirect through it.

---

## 8. Design system

Four coexisting token systems and **seven font families** consolidated to one
token file and **three families** (Plus Jakarta Sans for the app; Playfair/Lato
for the landing's editorial voice; Archivo for the hero). Aether, Helvetica and
Inter removed along with five unreferenced self-hosted font files.

Palette changes with reasons:

- **`#94A3B8` (2.8:1) and `#CBD5E1` (1.7:1) retired as text colours** — 51
  remaining instances rewritten to `#64748B` (4.8:1). Both are kept as *border*
  tokens under explicit names so the failing values cannot be reached
  accidentally via a text utility.
- **Body copy moved to `#475569` (7.4:1).**
- **Red is reserved for emergency.** Form errors use a separate `critical`
  palette so the emergency affordance does not become wallpaper.
- Type scale floors at 14px for anything a patient must read.
- Body weight 300 → 400; hairline weights on clinical text are a legibility
  cost with no benefit.

---

## 9. Accessibility

- Skip-to-content link; semantic `<aside>`/`<header>`/`<main>` landmarks.
- Global `:focus-visible` baseline with a real `outline` **plus** ring — a
  box-shadow-only focus style disappears entirely in Windows High Contrast Mode.
- `.tap-target` enforcing the 44px WCAG 2.2 floor.
- `aria-live` on async outcomes (banners, the BE-FAST result, loaders). Phase 1
  found async results rendered silently.
- Sidebar labels always visible — the old rail expanded on **hover**, so
  keyboard users tabbed through unlabelled icons.
- Account menu closes on Escape/outside-click **and returns focus to its
  trigger**.

---

## 10. Security

| Phase 1 finding | Status |
|---|---|
| No refresh tokens (H1) | **Fixed** — rotation + reuse detection |
| JWT in localStorage | **Fixed** — memory + httpOnly cookie |
| Guard never validated the token (H2) | **Fixed** — real session check |
| No global auth state (H3) | **Fixed** — AuthContext |
| No error boundary (C4) | **Fixed** |
| `node_modules` committed (C5) | **Fixed** — 15,452 → 133 files |
| "HIPAA-compliant" ×7 (C6) | **Fixed** — removed; HIPAA does not apply in India |
| BE-FAST checklist decorative (C8) | **Fixed** |
| Lint broken (H5) | **Fixed** — 337 problems → 3 warnings, 0 errors |
| Internal spec served publicly | **Fixed** — moved to `docs/` |
| Logout did not revoke (M9) | **Fixed** |
| Exposed SMTP / EmailJS credentials (H4) | **Outstanding — requires manual rotation** |

---

## 11. Bugs found by running the application

Both were invisible to a passing build and were caught only by driving the real
app in a browser.

**1. The app hung permanently on "Checking your session…".**
The bootstrap effect paired a `bootstrapped` ref guard with a `cancelled`
cleanup flag. Under React StrictMode the first mount's cleanup fires
immediately, suppressing the only state update, while the ref stops the second
mount from retrying — so `status` never left `'checking'` and **even the public
login page never rendered.** Fixed by letting the bootstrap commit its result
unconditionally.

**2. `/auth/refresh` returned 429 on ordinary page loads.** See §4.

---

## 12. Verification performed

- Additive-only migration confirmed by inspecting generated SQL before applying;
  `pg_dump` backup taken first.
- Backend `tsc --noEmit` clean; `npm run build` clean.
- Frontend `vite build` clean; `eslint` 0 errors / 3 documented warnings.
- Server boots, connects to Postgres, `/health` responds.
- Full auth lifecycle exercised against the live API: register → cookie issued
  → refresh → rotation confirmed → replay blocked → family revoked → audited.
- RBAC matrix verified across anonymous / Patient / Doctor / Admin.
- Real browser rendering at 1280×900 and 390×844 (mobile): login, portal home,
  emergency, module placeholder, landing.
- Database restored to exactly 7 users / 7 profiles / 97 audit rows; every test
  account purged.

---

## 13. Known issues and deferred work

### Requires manual action
- **Rotate the Gmail app password** in `server/.env` and the EmailJS keys
  recoverable from commit `8e2628a`. Cannot be done from the codebase.
- **Remove the legacy JWT issuer/audience** in `jwt.config.ts` once no
  pre-Phase-2 token can still be in flight.
- **Remove the legacy localStorage purge** in `auth.service.js` once no active
  user predates Phase 2.

### Deferred to Phase 3 (by design)
- Real data for Appointments, Medicines, My Health, Care Team — schema and
  authorization exist; controllers, services and UI do not.
- Notifications: the table exists, nothing writes to it. The bell was removed
  rather than left showing fabricated entries.
- Care Guide, pending a real model.
- Report upload — needs object storage, not a fake progress bar.
- Doctor and Admin portal UI.
- Accessibility preferences (`largeText`, `highContrast`) still persist and do
  nothing; the design tokens they need now exist.
- i18n — Tamil/Malayalam. 18 hardcoded `en-US` date formats remain.
- Video consultation: buy, do not build, and only once a doctor exists to join.

### Deferred to Phase 4
- Tests (vitest is still not installed; no `test` script) and CI.
- Redis for rate-limit state and an access-token denylist.
- Structured logging, monitoring, legal pages.
- Splitting the remaining large files (`Settings.jsx` 842 lines).

---

*Phase 2 complete. Phase 3 not started.*
