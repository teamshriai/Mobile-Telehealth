# STROKE-AI — Platform Architecture & Technology

**As of Phase 6** · 11 September 2026
Every version below is read directly from this repository's own `package.json`/runtime —
none are copied from the PatientConnect reference blueprint.

---

## 1. System overview

STROKE-AI is a modular-monolith mobile-health platform: one React SPA, one Express API,
one PostgreSQL database. It began as a stroke-specific patient portal and, as of Phase 6,
gained a general Patient/Encounter identity layer so future clinical domains (oncology,
cardiology, diabetes) can be added as their own assessment tables without touching the
identity core.

```
┌─────────────────┐      HTTPS       ┌──────────────────┐      TCP       ┌──────────────┐
│  React SPA       │ ───────────────▶ │  Express API      │ ─────────────▶│ PostgreSQL   │
│  (Vite build)    │ ◀─────────────── │  (Node/TypeScript) │◀───────────── │  16.15       │
└─────────────────┘   JSON envelope   └──────────────────┘   Prisma ORM   └──────────────┘
        │                                      │
        │ in-memory access token               │ AES-256-GCM field encryption
        │ httpOnly refresh cookie              │ HMAC blind indexes (search)
        │                                      │ Argon2id password hashing
```

The frontend never talks to the database directly and never holds a long-lived credential
in a place JavaScript-executed-by-an-attacker could read (the access token lives in a
module-scoped closure, not `localStorage`). The backend is the sole holder of every
encryption/signing key and the sole place PHI is decrypted for a legitimate, authorized
request.

---

## 2. Frontend

| Technology | Version | Purpose | Why | Depends on it |
|---|---|---|---|---|
| **React** | 19.0.0 | UI rendering | Already in production; React 19's `useId`, `useOptimistic` used in Phase 5's accessibility work | Every page/component |
| **React DOM** | 19.0.0 | DOM renderer | Pairs with React | — |
| **Vite** | 5.4.0 | Build tool / dev server | Fast HMR, native ESM dev server, small production bundles (measured: Phase 5's dashboard rewrite added 0.11 kB gzipped for four new components) | `npm run dev` / `npm run build` |
| **Tailwind CSS** | 4.0.0 | Styling | CSS-first `@theme` (no `tailwind.config.js`) — the entire design-token system (colours, type scale, spacing, the `--tap-min` touch-target constant) lives in `client/src/index.css` as CSS custom properties, not a JS config object | Every component's className |
| **@tailwindcss/vite** | 4.0.0 | Vite plugin for Tailwind 4 | Required by Tailwind 4's new architecture | `vite.config.js` |
| **react-router-dom** | 6.26.0 | Client-side routing | `RequireAuth`/`RequireAnonymous` role guards; `React.lazy` + one `Suspense` boundary per route | `App.jsx`'s single flat `<Routes>` |
| **axios** | 1.18.1 | HTTP client | One shared instance (`lib/apiClient.js`) with request/response interceptors — every service function is a thin wrapper over it | All `services/*.service.js` |
| **framer-motion** | 11.3.0 | Animation | Page-transition variants, `Modal`'s focus-trap-friendly enter/exit, `Button`'s tap-scale feedback | `Card`, `Button`, page wrappers |
| **lucide-react** | 0.446.0 | Icon set | One consistent icon library across the whole app — no mixed icon sets | Every icon usage |
| **clsx** | 2.1.1 | Conditional className joining | Small utility, avoids template-literal className bugs | Scattered across components |
| **recharts** | 2.12.7 | Charting | **Installed but unused** — `grep -rln recharts src/` returns nothing. Flagged rather than silently left: a real dependency with zero call sites is exactly the kind of drift worth naming, not removing without asking (removing a dependency the next engineer might be relying on a PR to add is a bigger decision than documenting it) | — |

### Component architecture

No component library. A hand-built design system in `client/src/components/common/`
(`Button`, `Card`, `Modal`, `Avatar`, `StatusBadge`, `SearchBar`, `ProgressRing`,
`SectionTitle`) plus shared feedback primitives in `components/feedback/`
(`LoadingState`, `EmptyState`, `ErrorState`, `Banner`, `Skeleton`, `ReferenceId`,
`ErrorBoundary`). All plain JSX — no PropTypes, no TypeScript on the frontend.

Page-level composition follows one layout per portal: `PatientLayout` (the only real
layout as of Phase 6) wraps every `/app/*` route with a sidebar, topbar, skip-link, and a
per-route-keyed `ErrorBoundary` so a thrown error unlatches on navigation rather than
staying stuck. `/clinic/*` and `/admin/*` are routed and role-guarded but render a
placeholder — deliberately not built ahead of a real requirement (Phase 2's stated
position, unchanged through Phase 6).

### Routing

A single flat `<Routes>` tree in `App.jsx`. Guards (`RequireAuth`, `RequireAnonymous` in
`app/guards.jsx`) are wrapper components, not layout routes — they redirect on a failed
check but are explicitly documented as **UX only**: every API endpoint re-authorizes
server-side regardless of what the client-side guard decided.

### State management

No global state library (no Redux/Zustand/Jotai). Two React Contexts carry
cross-cutting session state:

- **`AuthContext`** (`app/AuthContext.jsx`) — the single source of truth for "who is
  signed in": `user`, `permissions`, `profile`, `status` (`checking`/`authenticated`/
  `anonymous`), `loading`, `error`, plus `login`/`register`/`logout`/`reloadUser`. As of
  Phase 6, `profile` and `loading` are genuinely populated — both existed as consumed
  values in other files since Phase 5 but were never actually set here, a bug this phase
  found and fixed (see the implementation report, §5).
