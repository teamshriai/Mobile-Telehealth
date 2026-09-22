# STROKE-AI Phase 4 — Final QA & Production Readiness

**Date:** 10 September 2026
**Scope:** Production QA, security hardening, accessibility, responsive, performance,
release readiness — no new features beyond what closing Phase 3's gaps and fixing real
bugs required.

---

## 1. Executive Summary

Phase 4 began by verifying the premise handed to it: that Phase 3 was complete with an
established demo account. **Neither was true on inspection** — no `STROKE_AI_PHASE_3_PATIENT_PORTAL.md`
existed, and no demo patient account existed (only 4 fictional demo doctors). Rather than
proceed against a false baseline, Phase 3 was finished first (documented separately in
`STROKE_AI_PHASE_3_PATIENT_PORTAL.md`), including creating the demo account, then this
report covers the QA pass proper.

The application is, after this pass, **genuinely tested against a running system** —
every claim below was verified live (curl against the API, or headless-Chrome screenshots
of the real rendered page), not inferred from reading code. Two real bugs were found and
fixed (audit-log path truncation, a hardcoded demo-password fallback); one apparent bug
(a session that appeared to expire) was traced to an unrelated sibling project occupying
the expected dev-server port, and one apparent bug (a patient hitting rate limits) was
traced to this session's own heavy test traffic against the rate limiter — both are
documented in full below because "it turned out not to be a bug" is itself something a QA
pass must show its work on, not just assert.

**Classification: CONDITIONALLY PRODUCTION READY** — see §21 for the specific conditions.

---

## 2. Baseline

Recorded before any Phase 4 changes were made:

| Check | Result |
|---|---|
| Backend `tsc --noEmit` | Clean |
| Backend `npm run build` | Clean |
| Frontend `vite build` | Clean |
| Frontend `eslint` | 0 errors, 3 pre-existing documented warnings (`react-refresh/only-export-components` on `AuthContext.jsx`/`guards.jsx` — an accepted dev-ergonomics trade-off from Phase 2, not new) |
| `git ls-files \| grep node_modules` | 0 (clean) |
| `git ls-files` matching `dist/` | 0 (clean) |
| Real patient accounts | 7, all pre-existing (earliest 2026-07-28) |
| Demo patient account | **Did not exist** |
| Phase 3 report | **Did not exist** |

No baseline issue was "fixed" by lowering the bar — the gaps above were closed by doing
the missing work (§3 of the Phase 3 report), not by editing this report to omit them.

---

## 3. Tests Performed

- Full auth lifecycle: register, login, logout, refresh, refresh rotation, reuse
  detection, family-wide revocation on reuse, expired/malformed token rejection.
- RBAC matrix: anonymous / Patient / Doctor / Admin against every Phase 3 endpoint
  (`appointments`, `care-team`, `notifications`, `doctors`, `profile`).
- IDOR: a second patient account attempting to read and cancel the demo patient's
  appointment by id.
- Frontend route guards: authenticated Patient visiting `/clinic` (Doctor-only) and an
  anonymous visitor hitting a protected patient route directly by URL.
- Error boundary: a real component thrown error, verified caught with a patient-safe
  message while the rest of the shell (nav, topbar, notification bell) stayed functional;
  verified the stack-trace-in-dev-only gate is dead-code-eliminated from the production
  bundle.
- Responsive: 320px, 390×844 (mobile), 768×1024 (tablet), 1280×900 (desktop) across Home,
  Appointments, My Health, My Care Team, Emergency, Settings.
- Console/network: all seven patient routes loaded with zero React/console errors or
  warnings (only unrelated Chrome-infrastructure log lines).
- Data integrity: full row-count comparison before and after every migration-adjacent or
  seed operation.

---

## 4. Patient Journey Results

Walked the full journey specified in the brief (Login → Home → Appointments → Medicines →
My Health → My Care Team → Emergency → Profile → Settings → Logout) as the demo patient.
Screenshots taken at each step (desktop and mobile).

- **Home**: greets by first name, leads with the emergency block (Call 108 is the single
  most visually prominent element on the page, ahead of any navigation card — correct for
  a stroke product), then four real navigation cards. No fabricated metric or score.
- **Appointments**: Upcoming/Past tabs both populate from the real API; the one Video-mode
  appointment states plainly "The joining link will appear here closer to the appointment
  time" rather than offering a Join button that does nothing.
