# STROKE-AI — PatientConnect Blueprint Adaptation

**Phase 5** · 10–11 September 2026
Reference document: `PATIENTCONNECT_BLUEPRINT.md` (1,692 lines, read in full)
Prior record consulted: Phase 1 audit, Phase 2 implementation, Phase 3 patient portal, Phase 4 QA

---

## 1. Reference analysis — what was studied

PatientConnect was treated as a **reference benchmark, not a template**. Nothing about its
architecture, schema, stack, version numbers, API shape, naming, UI or page structure was
copied. The blueprint was read end to end, compared against STROKE-AI as it actually runs
(not as its documentation claims), and every idea in it was classified.

The instruction that governed every judgement call: **where the blueprint and STROKE-AI
conflict, STROKE-AI wins.**

### What the comparison actually found

STROKE-AI's foundations hold up well against the benchmark, and in several places exceed
it. Auth is stronger than the blueprint's own specification: Argon2id where the blueprint
allows bcrypt-or-argon2, 20 encrypted PHI columns with a **separate** blind-index key for
`abhaId`, refresh-token families with reuse detection, and a session that cannot be
extended past its original expiry.

What the comparison did expose is a single recurring defect class, and it is the same one
Phase 1 named at the start of this programme:

> **Surfaces that look like working features and do nothing.**

The blueprint is unusually strict about this (§2 `requestId`, §4 non-disable-able security
notifications, §6 idle timeout). STROKE-AI had four instances of exactly the thing it
claims to have designed out. Phase 5 closed them.

**No new product surface was added. No new models. No framework changes. No migration.**

A second pass (11 September) extended the analysis beyond the notification/accessibility
work into the areas the brief calls out specifically — technology choice, database safety,
terminology, mobile-health feel, and the demo experience. That pass measured the patient
portal at four viewport widths and produced two further fixes, both in shared components.
Its findings are folded into the sections below.

---

## 2. STROKE-AI differences — why the architecture intentionally diverges

PatientConnect and STROKE-AI solve overlapping problems, so concept-level similarity
(auth, profile, appointments, care team, notifications, records) is expected and fine.
Implementation-level similarity is not, and was avoided deliberately:

| Dimension | PatientConnect | STROKE-AI | Why the difference stands |
|---|---|---|---|
| **Frontend** | Angular | React 19 + Vite 5 + Tailwind v4 (CSS-first `@theme`) | Already built, already deployed, already styled. A rewrite would consume the entire phase and deliver a patient nothing. |
| **Schema** | Its own relational model | Prisma/PostgreSQL with 20 AES-256-GCM-encrypted PHI columns + HMAC blind index | STROKE-AI's is live with real patient data and is **stricter** than the reference. |
| **Domain scope** | General hospital/patient management | Patient-centric **stroke** care | STROKE-AI must not drift into generic hospital management. This ruled out several otherwise-reasonable blueprint features. |
| **Notification delivery** | `NotificationTemplate` + `NotificationLog` tables | One `notify()` choke point | Two call sites do not justify a delivery-log subsystem. Revisit at ten. |
| **Session policy** | Extendable session | Cannot be extended past original expiry | STROKE-AI's is stricter; the blueprint's would be a downgrade. |

The governing rule throughout: **where the blueprint and STROKE-AI conflict, STROKE-AI
wins.** Every row above is an instance of applying it.

---

## 3. Classification

### KEEP — already correct, no change made