- **`AccessibilityContext`** (`app/AccessibilityContext.jsx`, Phase 5) — reads
  `profile.preferences.accessibility` and sets `data-*` attributes on `<html>` that
  `index.css` responds to. Now genuinely round-trips through a page reload, per the
  `AuthContext` fix above.

Everything else is local `useState`/`useEffect` per component, following the existing
convention rather than introducing a new pattern.

### Forms

No form library (no react-hook-form, no Formik). Every form is hand-rolled: one flat
`useState` object for values, one for field errors, a single `validate()` run on submit.
Server-side Zod field errors (`err.fieldErrors`) are mapped onto the same error-state
object the client-side validator populates, so one error-rendering code path serves both.

### API client

`client/src/lib/apiClient.js` — a single `axios` instance. Response interceptor unwraps
`{success, message, data, timestamp}` down to just `data`, so every service function
receives the payload directly. Error interceptor normalizes every rejection into a real
`Error` carrying `.message`, `.status`, `.fieldErrors`, and (Phase 5) `.requestId` — so a
patient reporting a failure has a reference to quote and support has an exact log line to
grep for.

The access token lives in a **module-scoped variable**, not `localStorage` — an XSS
payload can read `localStorage`; it cannot read a closure. A single-flight refresh
(`refreshPromise`) ensures N parallel 401s share one token-refresh call rather than firing
N rotations, which would trip the backend's reuse-detection and sign the user out — the
opposite of the intent.

### Authentication handling

Covered above (`AuthContext` + `apiClient`). Session restoration on page load happens via
a silent `POST /auth/refresh` against the httpOnly cookie — nothing is ever read from
`localStorage` to restore a session.

### Accessibility technologies

- Semantic landmarks (`<aside>`, `<header>`, `<main id="main-content" tabIndex={-1}>`,
  a `.skip-link`).
- A real focus trap + focus restoration in `Modal` and the mobile sidebar drawer.
- `.focus-ring` (2px outline + box-shadow — the outline is what survives Windows High
  Contrast Mode) applied globally to every interactive element.
- `.tap-target` / `--tap-min: 2.75rem` (44px) as a design-token constant, enforced on
  `Button` and on every `<input>/<select>/<textarea>` at mobile widths via a base CSS rule.
- Three accessibility preferences (`largeText`, `highContrast`, `reduceMotion`) are
  genuinely implemented via `data-*` attributes + CSS custom-property overrides — not
  merely stored. Three others (`screenReader`, `keyboardNav`, `focusIndicators`) were
  **deleted** in Phase 5 rather than left as decorative switches, because the properties
  they claimed to control (full keyboard operability, visible focus rings) are already
  unconditional — a toggle implying they could be turned *off* would have been actively
  misleading.

### Responsive approach

Mobile-first CSS with Tailwind's breakpoint utilities; the sidebar collapses to an
off-canvas drawer (with `inert` applied when closed, so its links are not tab-reachable
while invisible — a Phase 3 fix) below `lg`. Verified at 320/390/768/1280px with zero
horizontal overflow at any width, across every phase's own testing.

### Chart/visualization technology