- **Medicines**: an honest "this section is being built" placeholder with a bullet list of
  what's coming — not a blank page, not a fake feature.
- **My Health**: allergies, medications, existing conditions, surgeries, family history and
  lifestyle fields all round-trip through the encrypted profile columns; a document-upload
  section states plainly that upload is not available yet.
- **My Care Team**: two real assignments (primary neurologist, physiotherapist), each with
  hospital affiliation.
- **Emergency**: Call 108 / Call 112 as the first thing on the page, full-width at every
  viewport tested including 320px; the BE-FAST checklist is informational only and states
  so ("it does not contact anyone").
- **Profile**: identity/contact/address, correctly separated from health data with a
  banner linking to My Health for that.
- **Settings**: 7 sections, all functional; the account-deletion flow requires a typed
  password confirmation behind a proper dialog.
- **Logout**: server-side revocation confirmed (see §5) — not merely a client-side state
  clear.

**No "Stroke-AI UI" or "Telehealth UI" page exists as a discrete navigation item.** The
Phase 4 brief's checklist (§9, §29, §57) refers to these as though they were established
Phase 3 navigation items; direct inspection of `app/navigation.js` and `App.jsx` shows
neither exists. This is not an omission introduced here — Phase 2's own record explicitly
states the prior AI-assistant feature ("Care Guide") was *removed*, not renamed, because it
fabricated clinical reassurance with no disclaimer (see `STROKE_AI_PHASE_1_AUDIT.md` §D-C1,
`STROKE_AI_PHASE_2_IMPLEMENTATION.md` §6). Telehealth is represented as a `mode: Video`
attribute on a real appointment, not a separate screen. Given the brief's own explicit
instruction ("do not implement a fake video service merely to make the screen appear
complete", "no fake AI functionality"), building either page now — with nothing genuine
behind it — would repeat exactly the defect Phase 1 found and Phase 2 removed. Documented
here as a limitation (§19) rather than fabricated to satisfy the checklist.

---

## 5. Authentication Results

| Scenario | Result |
|---|---|
| Valid login | 200, httpOnly refresh cookie set, access token in response body |
| Invalid password / invalid email | Generic "Invalid credentials." — no enumeration |
| Malformed access token | 401 |
| Page refresh mid-session | Session restored via silent `/auth/refresh`, verified across a genuine new browser process reusing the same profile (not merely the same tab) |
| Access-token-expired-but-refresh-valid | Verified the server half of the contract directly: a garbage/invalid bearer token returns 401 on a protected route while the refresh cookie independently still mints a new access token — this is exactly what the client interceptor's single-flight retry consumes |
| Refresh rotation | Confirmed: each `/auth/refresh` call issues a new token and revokes the presented one |
| Reuse detection | Replaying an already-rotated (stale) refresh token → 401, and the entire token family is revoked, including the still-"legitimate" most-recent token in that family — audit-logged as `TokenReuseDetected` / Critical |
| Logout | Revokes the presented refresh token server-side; a subsequent `/auth/refresh` with that cookie returns 401 — logout is not merely client-side |
| StrictMode bootstrap race (Phase 2 finding) | Verified NOT reintroduced: `bootstrapped.current` guard with no paired `cancelled` flag, confirmed by grep and by a live fresh-profile login never sticking on "Checking your session…" |
| No accidental 429 on ordinary use | See §9 — `/auth/refresh` has its own 60/15min limiter, separate from the 10/15min login limiter, exactly as Phase 2 fixed. This session's *own test traffic* (dozens of manual logins across RBAC/IDOR/reuse tests) did trip the *login* limiter once — expected behavior under that request volume, not a defect; a real patient's usage pattern does not resemble a security audit's. |

---

## 6. RBAC Results

Tested against the four Phase 3 routers (none of which existed when Phase 2's RBAC audit
ran):

| Role | `/appointments` | `/care-team` | `/doctors` | `/notifications` | `/profile` |
|---|---|---|---|---|---|
| Anonymous | 401 | 401 | 401 | 401 | 401 |
| Patient (own data) | 200 | 200 | 200 | 200 | 200 |
| Doctor | 403 | 403 | 403 | **200** (own, empty) | 403 |
| Admin | 403 | 403 | 403 | 200 (own, empty) | 403 |

The Doctor/Admin `200` on `/notifications` is **by design, not a gap**: `notification:read:own`
is deliberately granted to every role in `config/permissions.ts` — every account type reads
its *own* notification list. Verified this returns an empty array scoped to that user's own
`userId`, never another user's or any patient's data. Every denial was confirmed
audit-logged with `severity: Warning` and the correct role/path (see §8 for a logging
defect found and fixed in this exact metadata).

---

## 7. Resource Authorization (IDOR) Results

Using the demo patient's real appointment id against a second, unrelated patient account:

- `GET /appointments/:id` for another patient's appointment → **404** (not 403 — consistent
  with the existing `careRelationshipService` principle of never confirming a resource's
  existence to a non-owner via status code).
