# STROKE-AI — Phase 3: Patient Portal Implementation

**Status:** Complete.
**Scope:** Turn the Phase 2 foundation (auth, RBAC, shell, empty modules) into a genuinely
usable patient portal — real backend modules, real pages, no fabricated data.

---

## 1. What was implemented

### Backend — four new modules, following the Phase 2 `profile/` pattern exactly

Each module is `routes → controller → service → repository → validator`, guarded with
`requirePermission(...)` (previously defined but unused since Phase 2), with `prisma`
imported only by the repository layer.

| Module | Endpoints |
|---|---|
| `appointment/` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id/cancel` |
| `careteam/` | `GET /` |
| `notification/` | `GET /`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all` |
| `doctor/` | `GET /` (bookable directory — id, name, specialty, hospital only; never registration number or HPR id) |

Also:
- **Health history** added to the profile module: `knownAllergies`, `currentMedications`,
  `existingDiseases`, `familyHistory`, `previousSurgeries`, lifestyle enums, and `occupation`
  were already encrypted columns on `PatientProfile` from Phase 2 but were omitted from both
  the read shaper and the update schema — invisible from the client despite being in the
  database. Both gaps are closed with a new `PATCH /profile/health-history` endpoint.
- **`GET /auth/me` security fix**: it previously returned the *raw* decrypted `PatientProfile`
  row (41 fields, including the unmasked `aadhaarLast4` and the `abhaIdHash` blind index),
  while `GET /profile` returned a curated 27-field shape with `aadhaarMasked`. One resource,
  two different wire shapes, one of them over-exposed. `/auth/me` now reuses the same
  `toProfileResponseShape()` the profile module uses. Verified live: field count corrected,
  `aadhaarLast4`/`abhaIdHash` no longer present, `aadhaarMasked`/`age` present.
- **Real notifications**: appointment request and cancellation now call
  `notificationService.notify()`, which writes a genuine row — no fabricated clinical
  notification exists anywhere.

### Frontend — real pages replacing three of the four placeholders

| Page | Backing |
|---|---|
| `AppointmentsPage.jsx` | Upcoming/past tabs, booking form, cancel with confirmation. Video appointments show "the joining link will appear here closer to the time" — no fake Join button, because no video provider exists. |
| `CareTeamPage.jsx` | Real care-team list; genuine empty state when unassigned. |
| `MyHealthPage.jsx` | Health-history view/edit; a documents section that states plainly upload is not available yet rather than faking a progress bar. |
| `MedicinesPage.jsx` | **Left as an honest placeholder.** No `Medication` model exists in the schema; inventing one was out of scope for this pass. |

Plus: a real `NotificationBell` in the topbar (polls unread count, lists/marks-read against
the live API), and four new frontend services (`appointment`, `careteam`, `notification`,
`doctor`) mirroring the existing `profile.service.js` shape.

A `SHIPPED_FEATURES` gate (`app/features.js`) was added because `/auth/me`'s `permissions`
array advertises `appointment:*`/`notification:*`/`careteam:*` capability the role has always
held — independent of whether the corresponding routes exist. Gating UI on raw permissions
would have rendered features that 404'd the moment they were "permitted" but not yet built.

### Cleanup carried over from Phase 1/2 findings

- **`Profile.jsx`**: removed the duplicated `bg-[#FAFBFC] p-6` shell (the layout already
  supplies it — this was a double-padding bug), removed three `"DM Sans"` font-family
  overrides (a font never loaded, silently falling back), swapped hand-rolled loading/error
  states for the shared `feedback/States.jsx` primitives, raised `text-[11px]` labels to the
  14px floor, added `focus-ring`/`tap-target`/`role="alert"`, unified card radius to
  `rounded-xl`, and added a banner linking to the new My Health page for health-history
  fields (kept as a separate task from identity/contact editing).