**None in active use.** `recharts` is installed (see table above) but nothing imports it.
The Home dashboard (Phase 5) deliberately uses CSS/SVG-only visual summaries (a connected
timeline, a calendar block, count tiles) rather than a charting library — the dashboard's
own design decision was that a chart library was not justified by the amount of
genuinely-available time-series data (there is none yet).

### Image handling

Static assets served from `client/public/` (webp/png/jpg). No image-optimization
pipeline, no responsive `srcset` generation, no CDN — appropriate for the current asset
count and not a bottleneck yet.

### Caching / performance optimizations

- `React.lazy` + route-based code splitting — each page is its own chunk (visible in the
  build output as separate `dist/assets/<PageName>-<hash>.js` files).
- `Promise.allSettled` (not `Promise.all`) for independent data fetches on the Home
  dashboard, so one failing panel degrades to its own empty state rather than blanking
  the whole page.
- No service worker, no HTTP response caching layer, no React Query/SWR-style
  data-fetching cache — every navigation re-fetches. Acceptable at current traffic; would
  need revisiting before this became a bottleneck.

---

## 3. Backend

| Technology | Version | Purpose | Why | Depends on it |
|---|---|---|---|---|
| **Node.js** | 20.20.2 | Runtime | LTS at time of writing | Everything |
| **TypeScript** | 5.8.3 | Language | `strict: true`, `noImplicitAny`, `strictNullChecks` all on — the nullable `PatientProfile.userId`/`dateOfBirth` introduced in Phase 6 is enforced end-to-end by the compiler, not just by convention | The entire `src/` tree |
| **Express** | 4.21.2 | HTTP framework | Minimal, well-understood, no framework magic to fight when adding the Phase 6 routers | `app.ts`, every `*.routes.ts` |
| **Prisma** | 6.12.0 (client), CLI 6.19.3 | ORM + migration tool | Type-safe query builder generated from `schema.prisma`; migration history is plain, hand-editable SQL files (`prisma/migrations/*/migration.sql`) — Phase 6's four migrations were hand-written and hand-sequenced specifically because the auto-generated single migration would have violated Postgres's `NOT NULL` constraint on existing data (see the implementation report §3) | Every repository |
| **@node-rs/argon2** | 2.0.2 | Password hashing | Argon2id, tuned memory/time/parallelism cost — stronger than the PatientConnect reference blueprint's bcrypt-or-argon2 allowance | `auth.service.ts` |
| **jsonwebtoken** | 9.0.2 | Access-token signing/verification | 15-minute HS256 JWT, never persisted client-side (see Frontend §2) | `utils/jwt.ts` |
| **zod** | 3.25.76 | Runtime validation | Every `*.validator.ts` schema; `.parse()` called directly in controllers (no validation middleware layer) — a `ZodError` becomes a 400 with `err.flatten().fieldErrors` | Every controller |
| **helmet** | 8.1.0 | Security headers | CSP, HSTS (1yr, preload), frameguard deny, `noSniff`, `strict-origin-when-cross-origin` | `app.ts` middleware chain |
| **cors** | 2.8.5 | CORS enforcement | Explicit allow-list (`config/cors.config.ts`), not a wildcard | `app.ts` |
| **hpp** | 0.2.3 | HTTP parameter pollution guard | Strips duplicate query-string keys before they reach a handler | `app.ts` |
| **compression** | 1.7.5 | Response gzip | Standard, no configuration surprises | `app.ts` |
| **cookie-parser** | 1.4.7 | Cookie parsing | Reads the httpOnly refresh cookie | `app.ts`, `auth.controller.ts` |
| **express-rate-limit** | 7.5.0 | Rate limiting | Multiple tiers: global, auth (10/15min), refresh (60/15min — deliberately separate, since reuse detection not rate limiting defends refresh), forgot/reset/verify password, and (Phase 6) a dedicated `patientSearchLimiter` (30/15min) for the enumeration threat model | `middleware/rateLimiter.ts` |
| **express-slow-down** | 2.0.3 | Progressive delay | `authSlowDown` — request 4 onward on auth endpoints waits progressively longer, anti-credential-stuffing on top of the hard limiter | `auth.routes.ts` |
| **morgan** | 1.10.0 | HTTP request logging | Standard access-log middleware | `app.ts` |
| **nodemailer** | 9.0.5 | Outbound email | Password-reset and (Phase 5) notification emails, both via one Outlook-safe HTML template shape | `services/email.service.ts` |
| **multer** | 2.2.0 | Multipart/file upload parsing | **Installed but unused** — no route imports it, no upload endpoint exists. `ProfilePhoto` is a modelled-but-unwritten table. Flagged, not silently removed. | — |
| **dotenv** | 16.5.0 | Environment variable loading | `.env` in local dev | `config/env.config.ts` |