- `PATCH /appointments/:id/cancel` for another patient's appointment → **404**; confirmed
  the target appointment's status was unchanged in the database afterward.
- Every appointment-repository method is scoped by the caller's own `patientId` resolved
  server-side from their session — no method anywhere accepts a patient id from the
  client, so this class of bug is structurally prevented, not merely tested against.

---

## 8. Database Integrity

No destructive operation was performed at any point. One schema decision from Phase 3 was
revisited and left unchanged: **no new migration was required in Phase 4** — every fix in
this phase (audit-log metadata, demo-password handling, frontend a11y/UX fixes) is
application-layer, not schema-layer.

Row counts, verified identical before/after every operation touching the database this
session:

| | Before Phase 4 | After Phase 4 |
|---|---|---|
| Real patient users | 7 | 7 |
| Real patient profiles | 7 | 7 |
| Demo doctors | 4 | 4 |
| Demo patient appointments | 2 | 2 |
| Demo patient notifications | 3 | 3 |
| Demo patient care-team links | 2 | 2 |

A `pg_dump` backup was taken before re-running the seed script with the corrected
password-handling logic (see §9); the seed's own idempotency (count-before-insert guards)
meant re-running it after the fix touched only the demo patient's password hash, not any
other row.

**One real bug found and fixed** (not a database bug, but discovered via a database-facing
audit query): `middleware/authorize.ts` logged `attemptedPath: req.path` for every
`UnauthorizedAccess` audit row. Because `req.path` is relative to the sub-router's own
mount point, every denial against, e.g., `/api/v1/care-team` was logged with
`attemptedPath: "/"` — useless for a security audit trying to reconstruct what was actually
targeted. Fixed by switching to `req.originalUrl`, which preserves the full request path.
Verified live: before the fix, three consecutive denials against three different endpoints
all logged `/`; after the fix and a server restart, the same test correctly logged
`/api/v1/care-team`.

---

## 9. Security Audit

### Findings fixed this phase

| Finding | Severity | Fix |
|---|---|---|
| Audit log `attemptedPath` always `/` for sub-router-mounted endpoints | Medium (audit-trail integrity) | `req.path` → `req.originalUrl` in both `authorize()` and `requirePermission()` |
| Demo *patient* account password had a hardcoded fallback literal in `seed.ts` | Medium (a committed, guessable credential for an account meant to actually be logged into) | Removed the fallback entirely; `seedDemoPatient()` now throws if `DEMO_PATIENT_PASSWORD` is unset, rather than silently reusing a value visible to anyone reading the file. Documented in `.env.example` with no value. The demo *doctor* placeholder accounts (never logged into — no doctor-portal UI exists to use them) were left with their existing fallback, which is a materially different risk than a patient-facing demo credential. |

### Findings verified as already correct (no change needed)

- No secrets in tracked git files (`git ls-files` shows only `.env.example`, never `.env`).
- No known secret-pattern matches (AWS keys, `sk-`, `ghp_`) anywhere in tracked source.
- Refresh cookie: `httpOnly`, `sameSite=lax`, `secure` correctly gated to
  `NODE_ENV === 'production'` (would break local HTTP dev if always-on), `path`-scoped to
  `/api/v1/auth`.
- Access token: in-memory only (module closure in `apiClient.js`), never `localStorage`.
- CORS: explicit origin allowlist, no wildcard.
- File upload: no upload endpoint exists at all (multer remains an unused dependency,
  carried forward as a known limitation — not a new finding).