| Area | Why it stays as it is |
|---|---|
| **Password hashing** | Argon2id with tuned memory/time/parallelism. Stronger than the blueprint's bcrypt-or-argon2 allowance. |
| **Token model** | 15-minute JWT held in a module closure (not `localStorage`, so XSS cannot read it) + opaque 256-bit refresh token, SHA-256 hashed at rest, httpOnly cookie, path-scoped to `/api/v1/auth`, `sameSite: lax`. |
| **Refresh rotation** | Family-based rotation with reuse detection; a replayed token revokes the whole family. Verified again this phase. |
| **RBAC** | `requirePermission()` with AND semantics over a static in-code permission map. Declaring *what* rather than *who* is better than the blueprint's role checks. |
| **Field encryption** | AES-256-GCM over 20 PatientProfile columns, with a distinct `BLIND_INDEX_KEY` for the `abhaId` HMAC blind index. Exceeds the blueprint. |
| **Audit logging** | Append-only, fire-and-forget, never blocks the audited action. |
| **Validation** | Per-module Zod validators, `ZodError` → 400 with `flatten().fieldErrors`. |
| **API shape** | Already `/api/v1/...` with a consistent envelope. The blueprint's structure offered no improvement. |
| **Notifications carry no PHI** | Pre-existing and deliberate: "Appointment requested" plus a date, detail behind an authenticated `actionUrl`. This is what let the email channel be added safely. |

### ADAPT — blueprint idea taken, implemented STROKE-AI's way

**Idle timeout** — blueprint §6.

Adopted because the reasoning transfers: this product's sessions display health
information on devices that are frequently shared — a family tablet, a ward terminal, a
phone handed to a relative. An abandoned open tab is the realistic exposure.

Adapted rather than copied in three ways:

1. **There is a 60-second warning.** The blueprint specifies a hard cutoff. STROKE-AI
   serves people recovering from stroke, who read slowly and may sit with a page for
   minutes without touching anything. Signing them out with no notice would be a
   usability failure dressed as a security feature. Any interaction — or the
   "Stay signed in" button — resets the clock.
2. **The warning does not trap focus.** It is an `alertdialog` live region, not a modal.
   Any keystroke the user makes is itself the activity that cancels the timeout, so
   trapping them would be hostile and pointless. Focus moves to the button only when the
   user is not currently typing.
3. **It cannot extend a session.** The timer governs one tab. The server remains the sole
   authority on when a session is over.

Timings follow the blueprint: **20 minutes patient, 15 minutes staff.** Staff get less
because a clinician's screen shows many patients' data, not just their own.

A `visibilitychange` check was added beyond the blueprint: browsers throttle timers in
hidden tabs, so a closed laptop lid could otherwise outlive the timeout. Returning to the
tab re-checks the wall clock.

### IMPROVE — existing STROKE-AI surfaces made honest

These are the four "looks like a feature, does nothing" defects.

| # | Was | Now |
|---|---|---|
| 1 | **9 notification toggles** validated and persisted; `notify()` read none of them. Every notification fired unconditionally. | `notify()` gates on the patient's saved preference at the single choke point every notification already passes through. No call site changed. |
| 2 | **6 accessibility toggles** saved and were read by nothing. Phase 1 finding **M1**, open through Phases 2–4. | 3 now genuinely change the rendered page. 3 were **deleted** — see below. |
| 3 | **`requestId`** generated per request and sent as `X-Request-Id`, but absent from every error body. A patient reporting a failure had nothing to quote. | Present in every error branch, and surfaced in the UI as a quiet "Reference: …" line. |
| 4 | **Notifications were in-app only.** "Appointment cancelled" reached a patient only if they happened to open the portal. | Optional email channel, gated on the patient's own `emailNotifs` preference and on SMTP actually being configured. |

**On deleting three accessibility toggles.** "Screen Reader Support", "Keyboard Navigation"
and "Focus Indicators" had no honest implementation available: the portal has full keyboard
operability and visible focus rings *unconditionally*, and nothing about screen-reader
output is toggleable. They could only ever have been decorative — and "Keyboard
Navigation", defaulting to **on**, actively implied a user could switch keyboard access
off. Deleting a promise the product cannot keep is the fix; they were replaced with a short
"Always on" note stating what is guaranteed.

**Two rules adopted verbatim from the blueprint, on merit:**

- **§4 — security-critical notifications are not user-disable-able.** `notify()` takes an
  `alwaysSend` flag that bypasses preference checks. A patient may reasonably decline
  appointment reminders; they may not decline being told their password changed.