### API architecture

Versioned REST under `/api/v1`. Every domain follows the identical five-file layering
convention, established in Phase 2 and followed exactly by Phase 6's two new domains:

```
<domain>.routes.ts       — router.verb(path, authenticate, guard, handler); no logic
<domain>.controller.ts   — parse (Zod) → delegate to service → respond; req.user!.id only
<domain>.service.ts      — business rules, ownership resolution, audit logging; plaintext only
<domain>.repository.ts   — the ONLY layer that imports `prisma`; owns encryption/decryption
<domain>.validator.ts    — Zod schemas + inferred DTO types (omitted when no input exists)
```

`prisma` is imported by exactly the repository files and two cross-cutting services
(`careRelationship.service.ts`, `patientIdentity.service.ts` as of Phase 6) — nowhere else.

### Middleware (in request order)

`helmet` → `cors` → `hpp` → `compression` → `express.json({limit:'10kb'})` →
`cookieParser` → request logger → **requestId** (`crypto.randomUUID()`, echoed as
`X-Request-Id` and in every error body) → `trust proxy` (production only) →
`globalLimiter` on `/api` → routers → `notFoundHandler` → `errorHandler` (last).

Two authorization middlewares compose after `authenticate`:
`requirePermission(...)` (AND semantics — every listed permission must be held) and,
new in Phase 6, `requireAnyPermission(...)` (OR semantics, for the small number of
endpoints genuinely reachable via more than one distinct capability — e.g.
`GET /patients/:shriPatientId`).

### Authentication