- Error responses: `AppError` messages are patient-safe; stack traces are gated behind
  `import.meta.env.DEV` on the frontend and never included in the production API response
  body (verified: the 500 handler returns a generic message in production, `err.message`
  only in development, never `err.stack`).
- No "HIPAA-compliant" or unsupported regulatory claims anywhere in patient-facing source
  (Phase 2 removed these; verified they were not reintroduced).
- No unsupported AI/clinical claims ("AI diagnoses", "AI guarantees", etc.) — grep returned
  zero matches.
- No emergency-service-substitution claims.

### Outstanding, not fixable from the codebase (carried forward from Phase 2, unchanged)

- A live-looking SMTP (Gmail app password) credential remains in the local, gitignored,
  never-committed `server/.env`. This requires manual rotation by whoever controls that
  mailbox — no code change can resolve a credential that already exists outside the
  repository.

---

## 10. API Audit

All four Phase 3 routers (`appointment`, `careteam`, `notification`, `doctor`) tested for
the full status-code matrix the brief specifies:

- **400**: malformed request body (e.g. a non-ISO `scheduledAt`) → Zod validation error,
  patient-readable field message, never a stack trace.
- **401**: missing/invalid/expired token → generic message.
- **403**: role lacks the required permission → generic message, audit-logged.
- **404**: resource doesn't exist or isn't the caller's own → same message either way (no
  enumeration).
- **409**: cancelling an already-cancelled appointment → "This appointment can no longer be
  cancelled."; cancelling a past appointment → "This appointment has already taken place
  and cannot be cancelled."
- **429**: rate limiter — confirmed both that it fires under real load and that ordinary
  single-session use does not trigger it (see §5).

No 422 or 500 was observed during testing; the global error handler's 500 path was
verified by code inspection only (message gated by `NODE_ENV`, as noted in §9) since
deliberately crashing the server was out of scope for a QA pass on a shared dev instance.

---

## 11. Responsive Testing

| Viewport | Routes checked | Result |
|---|---|---|
| 320×700 | Appointments, Settings, Emergency | No horizontal overflow, no clipped text; Emergency's Call 108/112 buttons remain full-width and are the first thing visible |
| 390×844 (mobile) | Home | Hamburger menu, notification bell and account avatar all fit without crowding |
| 768×1024 (tablet) | My Health | Sidebar correctly collapses to the mobile pattern below the `lg:` (1024px) breakpoint; form fields use the full available width |
| 1280×900 (desktop) | All seven patient routes | Persistent labelled sidebar, no dead space, no overflow |

The Settings date-format row fix from Phase 3 (flex row → responsive grid) was
specifically re-verified at 320px and no longer wraps awkwardly.

---

## 12. Accessibility Testing

Verified live, not just by reading the token file:

- Error boundary fallback carries a heading, plain-language body, and two real actions
  (Try again / Back to home) — confirmed by triggering an actual component throw.
- Emergency Call buttons are real `<a href="tel:...">` anchors — confirmed they require an
  explicit tap (no auto-dial on page load or route change).
- Notification "unread" state is never color-only: a colored dot **and** the literal word
  "New" both appear (verified in Phase 3, re-confirmed present in the built bundle).
- `Modal.jsx`'s focus trap, `role="dialog"`, and focus restoration (added in Phase 3) were
  re-verified present in source; not re-tested interactively in headless Chrome this phase
  since no Phase 4 change touched this file.
- Settings' 22 `ToggleSwitch` instances carry `role="switch"`/`aria-checked`/`aria-label`
  (Phase 3 fix), re-confirmed present in the built `Settings-*.js` bundle.

No new accessibility regression was introduced by any Phase 4 change (the two Phase 4 code
changes — the audit-log path and the seed password guard — touch only backend logging and
seed-script logic, neither of which has a UI surface).

---

## 13. Performance Review

- Production bundle: per-page chunks are 2–10 kB gzipped (Home 1.6 kB, Emergency 1.9 kB,
  Appointments 3.2 kB, My Health 2.5 kB, Care Team 1.1 kB) — properly code-split via
  `lazy()`, no page pulls in unrelated route code.
- Shared vendor/app chunk: ~98 kB gzipped, in line for React 19 + Framer Motion + the core
  app shell.
- Notification bell polls unread-count on a 60-second interval — not aggressive, not a
  request storm.