- **`Settings.jsx`**: removed the nested `max-w-[1100px]` (double-constrained inside the
  layout's own 1280px), gave the section nav real `role="tablist"`/`role="tab"` semantics,
  fixed the 22 `ToggleSwitch` instances to carry `role="switch"`/`aria-checked`/`aria-label`
  (threaded automatically through `SettingsRow`'s own `label` prop rather than touching every
  call site), fixed the date-format buttons wrapping at 320px (flex row → responsive grid),
  and moved every destructive/error UI off the raw Tailwind red palette onto the app's
  critical-status colors (`#A33A28`/`#FBEAE7`) — **red stays reserved for the emergency
  action only.**
- **India-first defaults**: `LANGUAGE_DEFAULTS` was `America/Los_Angeles` / `MM/DD/YYYY` on
  an India-deployed product; now `Asia/Kolkata` / `DD/MM/YYYY`. Language list gained Tamil
  and Malayalam (with native-script labels), dropped Spanish/French/Chinese (Phase 1 flagged
  a language list with no South Indian language on a Coimbatore-targeted product).
- **`Modal.jsx`**: added `role="dialog"`, `aria-modal`, `aria-labelledby`, a focus trap
  (Tab wraps inside the dialog), and focus restoration to the trigger on close. Was entirely
  missing before — a Phase 1 finding (P4) that had never been addressed.
- **`Avatar.jsx`**: fixed a real crash path — `''.charCodeAt(0)` is `NaN`, so the default
  empty `name` prop indexed `gradients[NaN]` → `undefined` background.
- **Sidebar drawer**: added a focus trap while open, `inert` on the `<aside>` when
  off-canvas on mobile (its nav links were previously still tabbable while invisible), and
  `aria-expanded` on the topbar's hamburger toggle.
- **`titleForPath`**: now prefix-matches, so a future nested route resolves to its parent's
  title instead of falling back to a bare "Stroke AI".
- Deleted `common/Loader.jsx` — fully superseded by `feedback/States.jsx` and
  `FullPageLoader.jsx`, and had zero remaining importers.

---

## 2. Database changes

**One additive migration was already applied in Phase 2** (`Appointment`, `Notification`,
`CareTeamMember`, `DoctorProfile`, `StaffProfile`, `RefreshToken`). **Phase 3 required no new
migration** — every feature built here maps onto tables and columns that already existed;
the gap was that no API exposed them.

A `pg_dump` backup was taken (`backup_pre_phase4_demo_seed.sql`) before running the extended
seed script, and row counts were verified identical for all 7 pre-existing real patient
accounts before and after.

---

## 3. Demo account

Created via `prisma/seed.ts` (idempotent, upsert-based, same script Phase 2 used for the
demo doctors) — **not** hand-inserted, so it can be reproduced or reset the same way.

- **Isolated by construction**: a distinct, obviously-synthetic email
  (`demouser.strokeai@gmail.com`), created and updated only by the seed script. The seed
  function explicitly counts existing rows before writing appointments/notifications, so
  re-running it is a no-op rather than a duplicate-data generator. The 7 real patient
  accounts are never read or written anywhere in the seed file.
- **Fictional identity**: Meenakshi Subramaniam, Coimbatore, Tamil Nadu — realistic South
  Indian demographic and address detail, all written through the same `encryptField()` the
  production API uses (never plaintext, even in a seed script).
- **Realistic, modest health history**: hypertension since 2015, an ischemic stroke (left
  MCA territory, March 2026) currently in recovery, three real secondary-prevention
  medications (Clopidogrel, Atorvastatin, Amlodipine), one drug allergy, one prior surgery,
  one family-history line. Deliberately **not** padded with fabricated lab values or a
  simulated NIHSS/mRS score — this account demonstrates identity, health history and
  workflow, not a clinical assessment the product does not perform.
- **Care team**: a primary neurologist (Dr. Priya Nair) and a physiotherapist
  (Dr. Anitha Selvam), both from the existing Phase 2 demo-doctor seed.
- **Appointments**: one completed in-person visit (2 weeks in the past), one confirmed
  upcoming video consultation (per the Phase 3 honesty rule, its detail page shows "the
  joining link will appear here closer to the time" rather than a working Join button).
- **Notifications**: three, two already read and one unread — enough to show the bell badge
  without looking untouched or overwhelming.

Verified end-to-end through the live API (login → `/auth/me` → `/appointments` →
`/care-team` → `/notifications`) and in a real headless-Chrome session at desktop (1280×900)
and mobile (390×844) viewports — screenshots showed a coherent, populated-but-not-saturated
portal with zero console errors on any of the seven patient routes.

### Explicitly not built — and why

- **Profile photo.** The `profilePhoto` column exists on `PatientProfile`, but no upload
  endpoint exists and no frontend component reads it. Setting a filename in the seed would
  point at an asset nothing serves. Building upload infrastructure was explicitly deferred to
  Phase 4 in the Phase 3 plan; the demo account renders the same initials avatar as any real
  patient.
- **Height / weight / BMI.** No such columns exist anywhere in the schema. This is worth
  stating plainly because a later QA pass may expect them — adding them now would be new,
  unapproved product surface for a field that was never part of the approved Phase 1
  information architecture.

---

## 4. Authentication / RBAC

No changes to the authentication or RBAC architecture itself — Phase 2's refresh-token
rotation, reuse detection, and permission model are unchanged. New routes were added to the
existing `requirePermission()` middleware (previously defined, never used) rather than
introducing a new authorization mechanism.

Verified live for the new endpoints:
- Anonymous request → 401 on all four new routers.
- Authenticated patient → 200 on their own data.
- Cross-patient access (`GET /appointments/:id` for someone else's appointment,
  `PATCH /:id/cancel` on someone else's appointment) → **404**, not 403 — consistent with the
  existing `careRelationshipService` pattern of never confirming a resource's existence to a
  non-owner via status code.
- Double-cancellation of an already-cancelled appointment → 409.

---

## 5. UX improvements

- Six-item patient navigation (Home, Appointments, Medicines, My Health, My Care Team,
  Emergency) is now backed by real data on four of six items — only Medicines remains a
  placeholder, and it says so honestly.
- The account menu shows the patient's actual name (see below) instead of their email.
- Notifications are genuinely actionable: unread state uses both a colored dot *and* the word
  "New" (never color alone), each item is a real button with a real destination.
- Video appointments are presented honestly — schedule and clinician are real, the join
  affordance explicitly says it isn't available yet.

### A real bug found and fixed during this pass

`/auth/me` returns identity only (email, role — by design, separate from profile), so the
topbar's account menu was falling back to displaying the user's **email** instead of their
name, even though the profile the same response already carried had one. `AuthContext`
discarded `me.profile` entirely. Fixed by deriving a display name from the profile at the one
point session state is applied (`applySession`), and by wiring `Profile.jsx`'s existing
(previously unused) `reloadUser()` call after a successful save — so editing your name updates
the topbar immediately rather than on next login. Verified before/after in a live browser
session: before, the menu showed `demouser.strokeai@gmail.com`; after, `Meenakshi Subramaniam`.

---

## 6. Accessibility

- `Modal.jsx`: dialog semantics + focus trap + focus restoration (Phase 1 finding P4, closed).
- Sidebar mobile drawer: focus trap while open, `inert` while closed-but-mounted, so its links
  are not in the Tab order while invisible.
- 22 `ToggleSwitch` instances across Settings gained `role="switch"`, `aria-checked`, and an
  accessible name derived from their row's own label.
- Settings section nav gained real `tablist`/`tab` semantics.
- Every remaining raw-Tailwind-red error/destructive UI element was moved onto the app's
  token-based critical-status palette, keeping emergency red exclusively reserved for the
  emergency action.
- `Avatar.jsx`'s empty-name crash path fixed (would have surfaced as a missing avatar
  background for any user with a blank display name).

---

## 7. Responsive testing

Verified in real headless-Chrome sessions (not just Tailwind-class inspection) at 1280×900
and 390×844 for all seven patient routes: Home, Appointments, Medicines, My Health, Care
Team, Emergency (from Phase 2), Profile, Settings. No horizontal overflow, no clipped text,
mobile hamburger menu and off-canvas drawer both functioned. The Settings date-format
row — previously three unwrapped flex items that would clip below ~360px — now wraps
correctly at 320px via a responsive grid.

---

## 8. Runtime bugs found through actual browser testing

Two, neither visible from a passing build:

1. **Port collision with an unrelated sibling project.** An existing, unrelated Vite dev
   server for a different project (`SHRI AI/client`) was already bound to `localhost:5173`
   from an earlier session. Screenshots taken against `5173` were silently showing that
   project's real marketing site, not this one. Diagnosed via `ss -lptn` and the process's
   `cwd`; resolved by running this project's dev server on `5174` and adding that origin to
   `ALLOWED_ORIGINS` (both machine-local dev-only changes — the unrelated project's process
   and files were never touched, per the explicit instruction not to affect other
   applications on this machine).
2. **Topbar name staleness** — described in §5 above.

---

## 9. Known limitations (carried forward honestly, not hidden)

- **Medicines** has no backing data model — remains a placeholder.
- **Document/report upload** has no storage backend — deferred to Phase 4, as planned.
- **Profile photo** upload has no endpoint — not built.
- **Height/weight/BMI** do not exist in the schema — not invented.
- **Accessibility preferences** (`largeText`, `highContrast`, `reduceMotion`, etc.) still
  persist to the database but are not yet consumed anywhere in the UI (Phase 1 finding M1 —
  still open; the design tokens they would need now exist from Phase 2, but wiring them up
  was not in this pass's scope).
- Video telehealth remains UI-only, honestly labelled, with no real video provider
  integrated — unchanged from the Phase 2 plan.
- Reschedule (as opposed to cancel + rebook) is not implemented; the appointment model has
  no dedicated reschedule flow.

---

## 10. Verification commands run

```
cd server && npx tsc --noEmit         # clean
cd client && npx vite build           # clean
cd client && npx eslint src --ext js,jsx  # 0 errors, 3 pre-existing documented warnings
npm run db:seed                       # idempotent, verified against live DB row counts
```

Plus live curl/browser verification of every new endpoint and every patient route, detailed
above and in the Phase 4 report that follows this one.