Argon2id password hashing → a 15-minute HS256 JWT access token (never persisted
server-side, re-verified against the DB's `isActive`/`passwordChangedAt` on every request)
→ an opaque 256-bit refresh token (not a JWT — nothing to forge, and revocable before
expiry, which a JWT is not), SHA-256-hashed at rest, rotated on every use with
family-based reuse detection (a replayed token revokes the entire token family and forces
re-authentication).

### Authorization

Three layers, each answering a different question:

1. `authenticate` — who are you? (re-reads the role from the DB every request; a role
   change takes effect immediately, never trusted from a cached token claim)
2. `requirePermission`/`requireAnyPermission` — may your ROLE ever do this? (a static
   in-code map, `config/permissions.ts`; the DB's `Permission`/`RolePermission` tables
   exist in the schema but are deliberately left unpopulated — a round-trip to read a
   mapping that only changes on deploy buys nothing)
3. `careRelationshipService.requirePatientAccess()` — may THIS user do it to THIS patient?
   (row-level; written ahead of the doctor portal, unused until Phase 6 made it the first
   real consumer; always 404 never 403 on denial)

### Validation

Zod, called directly in controllers — no validation middleware layer. Path parameters get
their own inline schema (`z.object({ id: z.string().uuid(...) })`) so a malformed ID 400s
before reaching a repository.

### Rate limiting

See the dependency table above. All in-memory (single-instance only) — the standing,
documented limitation that must change (Redis-backed) before horizontal scaling.

### Logging

`morgan` for HTTP access logs; `console.error`/`console.warn` for application errors,
routed through no structured logging pipeline yet (no Winston/Pino). The audit service
(below) is the structured, queryable record of security-relevant events — application
logs are not relied on for that.

### Audit

`services/audit.service.ts` — fire-and-forget (`.catch()`-swallowed, never awaited by a
caller), append-only (`AuditLog` has no `updatedAt` and no update/delete code path
anywhere). 26 event types as of Phase 6 (16 pre-existing + 10 new: patient registration,
search, record view, duplicate detection/acknowledgement, account linking, encounter
create/close, assessment create/update). Every authorization denial is logged with
`Warning` severity; a token-reuse detection is logged `Critical`.

**One deliberate exception to fire-and-forget, new in Phase 6**: a change to a stroke
assessment's Last Known Well value is *additionally* recorded in a dedicated,
transactionally-written `StrokeLkwRevision` table — because the generic audit log's own
documented contract (a write failure is swallowed) is acceptable for "someone viewed a
page" and not acceptable for the value that gates thrombolysis eligibility. This is the
one place two writes are deliberately coupled rather than left to the async path.

### Error handling

A single global `errorHandler`, last in the middleware chain. `ZodError` → 400 with
`err.flatten().fieldErrors`; `AppError` (a thrown operational error carrying its own
status code) → that status code; anything else → 500 with the stack trace logged
server-side and never sent to the client. Every error body carries the request's
`requestId`.

### Background jobs

**None.** No queue, no worker process, no scheduled job runner. `notificationService.notify()`
and `auditService.log()` are both synchronous fire-and-forget calls within the same
request/response cycle, not deferred to a background worker.

### Synchronization architecture

**Not built** — offline/field sync is explicitly deferred (see the implementation report
§7). The seams left: `RegistrationSource.FieldRegistered`, a nullable
`Encounter.createdByUserId`, and server-generated (never client-supplied) identifiers
throughout.

### File handling

**Not built.** `multer` is installed and unused; `ProfilePhoto` is a modelled table with
no writer. No upload endpoint exists anywhere in the API.

### External integrations

**Two, both narrow:**

- **Nodemailer/SMTP** — password-reset and (Phase 5) notification emails. The
  notification channel is gated on the recipient's own preference *and* on
  `emailService.isConfigured`; a misconfigured or down SMTP server fails safely and never
  blocks the action that triggered the email.
- **None else.** No ABDM/ABHA API call, no SMS gateway, no payment processor, no video
  provider, no third-party AI/ML API. Every one of these is either explicitly out of
  scope or explicitly deferred (see the implementation report) rather than stubbed to
  look integrated.

---

## 4. Database

| Item | Value |
|---|---|
| Engine | PostgreSQL |
| Version | 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) |
| ORM | Prisma Client 6.12.0 (generator), Prisma CLI 6.19.3 |
| Migration system | Prisma Migrate — plain SQL files under `prisma/migrations/`, applied in directory-name (timestamp) order via `prisma migrate deploy` |
| Primary keys | UUID everywhere (`@default(uuid()) @db.Uuid`) — chosen so no internal identifier is sequential/enumerable; the *public*-facing identifier (`shriPatientId`, Phase 6) is a separate, non-UUID value precisely so it can be handwritten/dictated |
| Soft delete | `deletedAt` on `User`, `PatientProfile`, `DoctorProfile`, `StaffProfile` — a hard delete of a patient with any clinical history is blocked at the DB level (`onDelete: Restrict` on the user→patientProfile relation) |

### Why this stack was retained

PostgreSQL + Prisma was already in production before this phase began, with 12 users and
8 real patients' worth of encrypted PHI. Phase 6's own audit (`prisma migrate diff`
against the live database) confirmed zero schema drift — a clean, verified base for four
additive migrations. Nothing in the platform's requirements (identity matching, encounter
tracking, a stroke domain module) needed a different database engine or a different
ORM; changing either would have been risk with no corresponding benefit, and the
instruction governing this whole programme was explicit that PatientConnect's own stack
choices are a reference, never a mandate.

### Key models (only models that actually exist — nothing here is aspirational)