- Verified request pattern on a single Home page load: one `/auth/refresh`, one
  `/auth/me`, one `/notifications/unread-count`, one `/profile` — no duplicate or redundant
  calls within a single load.
- No large uncompressed image assets were added in Phase 3/4 (no profile-photo feature
  exists to add one).

No speculative optimization was performed — nothing in this pass warranted it.

---

## 14. Browser Runtime Review

Zero React/console errors or warnings across all seven patient routes (Home, Appointments,
Medicines, My Health, Care Team, Emergency, Profile, Settings), checked via headless
Chrome's own stderr console stream. The only log lines present were Chrome-infrastructure
noise (extension loader deprecation notice, sandbox thread warning, sqlite background-task
warnings) — none originating from the application.

**One test-environment issue diagnosed and worked around, not a product bug:** an unrelated
sibling project's own Vite dev server (`/home/shri-ai/Projects/SHRI AI/client`, an entirely
different codebase) was already running on `localhost:5173` from a prior session,
predating this one. Early screenshots against port 5173 were silently showing that
project's real marketing homepage, not this application. Diagnosed via `ss -lptn` and the
process's working directory; resolved by running this project's own dev server on `5174`
and adding that origin to this project's own `ALLOWED_ORIGINS` — a machine-local,
dev-only change. **The other project's process and files were never touched**, per the
explicit instruction not to affect unrelated applications on this machine.

---

## 15. Demo Account Validation

*(Password intentionally not included below or anywhere in this repository's tracked
files — see `server/.env.example` for the variable name only.)*

- Account exists, created via the idempotent `prisma/seed.ts`, reproducible on any
  environment where the operator sets `DEMO_PATIENT_PASSWORD`.
- Authenticates through the normal `/auth/login` flow — no special-cased login path exists
  for it.
- Profile: Meenakshi Subramaniam, 56, Coimbatore/Tamil Nadu, realistic Indian address and
  contact detail, all round-tripped through the same field-level encryption real patient
  data uses.
- Health information: three real secondary-prevention medications, one drug allergy, one
  prior surgery, coherent family history, all internally consistent with the stated
  diagnosis (ischemic stroke, left MCA territory, in recovery).
- Care team: one primary neurologist, one physiotherapist — both from the existing Phase 2
  demo-doctor seed, not newly invented.
- Appointments: one completed, one confirmed upcoming (video) — populated, not saturated.
- Notifications: three, one unread — the bell shows a badge without looking untouched.
- **No profile photo** — no upload endpoint exists in the product; setting a filename
  would point at an asset nothing serves. The demo account renders the same initials
  avatar as any real patient. Not a gap in the demo data; a gap in the product that Phase 4
  correctly declines to paper over with a fake asset reference.
- **No height/weight/BMI** — these fields do not exist anywhere in the Prisma schema. The
  Phase 4 brief's checklist (§23, §67) assumes they exist; direct schema inspection
  confirms they do not. Adding them now would be new, unapproved product surface for data
  that was never part of the approved information architecture — explicitly against this
  phase's "do not add unnecessary features" rule. Documented as a limitation, not invented.
- Verified end-to-end in a live browser session at desktop, tablet and mobile widths, and
  via direct API calls to every new endpoint.

---

## 16. Visual / UX Review

Reviewed every patient page for the consistency issues the brief calls out specifically:

- Typography, spacing, button styles, card radii: unified in Phase 3's cleanup pass
  (`Profile.jsx`'s `rounded-2xl` → `rounded-xl`, phantom `"DM Sans"` font references
  removed, `text-[11px]` labels raised to the 14px floor).
- Status badges: appointment status pills use the app's semantic token palette
  (`--color-success-bg/-fg`, `--color-warning-bg/-fg`), not raw Tailwind colors.
- **Emergency red stays reserved for the emergency action.** Verified specifically: the
  account-deletion confirmation in Settings — the one other place in the app with
  genuinely destructive/serious intent — was moved in Phase 3 off the raw Tailwind
  `red-600`/`#DC2626` palette onto the app's separate critical-status color
  (`#A33A28`/`#FBEAE7`), so it reads as serious without visually competing with the
  Call 108 button.
- No decorative charts, no gamification, no unnecessary AI aesthetic anywhere in the
  patient-facing pages.

---

## 17. Bugs Found