- **§4 — no PHI in outbound notification bodies.** The email says *that* something
  happened and links back into the authenticated app. Never the reason for visit, never a
  result value. Email is an unencrypted transport landing in inboxes shared with family
  on devices we do not control, so it is treated purely as a pointer, not a PHI carrier.

### DEFER — real gaps, deliberately not closed in this phase

Restated honestly rather than quietly dropped. **Automated tests and CI remain the single
largest outstanding item in the programme.**

| Item | Note |
|---|---|
| **Automated tests + CI** | No test runner exists. Phases 2 and 4 both shipped bugs that survived a passing build. Highest-value remaining work. |
| Medicines model | No schema, no data. The page is an honest placeholder. |
| Document upload | Not started. |
| Profile photo | Column exists, no upload path. |
| Height / weight / BMI | Not modelled. |
| Video consultation | No provider integration. |
| Appointment reschedule | Cancel exists; reschedule does not. |
| MFA | Blueprint mentions it; not implemented here. |
| **SMTP credential rotation** | **The configured mail credential is currently rejected by the provider** (confirmed during this phase's testing — a `535 BadCredentials` response). The email channel is correct and fails safely, but it will not deliver until the credential is rotated. Operational, not a code defect. |
| Redis-backed rate limiting | In-memory store; fine for single-instance, must change before horizontal scaling. |
| Legacy `oncotrace-*` JWT acceptance | Still accepted for backward compatibility. |

### REJECT — considered and deliberately not taken

| Rejected | Reason |
|---|---|
| **Angular + its version stack** | STROKE-AI is React 19 + Vite 5 + Tailwind v4. A rewrite would deliver nothing to a patient. |
| **PatientConnect's database schema** | STROKE-AI's Prisma schema is already in production with real patient data and a different, encrypted-at-rest design. |
| **Its naming, page structure and UI** | The instruction was explicit, and STROKE-AI's design system is further along. |
| **`NotificationTemplate` / `NotificationLog` tables** | A full delivery-log subsystem for **two** call sites is more machinery than the problem justifies. Revisit at ten. |
| **`/api/v1` restructuring** | Already matches. |
| **Its session model** | STROKE-AI's is stricter — a session cannot be extended past its original expiry. |

---

## 4. What changed, file by file

### Backend

| File | Change |
|---|---|
| `notification/notification.repository.ts` | New `findRecipientDeliveryContext()` — fetches email, active flag and preferences in one query, since `notify()` needs all three for one decision. Returns `null` for deleted users. |
| `notification/notification.service.ts` | New `NotifyInput` type with `alwaysSend`; `PREFERENCE_KEY_BY_TYPE` map; `dispatch()` doing recipient lookup → preference gate → in-app row → email. `notify()` stays a thin never-throwing wrapper. |
| `services/email.service.ts` | New `sendNotificationEmail()` reusing the existing Outlook-safe table template. HTML-escapes all interpolated text. `toAbsoluteAppUrl()` discards anything that is not a same-origin relative path — an absolute URL slipping into an email link would be an open redirect handed to a phisher. |
| `utils/apiResponse.ts` | Optional `requestId` on the error envelope; optional third parameter on `error()` so all existing callers stay valid. |
| `middleware/errorHandler.ts` | `req.requestId` threaded through all nine error branches, including `notFoundHandler`. |

### Frontend

| File | Change |
|---|---|
| `app/AccessibilityContext.jsx` *(new)* | Reads `preferences.accessibility`, sets `data-*` attributes on `<html>`. Optimistic local override so a toggle is visible before the PATCH resolves; the override drops once the server confirms. Clears on sign-out so a shared device does not keep a stranger's settings. Never throws. |
| `app/useIdleTimeout.js` *(new)* | Role-based timeout, throttled activity listeners, T-60s warning, `visibilitychange` wall-clock check, double-fire guard. |
| `components/feedback/IdleWarning.jsx` *(new)* | The notice. Non-trapping `alertdialog`; does not steal focus from a text field. |
| `index.css` | Rules for the three `data-*` attributes. `largeText` scales the type ramp (so spacing stays proportional rather than zooming the page), lifting the 12px step disproportionately since it is the hardest to read. `highContrast` darkens body and secondary text and strengthens borders. `reduceMotion` mirrors the existing OS-preference block — it **adds to** `prefers-reduced-motion`, it does not replace it. |
| `pages/Settings.jsx` | Applies preferences optimistically; three unimplementable toggles removed and replaced with an "Always on" statement. |
| `components/layout/PatientLayout.jsx` | Mounts the idle timeout. Placed here, not in `App`, so it can only run inside the authenticated shell. |
| `components/auth/Login.jsx` | **Renders the session-expiry notice.** The `state: { expired: true }` signal already existed and was read by nothing — a user was dumped on the login page with no explanation. Found while testing the idle timeout. |
| `lib/apiClient.js` | Exposes `err.requestId` from the body, falling back to the `X-Request-Id` header. |
| `components/feedback/States.jsx` | New `ReferenceId` primitive. `ErrorState` now accepts either a string *or* the caught Error, reading `message` and `requestId` off the object — so a page needn't hold the id in a second piece of state. |
| `AppointmentsPage` · `CareTeamPage` · `NotificationBell` | Store the error object rather than `err.message`, so the reference renders. |
| `components/common/Button.jsx` | Every size variant gained a minimum height. `sm` was rendering at **31px** — under the 44px a finger needs. `xs` deliberately stays at 36px for dense table rows, documented in-code as an exception. |
| `index.css` *(touch targets)* | One mobile-only rule giving `<input>`/`<select>`/`<textarea>` a 44px minimum. Fixes 7 files at once; checkboxes and radios excluded, since their visible label is the real target. |

---

## 5. Verification

A passing build proves nothing here — Phases 2 and 4 both shipped bugs that survived one.
Everything below was run against the live system.

### Notification preference gating — 5/5

Run against the real database with cleanup and restore:

| Assertion | Result |
|---|---|
| `apptReminders: false` suppresses the in-app row | ✅ |
| `apptReminders: true` delivers it | ✅ |
| `alwaysSend: true` ignores an explicit opt-out | ✅ |
| Absent preference defaults to **sending** (opt-out model, never silent loss) | ✅ |
| Unknown/deleted recipient does not throw | ✅ |

Cleanup verified: 3 test rows deleted, preferences restored, count returned to baseline.

The email path was exercised in the same run and **failed safely** — SMTP rejected the
stale credential, the failure was logged without exposing it, and neither the in-app write
nor the triggering action was affected. That is the contract working.

### Accessibility — 4/4 (real browser, measured computed styles)

| Assertion | Measured |
|---|---|
| `largeText` scales the type ramp | `--text-base` 1rem → **1.125rem** |
| `highContrast` darkens body text | `rgb(17,24,39)` → **`rgb(0,0,0)`** |
| `highContrast` darkens secondary text | → **`rgb(30,41,59)`** (≥7:1, WCAG AAA) |
| `highContrast` strengthens borders | → **`rgb(71,85,105)`** |

All three `data-*` rules confirmed present in the compiled CSS with escapes intact.

### Idle timeout — 4/4 (real browser, threshold temporarily shortened, then restored)

| Assertion | Result |
|---|---|
| Warning appears before sign-out, with countdown | ✅ |
| Expiry signs out and redirects to `/login` | ✅ |
| Login page explains why | ✅ *(after the fix above)* |
| "Stay signed in" dismisses the warning and keeps the session | ✅ |
| Does **not** arm on public routes | ✅ |

Production values confirmed restored: **20 min patient / 15 min staff / 60 s warning**;
the hook is byte-identical to its pre-test state.

### `requestId` — end to end

- Present in the error body on 404 and 401 branches ✅
- Body value **matches** the `X-Request-Id` header exactly ✅
- Renders in the UI as `Reference: ref-test-9f3a2b` on a forced 500 ✅

### Responsive & touch targets — measured at 320 / 390 / 768 / 1280

Seven patient pages (`/app`, appointments, health, care-team, emergency, profile,
settings) driven in a real browser at each width.

| Assertion | Result |
|---|---|
| **Horizontal overflow at any width, any page** | **0px** ✅ |
| Elements extending past the viewport | none ✅ |
| Controls under 44px — **before** the fix | selects at 42px, `Button sm` at 31px ❌ |
| Controls under 44px — **after** the fix | none ✅ |

Three further probe hits were inspected in the live DOM and **rejected as false
positives**, not fixed: `sr-only` checkboxes on Emergency, and two inline text links inside
sentences. Details and reasoning in §9.

A first sweep produced 12 additional "findings" that turned out to be a lapsed session —
the probe was measuring the login page. The probe was hardened to detect and skip that
case, and the sweep re-run. **Those 12 are excluded from the counts above** rather than
reported as defects.

### Regression — 9/9

Login · authenticated read · anonymous 401 · patient blocked from admin route · refresh
returns 200 · refresh issues a **new** token · `requestId` in error body · logout 200 ·
**refresh after logout rejected (401)** — server-side revocation confirmed.

### Build

`tsc --noEmit` clean · `vite build` clean · `eslint` **0 errors** (5 pre-existing
`react-refresh` warnings, matching the established context-file convention).

---

## 6. Database

**No migration. No schema change.** Every change reads an existing column
(`PatientProfile.preferences`, already-persisted JSON) or is application-layer only.

| | Baseline | After | |
|---|---|---|---|
| Patients | 8 (7 real + 1 demo) | 8 | unchanged |
| Doctors | 4 | 4 | unchanged |
| Appointments | 3 | 3 | unchanged |
| Notifications | 4 | 4 | unchanged |
| Audit rows | 153 | 289 | **append-only growth** from two days of test traffic — nothing deleted |

Patient preferences were individually inspected afterwards and are intact. No destructive
operation was run at any point: no `migrate reset`, no truncate, no drop, no mass delete.

---

## 7. Technology decisions

**The stack was retained, not chosen afresh.** The instruction was explicit that the
reference's technology is not binding, and that working technology should not be replaced
without a strong engineering reason. None was found.

| Layer | Decision | Reasoning |
|---|---|---|
| Frontend framework | **Keep React 19 + Vite 5** | Stable, current, already deployed. Angular would be a full rewrite with no patient-visible benefit. |
| Styling | **Keep Tailwind v4 CSS-first `@theme`** | Design tokens already live in `index.css`; this is what let three accessibility preferences be implemented as ~40 lines of CSS rather than a component refactor. |
| Backend | **Keep Express + TypeScript** | Adequate, understood, deployed. No scaling pressure justifies a change. |
| ORM / DB | **Keep Prisma + PostgreSQL** | Migration history is intact and the schema holds live data. |
| Mail | **Keep Nodemailer singleton** | Already had an `isConfigured` guard and a working template; the notification channel reused both. |
| Rate limiting | **Keep in-memory store** *(deferred)* | Correct for single-instance. Must become Redis-backed before horizontal scaling — recorded in DEFER, not silently accepted. |

**No dependency was added in this phase.** No version was bumped to match the reference.
Every improvement was built from what the repository already had — which is why the total
diff is 18 files and no lockfile change.

---

## 8. Database decisions

**No migration was created. No schema change was made. No column was added or altered.**

This was a deliberate outcome, not an accident of scope. Each candidate improvement was
checked against the existing schema first:

| Improvement | Storage used | Why no migration |
|---|---|---|
| Notification preference gating | `PatientProfile.preferences` (JSON, existing) | The column was already validated and persisted — it was simply never *read*. The gap was application-layer, so the fix was too. |
| Accessibility preferences | `PatientProfile.preferences.accessibility` (existing) | Same. |
| Notification email channel | none | Reads the existing `User.email`. |
| `requestId` in errors | none | Request-scoped value, never persisted. |
| Idle timeout | none | Entirely client-side. |
| Touch-target fixes | none | CSS only. |

**Safety measures actually taken:**

- Row counts recorded **before and after** (§6) and compared.
- The one test that wrote to patient preferences restored the prior value and was verified
  to have done so.
- Every patient's `preferences` column was individually inspected afterwards.
- **No destructive command was run at any point** — no `prisma migrate reset`, no
  `TRUNCATE`, no `DROP`, no mass delete, no destructive seed.

The only DB growth was `AuditLog`, which is append-only by design.

**Future schema work, when it comes** (Medicines, documents, height/weight): the existing
model is relationally sound and additive changes will not require restructuring
`PatientProfile`. Nothing in this phase made that work harder.

---

## 9. UX / product decisions

### Terminology — reviewed, and left alone

§12 asks for patient-friendly terminology. The existing navigation was audited against the
reference's suggested vocabulary and **already matches it almost exactly**:

`Home` · `Appointments` · `Medicines` · `My Health` · `My Care Team` · `Emergency` ·
`Profile` · `Settings`

No clinical jargon, no technical language, possessives where they aid comprehension
("My Health", "My Care Team"). **This is a KEEP.** Changing it to look more like the
reference would have been change for its own sake.

### Mobile-health feel — audited by measurement, not opinion

§10–§11 ask for a credible mobile-health product rather than an admin dashboard. Rather
than assert this, the patient portal was measured in a real browser at **320 / 390 / 768 /
1280** across seven pages.

**Result: zero horizontal overflow at every width on every page.** The responsive
foundation is genuinely sound — the layout holds at 320px, which is the width most designs
fail at.

Two **real** defects were found and fixed:

| Defect | Fix | Why fixed at this level |
|---|---|---|
| `Button` size variants had **no minimum height** — `sm` rendered at 31px, `md` ~36px, all under the 44px a finger needs | Added `min-h-*` to every variant | It is a shared component: one edit fixes every button in the product rather than patching pages one at a time. |
| `<select>` / `<input>` rendering at **42px** on mobile across 7 files | One rule in `index.css` under the existing mobile media query | 23 call sites would otherwise need editing, and any new form would reintroduce the bug. |

`xs` was deliberately left at 36px for dense table rows, documented in the code as an
explicit exception rather than an oversight.

**Three probe hits were investigated and rejected as false positives** rather than
"fixed": `sr-only` checkboxes on Emergency (the visible label is the real target — this is
the correct accessible pattern), and two inline text links inside sentences (WCAG 2.5.8
exempts these; enlarging them would break the line box). Fixing these would have made the
product worse while making a metric look better.

### Honest surfaces over impressive ones

The through-line of this phase. Four surfaces looked like working features and did
nothing; a fifth left users with no explanation for being signed out. All five are closed.
Where no honest implementation existed, the control was **deleted** rather than left
decorative — see the three accessibility toggles in §3.

**No fabricated clinical content was created**: no fake diagnoses, risk scores,
recommendations, AI conclusions, or doctor messages. Features without backends remain
visibly honest placeholders.

---

## 10. Security decisions

Nothing in STROKE-AI's existing security architecture was replaced. It was verified and
then extended at the margins.

**Verified intact this phase** (full results in §5):

- Full auth lifecycle: login → authenticated read → refresh **rotation** → logout →
  **refresh after logout correctly rejected (401)**, confirming server-side revocation.
- RBAC: anonymous 401, patient blocked from admin routes.
- No regression in the Phase 2–4 fixes: access token still in a module closure (never
  `localStorage`), no session bootstrap hang, no IDOR.

**Added this phase:**

| Change | Security reasoning |
|---|---|
| **Idle timeout** (§3 ADAPT) | Reduces exposure of an abandoned authenticated tab on a shared device. Client-side only — it **cannot extend** a session, and the server stays the sole authority on expiry. |
| **Security notifications are not suppressible** | `alwaysSend` bypasses preference gating. A patient may decline appointment reminders; they may not decline being told their password changed. |
| **No PHI in outbound email** | Email is unencrypted, lands in shared inboxes, on devices we do not control. The body says *that* something happened and links back into the authenticated app — never a reason for visit or a result value. |
| **Open-redirect guard in email links** | `toAbsoluteAppUrl()` discards anything that is not a same-origin relative path. An absolute URL reaching an outbound email link would be a phishing vector handed away for free. |
| **HTML escaping in email templates** | All interpolated text is escaped before rendering. |
| **`requestId` chosen carefully** | It identifies a *request*, not a person, and carries no PHI — which is why it is safe to display on screen and read aloud to support. |
| **Accessibility settings clear on sign-out** | A shared device must not retain a previous user's display state. |

**Secrets handling:** no secret appears in source, logs, or this document. The demo
password remains an environment/seed value; the seed **throws** rather than falling back to
a literal. This document was scanned for the demo password, SMTP credentials, JWT/encryption
keys and the database DSN before being finalised — all clean.

**One temporary test measure, disclosed:** to run the responsive sweep, the *local dev*
`.env` rate limits were raised (the sweep's own traffic was tripping them), then restored.
The file was verified byte-identical to its backup afterwards. No production configuration
was touched.

---

## 11. Notes for whoever picks this up

**The demo account address in the brief does not match the system.** The instruction names
`demouser@gmail.com`. No such user exists. The seeded demo patient — created 10 September
2026 and the one actually used for every test in this document — uses a different address,
defined as a single constant in `server/prisma/seed.ts`.

I did **not** rename the existing account or create a second one. Renaming would invalidate
a working demo account holding the synthetic data set; creating a duplicate would leave two
competing demo patients. Both are decisions for you, not me. Tell me which address is
authoritative and it is a one-line change to the seed constant plus a re-seed.

Either way the credential itself stays where it is: an environment/seed secret. The seed
**throws** if `DEMO_PATIENT_PASSWORD` is unset rather than falling back to a literal.

**Demo data completeness was audited** (§14's "complete but believable" bar): every
PatientProfile field is populated except `profilePhoto` — which has no upload path yet and
is already on the DEFER list — alongside appointments, notifications and care-team members.
It reads as a real patient record, not a padded one. No clinical conclusions were
fabricated to fill it.


**The stale SMTP credential.** Notification email is implemented and correct but will not
deliver until the mail credential is rotated. This surfaced during testing, not from
reading configuration. Nothing breaks in the meantime — the send fails, is logged, and is
swallowed exactly as designed.

**One residual preference key.** The demo patient's saved preferences still contain a
`screenReader` key from before that toggle was removed. It is now read by nothing, the
validator still accepts it, and no save path breaks. Harmless, and not worth a data
migration to clean up.

---

## 12. Honest summary

The blueprint's real value was not any feature in it. It was that reading a rigorous spec
for a comparable product made one pattern impossible to keep overlooking: **four surfaces
in STROKE-AI that a patient would reasonably believe were working, and that did nothing.**
A fifth — the unexplained sign-out — was found while testing the fix for the third.

Those are closed and verified against the running system rather than against
documentation.

The second pass reinforced the same lesson from the opposite direction. Measuring the
portal at 320–1280px found the responsive foundation genuinely sound — **zero overflow
anywhere** — while quietly failing the 44px touch minimum in two *shared components*, which
no amount of page-by-page inspection would have surfaced as a pattern. It also produced
15 apparent findings that were not defects at all: 12 from a lapsed test session and 3 from
a probe that did not understand `sr-only` controls or inline links. Investigating those
rather than "fixing" them is the difference between improving the product and improving a
metric.

The largest genuine gap in this programme is unchanged and is not a feature: **there is
still no automated test suite.** Every phase including this one has found real bugs that a
passing build did not — and every one of those was caught by hand, which does not scale and
will not survive the next contributor.