| Model | Purpose | Notable design |
|---|---|---|
| `User` | Login identity only | Deliberately no name/DOB/medical data — identity and profile are separate concerns |
| `PatientProfile` | The patient record | `userId` **nullable** as of Phase 6 (a staff/field-registered patient may have no login yet); 21 PHI columns AES-256-GCM encrypted at rest; `abhaIdHash`/`phoneNumberHash` are deterministic HMAC-SHA256 blind indexes alongside the encrypted plaintext, enabling exact-match search without decrypting a full table scan |
| `Encounter` (Phase 6) | One visit/episode; many per patient | Generic `EncounterType` enum, no stroke vocabulary; `onDelete: Restrict` on the patient relation, unlike `Appointment`'s cascade — a clinical record must not be silently destroyed |
| `StrokeAssessment` (Phase 6) | Stroke-domain intake, one per encounter | `encounterId @unique` — the pattern a future `OncologyAssessment` would copy exactly |
| `StrokeLkwRevision` (Phase 6) | Append-only audit of Last Known Well changes | Written in the same DB transaction as the assessment update; `reason` is `NOT NULL` |
| `DoctorProfile` / `StaffProfile` | Clinician / non-clinical staff identity | `StaffProfile` is modelled but was entirely unused by application code until Phase 6's `HealthcareWorker` fixture accounts |
| `CareTeamMember` | The patient↔doctor relationship that authorizes clinical access | `@@unique([patientId, doctorId, careRole])`; `activeTo: null` means the assignment is current |
| `Appointment` | A scheduled visit | `reason`/`notes` encrypted; no unique constraint preventing double-booking at the DB level (a known, documented gap — the PatientConnect reference's `(provider_id, scheduled_start)` unique constraint was noted as worth adapting but not yet done) |
| `Notification` | In-app notification | Deliberately carries no PHI — a title and a date, detail behind an authenticated `actionUrl` |
| `AuditLog` | Append-only security event log | No `updatedAt` column at all — the schema itself makes "there is no update path" structurally visible, not just documented |
| `RefreshToken` | Session/rotation state | `familyId` groups all tokens descended from one login; a reused (already-rotated) token revokes the whole family |
| `Permission` / `RolePermission` | **Modelled but unpopulated** | Authorization is a static in-code map (`config/permissions.ts`) instead — see Backend §Authorization |
| `ProfilePhoto` | **Modelled but unwritten** | No upload endpoint exists |

### Relationships (the ones that matter for authorization)

```
User ──1:1── PatientProfile ──1:N── Encounter ──1:1── StrokeAssessment ──1:N── StrokeLkwRevision
  │                │                    │
  │                ├──1:N── Appointment │
  │                └──1:N── CareTeamMember ──N:1── DoctorProfile ──1:1── User
  └──1:N── RefreshToken
```

### Indexes (only the ones actually created, and why)

- `[lastName, firstName]` on `PatientProfile` — added in Phase 2 specifically anticipating
  clinical name search; Phase 6's search endpoint is its first real consumer.
- `[phoneNumberHash]` (Phase 6) — **not unique**, verified necessary against live data: 4
  of 8 pre-existing patients had a phone number, and those 4 were only 3 distinct values.
- `[abhaIdHash] @unique` — pre-existing; the pattern `phoneNumberHash` generalises.
- `[dateOfBirth]` (Phase 6) — supports the name+DOB duplicate-matching signal.
- Every foreign key is explicitly indexed — Prisma does not auto-index FKs, and the
  codebase's own convention comment states this rule for every model.

### Transaction strategy

Prisma's `$transaction` is used wherever a multi-step write must be atomic:
`auth.repository.createUserWithProfile` (User + PatientProfile together, so one is never
created without the other), and — new in Phase 6 —
`encounter.repository.upsertAssessment` (the assessment write and, when Last Known Well
genuinely changed, the revision-log write, in one transaction, so a revision can never be
lost to a crash between the two writes).

### Audit strategy

Covered above (Backend §Audit). The one non-fire-and-forget exception
(`StrokeLkwRevision`) is likewise covered there.

### Backup strategy

`pg_dump` (custom format) is the tool used and verified working in this phase — a dump
was taken and confirmed restorable (`pg_restore -l`) immediately before Phase 6's schema
changes. **There is no automated/scheduled backup job in this repository** — this was a
manual, one-time safety step for this phase's migration, not a standing backup policy.
Establishing one is outside this phase's scope and is not claimed to exist.

### Data retention approach

**Not formally defined.** Soft-delete (`deletedAt`) exists on the identity-bearing models;
there is no automated purge/retention job, and no documented retention period. This is a
real gap for a system handling PHI under India's DPDP Act, named honestly rather than
implied to be handled.

### Encryption approach

AES-256-GCM, random 12-byte IV per value, applied at the repository layer (never via a
Prisma middleware/extension — encryption is invoked explicitly wherever a field needs it).
A separate `BLIND_INDEX_KEY` derives deterministic HMAC-SHA256 blind indexes for the two
fields that need exact-match search despite being encrypted (`abhaId`, and Phase 6's
`phoneNumber`). Full Aadhaar is never stored — only the last 4 digits, and only encrypted.

---

## 5. Security technology

| Mechanism | Purpose | Why chosen | Threat addressed |
|---|---|---|---|
| Argon2id (`@node-rs/argon2`) | Password hashing | Memory-hard, tuned cost parameters, resistant to GPU cracking | Offline password-cracking after a data breach |
| HS256 JWT, 15-minute expiry | Access token | Short-lived, stateless verification, never persisted client-side | Token theft via XSS has a 15-minute window, not indefinite |
| Opaque 256-bit refresh token, SHA-256 hashed at rest | Session continuance | Not a JWT — revocable before its expiry, which a self-contained JWT is not | A stolen refresh token can be revoked server-side the moment reuse is detected |
| Refresh-token rotation + family-based reuse detection | Session integrity | A replayed (already-rotated) token means theft — the whole family is revoked, forcing re-auth | Refresh-token replay after theft |
| httpOnly, `sameSite=lax`, path-scoped refresh cookie | Cookie security | JavaScript cannot read it even under XSS; scoped to `/api/v1/auth` so it is not sent to unrelated endpoints | Cookie theft via XSS; CSRF via a naive same-origin GET |
| AES-256-GCM field encryption | PHI-at-rest protection | Authenticated encryption — tampering is detected (auth-tag verification), not just unencrypted-looking | Database-level data exposure (backup theft, DB compromise, insider access without app-layer credentials) |
| HMAC-SHA256 blind index, separate key from the encryption key | Searchable encryption | Deterministic hash enables exact-match lookup without ever decrypting a full table scan; a separate key means compromising one key does not compromise the other | Brute-forcing the blind index does not recover the encryption key, and vice versa |
| TLS/HTTPS (deployment-level, not in this repo) | Transport security | Standard requirement; enforced by the deployment environment (Nginx/load balancer), not application code | Network eavesdropping |
| `helmet` (CSP, HSTS, frameguard, noSniff) | Response security headers | Defense-in-depth against a class of browser-side attacks even if application code has a gap | XSS payload execution, clickjacking, MIME-sniffing attacks |
| `cors` explicit allow-list | Cross-origin control | No wildcard origin | Unauthorized cross-origin credentialed requests |
| `express-rate-limit` (tiered) + `express-slow-down` | Abuse throttling | Separate limiters for login (credential-guessing threat), refresh (not a guessing surface — reuse detection defends it instead), and (Phase 6) patient search (population-enumeration threat, a genuinely different shape from login abuse) | Credential stuffing, brute force, and (new) patient-record enumeration |
| `zod` server-side validation | Input validation | Every mutating endpoint validates in the controller before the service ever runs; the frontend's own validation is UX only | Malformed/malicious payloads, type confusion |
| `hpp` | Parameter-pollution guard | Strips duplicate query keys before a handler sees them | HTTP parameter pollution attacks |
| Row-level authorization (`careRelationshipService`) | IDOR prevention | No repository method anywhere accepts a patient/encounter id from the client without an independent ownership check; always 404 not 403 on denial | Insecure Direct Object Reference — one user reading/modifying another's record by guessing/changing an id |
| Static permission map, Admin enumerated not wildcarded | Least-privilege RBAC | A wildcard silently absorbs every future permission; enumerating forces a deliberate decision each time a role's capability grows. **Phase 6's own regression testing caught and reversed** an initial over-broad grant (`patient:read:any` to every Doctor) — the tightened design now matches this stated principle exactly | Privilege creep; an unintentionally-broad role losing narrow scoping over time |
| `crypto.randomUUID()` request ID | Request correlation, not directly a security control | Lets a patient quote a support reference without exposing any PHI (the ID identifies a *request*, never a person) | — |
| Offline security | **N/A — not built** | Offline capability is deferred; there is no client-side persistence of sensitive data to evaluate yet | — |

---

## 6. Infrastructure

**Documented as verified from this environment — not assumed.** This development
environment has no reachable production deployment target; the items below are what is
actually configured here, not a description of a production topology that has not been
inspected.

| Item | Status |
|---|---|
| Server/hosting | Local development machine (this session's environment) |
| Operating system | Ubuntu 24.04 (via `psql`/`pg_dump` version strings) |
| Reverse proxy | Not configured in this environment — no Nginx config file exists in this repository |
| TLS certificate | Not applicable in local development |
| Process manager | None — the dev server (`tsx watch src/server.ts`) and this session's manual restarts are the only process supervision observed; no `pm2`/systemd unit inspected |
| Frontend deployment | `vite build` produces static assets in `client/dist/`; no deployment target configured in this repo |
| Backend deployment | `tsc` → `node dist/server.js` (see `package.json`'s `build`/`start`/`start:prod` scripts); a `Dockerfile` exists in `server/` (not inspected in depth this phase) |
| Database deployment | Local PostgreSQL 16.15 instance, `oncotrace_db` |
| DNS/domain | Not applicable in this environment |
| Logging | `morgan` HTTP access log to stdout; no centralized log aggregation observed |
| Backup | Manual `pg_dump`, performed once for this phase's migration safety (§4) — no scheduled job |
| Monitoring | None observed |

---

## 7. Developer tooling

| Tool | Version | Purpose |
|---|---|---|
| npm | 10.8.2 | Package manager |
| Git | (system) | Version control |
| TypeScript compiler | 5.8.3 | Type checking (`tsc --noEmit`) and production build (`tsc --project tsconfig.json`) |
| ESLint (server) | 8.57.1 | `@typescript-eslint`, `eslint-plugin-security`, `eslint-plugin-prettier`, type-aware linting (`parserOptions.project`) |
| ESLint (client) | 9.9.0 | Flat config, `eslint-plugin-react`/`react-hooks`/`react-refresh` |
| Prettier | 3.5.3 | Formatting, run as an ESLint rule (`prettier/prettier`) rather than a separate `prettier --check` gate in CI (no CI exists — see below) |
| Prisma CLI | 6.19.3 | Schema management, migration generation/application, `prisma studio` |
| `node:test` (Phase 6) | Built into Node 20.20.2 | **New this phase.** Zero additional dependency. Used for exactly two files — the SHRI-AI ID checksum and the identity-matching scoring table — chosen because both are pure functions with exact expected outputs, and both are exactly the kind of logic that rots silently without a check (the checksum's own transposition-detection weakness was found by writing its test, not by manual review) |
| tsx | 4.20.3 | TypeScript execution without a separate build step — `npm run dev`, the Prisma seed script, and Phase 6's migration/backfill scripts all run through it |
| CI/CD | **None** | No `.github/workflows/`, no other CI configuration found. Every check in this and every prior phase (`tsc --noEmit`, `eslint`, the new `node:test` suite, and all manual/live-API testing) was run by hand in this session — there is no automated gate preventing a regression from being merged |
| Security scanning | None beyond `eslint-plugin-security`'s static rules (already active, not new this phase) | No SAST/dependency-vulnerability scanning tool (`npm audit`, Snyk, etc.) was run as part of this phase |

---

## 8. Version inventory

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend framework | React | 19.0.0 | UI rendering |
| Frontend build | Vite | 5.4.0 | Dev server + production bundling |
| Frontend styling | Tailwind CSS | 4.0.0 | CSS-first design tokens |
| Frontend routing | react-router-dom | 6.26.0 | Client-side routing + role guards |
| Frontend HTTP | axios | 1.18.1 | API client |
| Frontend animation | framer-motion | 11.3.0 | Transitions, tap feedback |
| Frontend icons | lucide-react | 0.446.0 | Icon set |
| Backend runtime | Node.js | 20.20.2 | JavaScript runtime |
| Backend language | TypeScript | 5.8.3 | Static typing, `strict: true` |
| Backend framework | Express | 4.21.2 | HTTP server |
| Database | PostgreSQL | 16.15 | Primary datastore |
| ORM | Prisma Client / CLI | 6.12.0 / 6.19.3 | Query builder + migrations |
| Password hashing | @node-rs/argon2 | 2.0.2 | Argon2id |
| Token signing | jsonwebtoken | 9.0.2 | HS256 access tokens |
| Validation | zod | 3.25.76 | Server-side schema validation |
| Security headers | helmet | 8.1.0 | CSP/HSTS/frameguard |
| Rate limiting | express-rate-limit / express-slow-down | 7.5.0 / 2.0.3 | Abuse throttling |
| Email | nodemailer | 9.0.5 | Password reset + notification email |
| Testing | node:test | (Node 20.20.2 built-in) | Pure-function unit tests (Phase 6, 20 tests) |
| Package manager | npm | 10.8.2 | Dependency management |
| Type checking / lint | TypeScript / ESLint | 5.8.3 / 8.57.1 (server), 9.9.0 (client) | Static analysis |
| Infrastructure | — | — | No production infrastructure configured in this environment (§6) |

No version in this document was copied from the PatientConnect reference blueprint —
every number above was read directly from this repository's `package.json` files or from
the running environment (`node -v`, `psql --version`, `npx prisma --version`).

---

*No credentials, API keys, tokens, database passwords, or other secrets appear anywhere in
this document.*