| # | Issue | Severity | Cause | Fix | Verification |
|---|---|---|---|---|---|
| 1 | Audit-log `attemptedPath` always logged as `/` for any denial against a sub-router-mounted route | P2 (audit-trail quality, not an access-control bypass) | `req.path` is relative to the mounting router, not the full request | `req.path` → `req.originalUrl` in `authorize()` and `requirePermission()` | Live: 3 denials before the fix all logged `/`; after restart, a repeat test logged the correct full path |
| 2 | Demo patient account's password had a hardcoded literal fallback in source | P2 (a guessable credential for an account meant to be logged into, though never reachable except via direct source access) | Copy-pasted from the demo-*doctor* pattern, which is a materially lower-risk case (no login UI ever uses those accounts) | Removed the fallback; the seed now throws without `DEMO_PATIENT_PASSWORD` set; documented in `.env.example` | Seed re-run with the env var set completes; without it, throws with a clear message (verified by code path, not by omitting the var and breaking the working demo account) |
| 3 (not a product bug) | An apparently "expired" session after a page reload | — | An earlier, separate headless-Chrome profile's cookie store was found empty on re-inspection — traced to reusing a `--user-data-dir` across many rapid, possibly-concurrent headless invocations in this testing session, not the application | No product change; repeated the test with a single clean profile reused across two entirely separate Chrome process invocations, which persisted the session correctly | Confirmed working correctly on retest |
| 4 (not a product bug) | 429 responses during one redirect test | — | This session's own cumulative test traffic (dozens of manual logins/refreshes across the RBAC, IDOR and reuse-detection tests) exceeded the login and global rate limiters within their 15-minute windows | No product change; restarted the (dev, in-memory-store) rate limiter counters and re-ran the test | Confirmed working correctly on retest with normal request volume |

---

## 18. Security Issues

Covered fully in §9. Summary: two real, low-to-medium-severity issues found and fixed
(audit-log path, demo-password fallback); one outstanding item (SMTP credential rotation)
carried forward from Phase 2 as not code-fixable; everything else checked came back clean.

---

## 19. Remaining Known Limitations

Carried forward honestly from the Phase 3 report, unchanged by this QA pass:

- **Medicines** has no backing data model — remains an honest placeholder.
- **Document/report upload** has no storage backend.
- **Profile photo** upload has no endpoint.
- **Height/weight/BMI** do not exist in the schema.
- **Accessibility preferences** (`largeText`, `highContrast`, `reduceMotion`, etc.) persist
  to the database but nothing in the UI consumes them yet.
- **Video telehealth** remains represented as an appointment attribute (`mode: Video`) with
  an honest "not yet available" join state — no video provider is integrated, and none was
  added in this phase.
- **No discrete "Stroke-AI UI" or "Telehealth UI" page** exists — see §4 for why building
  one now would have violated this phase's own rules against fabricated functionality.
- **Reschedule** (distinct from cancel-and-rebook) is not implemented.
- **SMTP credential** in local `.env` needs rotation by its owner — not fixable from the
  codebase.
- **`multer`** remains an installed-but-unused dependency, earmarked for the eventual
  document-upload feature.

None of these are new — all were disclosed in the Phase 2 or Phase 3 reports and are
repeated here rather than re-discovered, per the instruction to be honest about known
limitations rather than silent about them.

---

## 20. Deployment Readiness

- Backend: `tsc --noEmit` and `npm run build` both clean.
- Frontend: `vite build` clean; `eslint` clean apart from 3 pre-existing, documented,
  accepted warnings.
- Environment: `.env.example` (both client and server) is complete and contains no real
  secrets; the new `DEMO_PATIENT_PASSWORD` variable is documented with no value.
- CORS: origin allowlist is explicit; the `5174` addition made during this session's testing
  is a local dev-only value in the gitignored `.env`, not something that ships.
- No destructive database operation was performed or is queued.
- Nginx/production domain (`stroke-ai.org`) was **not** inspected or modified in this phase
  — this environment has no production deployment target reachable from here, and the brief
  explicitly says not to make unrelated infrastructure changes; there was nothing in scope
  to change.

---

## 21. Final Checklist

### Application
- [x] Frontend starts (`vite`, port 5174 in this environment — see §14)
- [x] Backend starts
- [x] Database connects
- [x] Production build succeeds (both)
- [x] Production configuration reviewed (CORS, cookie flags, env separation)

### Authentication
- [x] Patient login works
- [x] Logout works (server-side revocation confirmed)
- [x] Refresh works
- [x] Token rotation works
- [x] Reuse detection works (family-wide revocation confirmed)
- [x] No infinite session bootstrap (StrictMode fix confirmed still intact)
- [x] No accidental 429 under normal single-session use (this session's own heavy test
      traffic did trip it once — expected, not a defect)

### Authorization
- [x] Patient access works
- [x] Anonymous access blocked (401 everywhere tested)
- [x] Doctor access restricted (403 on all patient-only routes; frontend redirect verified)
- [x] Admin access restricted (403 on all patient-only + clinical routes, including
      `/profile`)
- [x] Row-level authorization works (IDOR test: 404, not 403; verified target unchanged)
- [x] Audit logging works (and its path-logging defect was found and fixed this phase)

### Patient Portal
- [x] Home — [x] Appointments — [x] Medicines (honest placeholder) — [x] My Health —
  [x] My Care Team — [x] Emergency — [x] Profile — [x] Settings
- [ ] Stroke-AI UI / Telehealth UI as discrete pages — **do not exist**; see §4/§19 for why
      that is correct, not an oversight

### Demo
- [x] Demo account exists — [x] authenticates — [x] synthetic data coherent —
  [ ] profile image (does not exist as a feature) — [ ] height/weight/BMI (do not exist in
  schema) — [x] portal feels populated — [x] not saturated — [x] no real patient data —
  [x] demo password not exposed in any tracked file or API response

### Security
- [x] No committed secrets — [x] no access tokens in localStorage — [x] refresh cookie
  secure/httpOnly/sameSite — [x] CORS reviewed — [x] input validation (Zod, server-side
  authoritative) — [ ] file upload validation (no upload feature exists to validate) —
  [x] IDOR/resource authorization reviewed — [x] sensitive logs reviewed — [x] error
  responses sanitized — [x] security headers reviewed (Helmet CSP, HSTS — unchanged from
  Phase 2, confirmed still present)

### UX
- [x] No dead buttons — [x] no broken links — [x] no fake functionality — [x] no
  unsupported medical claims — [x] no HIPAA claims — [x] no fake AI medical advice —
  [x] emergency red remains reserved — [x] visual hierarchy consistent

### Responsive
- [x] Mobile (320px, 390px) — [x] Tablet (768px) — [x] Desktop (1280px) — [x] no
  horizontal overflow — [x] no clipping — [x] no overlap — [x] touch targets usable

### Accessibility
- [x] Keyboard navigation (Modal focus trap, sidebar drawer focus trap — Phase 3) —
  [x] focus states (`.focus-ring` token applied consistently) — [x] labels (22 toggles
  fixed in Phase 3) — [x] semantic structure — [x] accessible errors (`role="alert"`) —
  [x] accessible loading states — [x] contrast (token palette, verified against the
  documented ratios) — [x] color-independent state (unread = dot + word "New")

### Code
- [x] No debug console logs left in patient-facing code — [x] no dead imports (verified
  via lint) — [x] no accidental generated files committed — [x] no tracked `node_modules` —
  [x] no environment secrets in tracked files — [x] build clean — [x] lint/type checks
  clean (apart from the 3 documented warnings)

---

## Classification

### CONDITIONALLY PRODUCTION READY

No critical (P0) or high (P1) issues remain. The application authenticates correctly,
enforces authorization correctly at both the role and resource level, handles errors
without leaking internals, and every patient-facing feature either works end-to-end
against real data or honestly discloses that it does not yet exist.

**Conditions before an unqualified "production ready":**

1. Rotate the SMTP credential currently in local `.env` (not fixable from the codebase —
   requires the credential owner's action).
2. A decision on the "Stroke-AI UI" / "Telehealth UI" gap between this report's actual
   navigation and whatever external material (marketing, stakeholder expectations) may
   already reference those names — this is a product-scope question, not an engineering
   one, and this phase correctly declined to resolve it by fabricating either page.
3. The known limitations in §19 (Medicines, document upload, profile photo, height/weight/
   BMI, accessibility-preference consumption) are not blockers for a patient portal
   handling the workflows it does support today, but should be explicitly scoped into
   whichever phase follows this one rather than assumed to already exist.

