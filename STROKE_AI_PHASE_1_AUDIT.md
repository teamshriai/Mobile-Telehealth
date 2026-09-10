# STROKE-AI — Phase 1 Audit & Master Architecture

**Date:** 9 September 2026
**Scope:** Full system audit, competitive research, and proposed architecture.
**Status:** Phase 1 (analysis only). No source file was modified.

---

## A. Executive Summary

STROKE-AI is an **oncology product (OncoTrace AI) that has been reskinned as a stroke product at the content layer only**. The rename was never carried through the code: both `package.json` files are still named `oncotrace-*`, the Prisma schema header reads "a commercial precision oncology platform", the JWT issuer/audience are `oncotrace-ai` / `oncotrace-client`, all localStorage keys are `oncotrace_*`, and the mock data files retain oncology field names (`mockGenes.js` exporting `mockMutations`, `ctDNATrend`, `vaf`, `chromosome`; a component called `LiquidBiopsyCard`) with stroke content pasted inside them.

The codebase divides into three tiers of very different quality. This split is the single most important thing to understand before planning any work.

**1. The backend (auth + profile) is genuinely production-grade.** Strict four-layer separation (routes → controller → service → repository) with no leakage; Argon2id password hashing; AES-256-GCM field-level encryption on 19 PII columns with a *separate* blind-index key for searchable fields; an immutable append-only audit log; Zod-validated environment that hard-exits on misconfiguration; a hardened Express stack (Helmet CSP, strict CORS allowlist, HPP, 10 kb body cap, rate limiting + slow-down). It is also **already India-ready**: ABHA ID as a first-class encrypted identifier, a deliberate policy of never storing the full Aadhaar number, Indian mobile and 6-digit PIN validation, and a village/city/district/state address hierarchy. `npx tsc --noEmit` passes clean.

**2. The landing page is genuinely good.** A coherent editorial cream/ink design system with documented tokens, a real academic citation (Saver, *Stroke*, 2006), excellent image alt text, and full `prefers-reduced-motion` support. Most notably, `heroContent.js` contains an explicit written refusal to invent deployment or accuracy statistics because the product is pre-launch — exactly the right instinct for a regulated medical product.

**3. The authenticated patient portal is ~95% mock, and in three places it is actively misleading.** Only Profile and Settings call the real API. Dashboard, Timeline, Health Records, Reports, Appointments, Meetings and Care Guide are entirely fixture-driven. Worse, the fixtures are US-flavoured — UCSF San Francisco, `+1 (415)` phone numbers, Blue Shield of California, Medicare Part B, Pacific/Eastern/Central timezones — which directly contradicts the landing page's precise Coimbatore / Tamil Nadu–Kerala positioning. A visitor reads about a 110 km golden-hour catchment around Coimbatore, signs up, and lands in a San Francisco oncology-shaped dashboard.

### The findings that should set Phase 2 priority

Three features present **fabricated behaviour to patients without disclosure**. This matters because the codebase elsewhere shows it knows how to do this correctly — the Emergency alert flow carries a `SafetyDisclaimer` on every screen and a "PREVIEW — no real ambulance has been dispatched" banner, and the `/demo/*` consoles carry a persistent "Frontend demo — not connected to a live system" badge. These three do not:

- **Care Guide** (`client/src/pages/AIAssistant.jsx:6-14`) picks one of **three hardcoded replies at random** for any question asked, and phrases them as personalised clinical reassurance: *"based on your latest NIHSS trend and care plan, everything points toward steady recovery."* There is **no disclaimer anywhere on the page**. A patient typing "my speech is slurring again" receives randomised reassurance that reads as if their chart was consulted.
- **Report upload** (`client/src/pages/Reports.jsx:129-165`) animates a fake progress bar, adds the file to a local array labelled *"Awaiting physician review"*, and never transmits it. The file is gone on refresh.
- **Appointment booking** (`Appointments.jsx:811`, a bare `setTimeout(600)`) and **telehealth scheduling** (`MeetingsPage.jsx:25-44`, which mints a fake `meet.telehealth-care.org` URL and a random passcode) confirm bookings that no doctor ever receives.

Separately: **there is no AI in the product.** No model SDK appears in either `package.json`, and there is no inference code anywhere. "Stroke AI" is currently a brand, not a capability. This is worth stating plainly because it determines what the product may honestly claim.

### Legal and clinical-safety exposures

Four items are risks in their own right, independent of the software quality:

- **"HIPAA-compliant" is asserted 7 times** across the auth screens and Reports (`Login.jsx:170,309`; `Register.jsx:292,660`; `ResetPassword.jsx:408`; `ForgotPassword.jsx:220`; `Reports.jsx:409`). HIPAA is US law and does not apply to a Tamil Nadu / Kerala deployment; the applicable regimes are India's DPDP Act 2023 and ABDM. This is an unverifiable regulatory claim shown at the point of sign-up. The repo's own hero spec flags exactly this category as *"the highest priority in this file… placeholder regulatory badges are a real liability, not a design detail"* — the landing page complied and shipped no badge row; the auth pages did not.
- **Real institution data attached to fictional people.** Every clinical facility in the portal is UCSF, including its real street addresses (`1600 Divisadero St`, `505 Parnassus Ave`), its real patient-portal URL (`https://mychart.ucsf.edu`), and a fabricated doctor at the real domain (`priya.nair@ucsf.edu`). Insurance uses `Blue Shield of California` with a real-format toll-free number.
- **Photographs of real, identifiable people used as fictional doctors.** `mockMeetings.js` hot-links four Unsplash portraits and captions them as named clinicians (Dr. Priya Nair, Meera Pillai NP, Dr. Rajan Mehta, Dr. James Okafor).
- **The BEFAST checklist is decorative.** `EmergencyAlert.jsx:522` — `handleSendAlert` never reads the `checked` state; the symptom selections are used for styling only and are neither required nor transmitted. The most treatment-critical triage data in stroke is collected on screen and discarded.

There is also a **live rendering bug with clinical meaning**: `MedicalRecords.jsx:99-103` renders the stat "Current NIHSS" from `patient.ctDNA.current`, so the patient's stroke severity score displays as **`0.18`**. NIHSS is an integer 0–42. The oncology field was never remapped. Relatedly, the mock stroke patient still carries a full lung-cancer biomarker panel (EGFR Exon 19 deletion, ALK, PD-L1, KRAS, ROS1, BRAF) and is prescribed **Osimertinib**, an EGFR inhibitor.

**Overall assessment:** the foundations are better than the surface suggests. The backend and landing page are assets worth building on. The portal needs its fabrications neutralised and its data layer built for real — not a visual redesign, which would only make the fabrications more convincing.

---

## B. Existing Architecture

```
TELEHEALTH/
├── client/          React 19 · Vite 5 · Tailwind v4 · react-router 6      (85 files, ~19,000 lines)
├── server/          Express 4 · TypeScript 5.8 · Prisma 6 · PostgreSQL    (32 files, ~3,000 lines)
└── (no CI, no docker-compose, no root package.json / workspace)
```

**Frontend** — React 19 with Vite 5. Tailwind CSS v4 using the CSS-first `@theme` block in `src/index.css` (there is no `tailwind.config.js`). Routing is `react-router-dom` 6 with `lazy()` + `Suspense` on every route. State is local `useState` only — **no Redux, no Zustand, and no React Context anywhere in the codebase**. Data fetching is axios through a single well-built client. Icons from `lucide-react`, animation from `framer-motion`, charts from `recharts`. No TypeScript, no test runner.

**Backend** — Express 4 on Node ≥ 20, TypeScript in `strict` mode with `noUnusedLocals` and `noImplicitReturns`. Prisma 6 against PostgreSQL. Zod for all validation. Argon2id via `@node-rs/argon2`. Nodemailer for transactional email. The app factory (`createApp()` in `src/app.ts`) is deliberately separated from the port binding in `src/server.ts`, which makes it testable in isolation — though nothing currently tests it.

**Database** — PostgreSQL with 8 models: `Role`, `Permission`, `RolePermission`, `User`, `PatientProfile`, `AuditLog`, `ProfilePhoto`, `PasswordResetToken`. UUID primary keys throughout, `snake_case` columns via `@map`. Three migrations, all present and replayable. The seed script creates only the five roles — there are no demo users or clinical fixtures in the database at all.

**Deployment** — A well-constructed multi-stage `server/Dockerfile` (build stage → production stage with `npm ci --omit=dev`, running as a non-root user, with the correct `linux-musl-openssl-3.0.x` Prisma binary target for Alpine). Migrations are deliberately *not* run on container start, with a documented explanation about multi-replica races. There is **no CI pipeline, no docker-compose, no Kubernetes manifest, and no deployment config for the frontend**.

### Data flow

The real path, which exists only for auth and profile:

```
Component → services/*.service.js → lib/apiClient.js (axios)
   → [Bearer JWT from localStorage]
   → Express → rateLimiter → authenticate → authorize(Role)
   → controller → Zod validate → service → repository → Prisma → PostgreSQL
   → { success, message, data } envelope
   → response interceptor unwraps `.data.data`
   → component state
```

The path for everything else:

```
Component → import from src/data/mock*.js → render
```

---

## C. Current Functionality Inventory

| Feature | Route | Backed by | Works? | Assessment |
|---|---|---|---|---|
| Landing page | `/`, `/landing` | Static | Yes | **Keep.** Best work in the repo. |
| Register | `/register` | `POST /auth/register` | Yes | **Keep.** Contract-aligned, Indian mobile validation. |
| Login | `/login` | `POST /auth/login` | Yes | **Keep.** Timing-attack resistant, lockout after 5 attempts. |
| Forgot / Reset password | `/forgot-password`, `/reset-password` | Real, 3 endpoints | Yes | **Keep.** Hashed single-use tokens, correct anti-enumeration. |
| Profile | `/dashboard/profile` | `GET/PATCH /profile` | Yes | **Keep.** Best error/loading handling in the app. |
| Settings | `/dashboard/settings` | `PATCH /profile/preferences` | Partly | **Keep, fix.** Saves fine; several prefs do nothing (§F). |
| Dashboard | `/dashboard` | `mockPatients`, `mockAppointments` | Mock | **Redesign.** Clinical facts hardcoded in JSX. |
| Timeline | `/dashboard/timeline` | `mockTimeline` | Mock | **Keep concept, rebuild.** Strong idea for stroke care. |
| Health Records | `/dashboard/medical-records` | `mockGenes`, `mockPatients` | Mock | **Rebuild.** Still oncology-shaped internally. |
| Reports | `/dashboard/reports` | `mockReports` | Mock | **Fix urgently.** Upload is fabricated (§D-C2). |
| Appointments | `/dashboard/appointments` | `mockAppointments` | Mock | **Fix urgently.** Booking is fabricated (§D-C3). |
| Online Meetings | `/dashboard/meetings` | `mockMeetings` | Mock | **Fix urgently.** No video stack exists at all. |
| Care Guide (AI) | `/dashboard/ai` | 3 random canned strings | **Fabricated** | **Disable.** Highest-risk item (§D-C1). |
| Emergency Alert | Dashboard component | `mockPatients` | Mock, **disclosed** | **Keep.** Correctly labelled a preview. |
| Platform demo | `/demo/*` (7 pages) | Static | Mock, **disclosed** | **Keep.** Useful sales asset, honestly badged. |
| Legal pages | `/terms`, `/privacy` | Static stub | Placeholder | **Must write before launch.** |

**Notable absences:** no medications module, no care-team directory, no notifications backend (the bell menu is hardcoded in `Topbar.jsx:29`), no document storage, no doctor or admin portal, no messaging.

---

## D. Bugs & Technical Debt

### CRITICAL

**C1 — The Care Guide fabricates personalised medical reassurance.**
`client/src/pages/AIAssistant.jsx:6-14`. `generateReply()` returns `GENERIC_REPLIES[Math.floor(Math.random() * 3)]`. The replies are written in the first person as though the patient's chart had been reviewed. There is no disclaimer on the page. For a stroke product — where the entire clinical premise is that delay causes irreversible harm — randomised reassurance in response to a symptom report is the most serious defect in the system.

**C2 — Report upload silently discards patient files.**
`client/src/pages/Reports.jsx:129-165`. Fake progress interval, then a local array push with `summary: 'Awaiting physician review.'` Nothing is transmitted or persisted. A patient who uploads a discharge summary will reasonably believe their care team has it.

**C3 — Appointment and telehealth booking confirm appointments that do not exist.**
`Appointments.jsx:811` is `setTimeout(() => setSubmitted(true), 600)`. `MeetingsPage.jsx:25-44` fabricates a meeting object including `meetingUrl: 'https://meet.telehealth-care.org/room/new-meeting'` (a domain that does not resolve) and a random passcode.

**C4 — No error boundary anywhere in the application.**
Zero matches for `ErrorBoundary`, `componentDidCatch`, or `getDerivedStateFromError`, and no router `errorElement`. Any render-time throw white-screens the entire app with no recovery path.

**C5 — `client/node_modules` is committed to git.**
15,264 tracked files, inflating `.git` to 63 MB. It is listed in `.gitignore` but was committed before the rule was added, so the rule has no effect. (`server/node_modules` is correctly excluded.)

**C6 — "HIPAA-compliant" claimed 7 times on an India-deployed product.**
`Login.jsx:170,309`, `Register.jsx:292,660`, `ResetPassword.jsx:408`, `ForgotPassword.jsx:220`, `Reports.jsx:409`. HIPAA is US law and does not apply; DPDP Act 2023 / ABDM do. An unverifiable regulatory claim placed at sign-up.

**C7 — Real institution data and real people's photographs in fixtures.**
UCSF's real addresses, real `mychart.ucsf.edu` URL, and `priya.nair@ucsf.edu` at the real domain; `Blue Shield of California` with a real-format toll-free number; four Unsplash portraits of identifiable people captioned as named doctors (`mockMeetings.js:9,21,34,57`).

**C8 — The BEFAST checklist does not gate or accompany the emergency alert.**
`EmergencyAlert.jsx:522`. `handleSendAlert` never reads `checked`; the symptom state drives styling only. An alert can be sent with zero symptoms selected, and the selections are never transmitted.

**C9 — "Current NIHSS" renders a circulating-tumour-DNA value.**
`MedicalRecords.jsx:99-103` reads `patient.ctDNA.current`, displaying a stroke severity score of **`0.18`** (NIHSS is an integer 0–42). The same fixture still carries a lung-cancer biomarker panel and prescribes **Osimertinib** (`mockPatients.js:78-187`).

### HIGH

**H1 — 15-minute sessions with no refresh token.** `JWT_EXPIRES_IN=15m` and no refresh mechanism exists, so patients are logged out every 15 minutes mid-task. `jwt.config.ts:10-13` states the file is "intentionally structured" for refresh tokens, but they were never built. For elderly or recovering stroke patients this alone could make the portal unusable.

**H2 — `isAuthenticated()` never validates the token.** `App.jsx:38-41` checks only that `localStorage.oncotrace_session === 'active'`. It never inspects the JWT or its expiry, so a user with an expired token passes the route guard and discovers the problem only via a 401 mid-page.

**H3 — No global auth state.** `useAuth()` is a per-component `useState` hook with no Context or store, so each call site holds an independent copy of the user. Logging out in the sidebar does not notify any other mounted consumer; the app relies on the subsequent `navigate()` unmounting everything.

**H4 — Credentials exposed.** A live-looking Gmail app password sits in `server/.env` (correctly gitignored and never committed — verified). EmailJS keys *are* recoverable from git history in commit `8e2628a` (`client/.env`). These are client-side public keys so severity is limited to quota abuse, but they should be rotated and domain-locked.

**H5 — Frontend lint is broken.** `npx eslint src` fails with `Cannot find package 'globals'`. The `lint` script has therefore not run for some time; a stale `client/lint-output.txt` from July is committed.

**H6 — No tests, and the test file cannot run.** There is no `test` script in `server/package.json`. `src/__tests__/passwordReset.test.ts` imports `vitest`, which **is not installed**. A hand-rolled `runPasswordResetTest.ts` duplicate exists, presumably written because vitest was never wired up. Neither is executable via npm.

### MEDIUM

**M1 — Accessibility preferences are saved and then ignored.** Six toggles (`largeText`, `highContrast`, `reduceMotion`, `screenReader`, `keyboardNav`, `focusIndicators`) validate server-side and persist to the database, but **no component reads any of them**. A visually impaired patient enabling large text sees no change.

**M2 — Language and date-format preferences do nothing.** No i18n library is installed. There are 18 hardcoded `toLocaleDateString('en-US')` calls, so dates render MM/DD/YYYY regardless of the saved preference.

**M3 — Dark mode is a working switch over no dark styling.** Only 2 `dark:` variants exist, in one file. *Mitigating:* the UI honestly discloses this to the user.

**M4 — 390 kB of mock data ships to production.** `mockGenes-*.js` is the second-largest chunk in the build output.

**M5 — Twelve components exceed 400 lines**, topped by `Appointments.jsx` at 1,047. They are well-organised internally (multiple named sub-components per file) so they need splitting into modules, not rewriting.

**M6 — ~1,127 lines of dead code.** Two orphaned stylesheets (`src/App.css` 499 L and `src/styles/App.css` 267 L — neither is imported; only `index.css` is), plus `AIInsights.jsx`, `EmptyState.jsx`, `useLocalStorage.js`, and `usePageTransition.js` — all verified as having zero inbound references.

**M7 — Duplication.** `pageVariants` is copy-pasted byte-identically into 6 files (while the `usePageTransition` hook that exists to solve this sits dead); `DotGrid` plus an ad-hoc token block is duplicated across all 4 auth pages.

**M8 — In-memory rate limiting.** Limits multiply by replica count and reset on deploy. Needs a Redis store before scaling out.

**M9 — Logout does not revoke.** It writes an audit row; the JWT stays valid until expiry. The code comment is honest about needing a denylist.

**M10 — Email verification is dead schema.** `isVerified`, `verificationToken`, `verificationExpires` and the `EmailVerified` audit action all exist; nothing sets them.

### LOW

- `X-Forwarded-For` is trusted unconditionally in `requestMeta.ts` while `trust proxy` is production-only — spoofable audit-log IPs in dev.
- `/health` exposes `NODE_ENV` unauthenticated and unthrottled.
- Unused dependencies: `multer` (no upload exists) and `cookie-parser` (no cookie is ever read or written).
- Vite path aliases (`@`, `@components`, …) are configured and never used.
- 12 hotlinked Unsplash images are a runtime third-party dependency.
- `EmergencyAlert.jsx:154` has a redundant `lg:text-right` duplicating its base class.
- `notFoundHandler` reflects `req.url` into the response body.

---

## E. Responsive Audit

**This is in better shape than expected and needs targeted fixes, not an overhaul.** Prefix distribution: `sm:` 192, `lg:` 103, `md:` 48, `xl:` 13.

Genuinely well handled:

- A real off-canvas mobile drawer (`Sidebar.jsx:127`, `w-[88vw] max-w-[280px]`) with backdrop and Escape-to-close, plus `const showExpanded = expanded || mobileOpen` — correctly recognising that a touch device has no hover state.
- `body { overflow-x: clip }` with a comment explaining why `clip` beats `hidden` (the latter makes body a scroll container and breaks sticky descendants).
- `html, body { min-width: 320px }`; iOS zoom prevention via `font-size: max(16px, 1em)` on mobile inputs.
- **No `<table>` elements anywhere** — so no unwrapped-table overflow risk. Horizontal filter rails correctly use `overflow-x-auto`.
- Fixed pixel values are almost entirely `max-w-[…]` (safe) rather than `w-[…]`.
- A full `prefers-reduced-motion` CSS block, additionally honoured in JS at five call sites.

Specific issues:

| # | Location | Problem |
|---|---|---|
| E1 | `MeetingsPage.jsx:148` | `min-w-[220px]` unguarded in a flex row — can overflow at 320 px. |
| E2 | `MeetingCard.jsx` (156 L) | **Zero responsive prefixes** in a card with avatar + title + doctor + time + badge + buttons. Most likely cramped element in the app. |
| E3 | `AppointmentCard`, `PatientVitals`, `QuickActions`, `RecentReports` | No responsive prefixes; no mobile-specific adaptation. |
| E4 | `Topbar.jsx:392` | Search palette uses `top-[12vh]`; `vh` shifts on mobile Safari as the URL bar collapses. |
| E5 | `MedicalRecords.jsx:225` | `flex-1 min-w-[200px]` — same class of issue as E1, lower risk. |
| E6 | Landing components | Use inline `style` with `clamp()` rather than Tailwind. Fluid and it works, but **two incompatible responsive strategies now coexist**, and landing breakpoints can't be reasoned about with Tailwind conventions. |
| E7 | `Hero.jsx:23` | Uses `19cqw` container-query units; silently falls back if no `container-type` ancestor exists. |

---

## F. UX Audit

*Could a normal patient understand this interface without technical knowledge?* For the portal, **frequently not**.

**Unexplained clinical jargon.** Health Records surfaces `NIHSS`, `mRS`, "Hemorrhagic Transformation", "Occlusion Site — Left MCA, M1 segment", "Ischemic Core" as bare labels and numbers. `MedicalRecords.jsx:417` renders a chart titled "NIHSS Score Trend" with no statement of what the scale measures or whether a rising number is good or bad. The only place any of this is explained in plain language is inside the *fabricated* Care Guide conversation. Every clinical score shown to a patient needs a one-line plain-language gloss and a direction-of-good indicator.

**The dashboard leads with the wrong thing.** The hero panel is a dark navy gradient headed *"AI Powered Command Centre"* — internal, technology-facing language. A stroke patient's actual first questions are: *When is my next appointment? Which medicines today? Am I recovering? What do I do if it happens again?* "Command Centre" is a dispatcher's frame, not a patient's.

**Hardcoded clinical claims in JSX.** `Dashboard.jsx:105-145` hardcodes "NIHSS score improved from 8 to 3 since admission", "No hemorrhagic transformation on follow-up CT", and "Continue Clopidogrel 75mg and Atorvastatin 40mg daily" directly in markup. Every patient sees the same medication instructions. In a live system this is a patient-safety defect, not a content bug.

**Silent failures.** `Settings.jsx:86-99` performs an optimistic update with rollback, which is the right pattern — but the rollback is silent: the toggle flips back with no explanation. `Settings.jsx:70-72` swallows the profile fetch error entirely. There is no toast or snackbar system anywhere in the app.

**Empty states are inconsistent and largely absent.** `EmptyState.jsx` exists as the designated primitive and is used by **zero files**; Timeline, Reports and Appointments each hand-roll their own, while MedicalRecords, Dashboard, AIAssistant and MeetingsPage have none. `AppointmentCard` returns `null` when there is no appointment, so a patient with an empty schedule sees a blank space rather than "No upcoming appointments — book one".

**Loading states exist only where real data does.** Profile and Settings handle loading properly. The seven mock-driven pages render synchronously, so **all seven will need loading, error and empty states built from scratch** when connected to real APIs.

**Emergency access is the strongest patient-facing work.** The BEFAST checklist, onset-time capture, and bystander mode are well-judged for stroke. It is honestly labelled a preview throughout — but it lists no Indian emergency number (108 / 112) anywhere.

---

## G. AI Content Audit

The AI *copy* problem is much smaller than expected; the AI *capability* problem is total.

**Decorative AI copy — a short list.** Only one instance in the portal: `Dashboard.jsx:79` — "AI Powered Command Centre". The demo consoles legitimately describe an AI inference step in a workflow diagram, and the landing page uses "AI" sparingly and in context. Notably, the landing page was deliberately built *against* generic AI-template aesthetics — no neon, no gradient text, no robot imagery, no glassmorphism — and `heroContent.js:5-13` contains an explicit refusal to invent metrics like "94% triage accuracy" on the grounds that they would be unsourced medical claims. **That instinct is correct and should be preserved as the product's editorial standard.**

**No legitimate AI functionality exists.** No AI or ML SDK appears in either `package.json`. No inference code, no model files, no API keys for any model provider. The `aiInsights` field in the preferences schema is a notification toggle for a feature that does not exist. The `ai_prediction` timeline type ("AI Stroke Detection") is a mock category.

**Recommendations:**

1. Rename "AI Powered Command Centre" to something patient-framed — e.g. *"Good morning, Anand — here's your recovery at a glance."*
2. Disable the Care Guide until it is real; a fake AI assistant is the worst of both worlds.
3. **Do not remove AI from the brand or the landing page.** The stroke-imaging AI is the genuine product thesis and the demo consoles describe it accurately as a forthcoming capability. The rule should be: *the marketing site may describe what the platform will do; the patient portal may only show what it actually does.*
4. Where AI does eventually appear in the portal, label the output as AI-generated and always name the clinician who reviewed it.

---

## H. Competitive Research

### Indian digital-health platforms

| Platform | What they do | Why it works | Does STROKE-AI need it? |
|---|---|---|---|
| **Apollo 24\|7** | Hospital-backed app owning the full patient relationship inside one network | Vertical integration — records, consults, pharmacy and diagnostics in one place. The benchmark for hospital-owned apps | **Yes, as the model.** STROKE-AI's IndoStates partnership is structurally the same bet. Its known weakness — records don't travel outside the network — is exactly what ABHA linkage solves |
| **Practo** | Doctor discovery and booking | Dominant in metros for search and booking | **Partially.** STROKE-AI has a defined hub-and-spoke network, so discovery matters far less than *routing to the right node* |
| **Tata 1mg / PharmEasy** | Medicine delivery first, teleconsult added | Medication adherence is a habit-forming daily touchpoint | **Yes, the adherence pattern.** Secondary stroke prevention *is* medication adherence — antiplatelets, statins, anticoagulants |
| **Eka Care** | ABHA-native personal health record | Built around portability from day one | **Yes.** The closest model for STROKE-AI's records layer |

### ABDM / ABHA — a structural requirement, not a feature

India's Ayushman Bharat Digital Mission is the decisive architectural constraint, and the backend has *already anticipated it* by encrypting an ABHA ID with a blind index. Compliance requires ABHA identity linkage, consent management via the HIE-CM (a consent artefact for every data access, with a patient-visible dashboard of who accessed what), FHIR R4 formatting, and HFR/HPR registry linkage. Certification runs sandbox → CERT-In empanelled security audit → production, typically 3–6 months, and is mandatory for government-empanelled providers.

**Implication:** consent and audit are not Phase 5 polish. The audit log already exists and is well-built; the consent model does not, and it should be designed into the schema now rather than retrofitted.

### Stroke-specific platforms

**Viz.ai** and **RapidAI** are the reference implementations — 2,000+ hospitals, 50+ FDA-cleared algorithms, LVO flagged within ~5 minutes of scan, with a measured 39.5-minute reduction from arrival to neurointerventionalist contact. Both are **clinician coordination tools, not patient apps**; their mobile apps target the stroke team.

**What to take:** the time-to-treatment framing, parallel notification of the whole team, and the golden-hour countdown as the organising metric. The `/demo` consoles already model this well.

**What not to take:** their information density. STROKE-AI's differentiator is that it also serves the *patient*, in a market where the patient often coordinates their own care across unconnected providers. That is a genuine gap Viz.ai and Apollo both leave open.

### Patient-portal UX consensus

Plain language over jargon; consistent navigation with explicit next steps; mobile-first; WCAG conformance; simplified but explained authentication; **structured data rather than rendered documents**; and results released immediately *with* plain-language interpretation. STROKE-AI currently fails the plain-language and interpretation points most clearly (§F).

**Sources:** [Chambers Digital Healthcare 2026 – India](https://practiceguides.chambers.com/practice-guides/digital-healthcare-2026/india/trends-and-developments) · [ABDM compliance for healthcare apps](https://verticomply.com/compliance-info/abdm) · [ABHA integration guide](https://productgrowth.in/insights/healthtech/abha-integration-guide/) · [Viz.ai](https://www.viz.ai/) · [RapidAI at MUSC](https://muschealth.org/health-professionals/progressnotes/2023/summer/rapidai-visualization-and-stroke-care) · [Viz.ai outcomes study](https://www.businesswire.com/news/home/20230208005564/en/Large-Real-World-Multi-Center-Study-Demonstrates-Viz.ai-Platform-Saves-Critical-Minutes-in-Stroke-Care) · [Patient portal UX practices](https://visimpact.com/patient-portal-ux-best-practices-that-raise-adherence/) · [Patient portal features 2026](https://arkenea.com/blog/patient-portal-features/)

---

## I. Proposed Patient Portal Information Architecture

The current sidebar has 9 items across three groups, several of which are oncology-era holdovers. Proposed structure — **six primary destinations**:

```
🏠  Home              Next appointment · today's medicines · recovery snapshot · emergency
📅  Appointments      Upcoming · past · book · join video consultation
💊  Medicines         Current prescriptions · daily schedule · adherence · refills
📁  My Health         Records · reports · scans · timeline · allergies · conditions
👥  My Care Team      Neurologist · therapists · coordinator · message · contact
🆘  Emergency         BEFAST check · 108 · emergency contacts · my medical summary
```

With **Profile** and **Settings** in a footer group, as they are now.

Key changes and rationale:

- **Merge Timeline + Health Records + Reports into "My Health."** Three separate destinations for "information about me" is the oncology-era structure. Timeline becomes a view *within* My Health, not a peer of it.
- **Merge Appointments + Online Meetings.** From the patient's point of view a video consultation *is* an appointment that happens to be remote. Two nav items for one concept is a needless choice.
- **Add Medicines as a first-class destination.** Secondary stroke prevention is overwhelmingly a medication-adherence problem, and it is currently missing entirely.
- **Add My Care Team.** Stroke recovery is multi-disciplinary (neurologist, physiotherapist, speech therapist, coordinator). The data already exists in the fixtures; it has no home.
- **Promote Emergency to top-level.** It is currently a dashboard component. For a stroke product it should be reachable in one tap from anywhere, including on the lock-screen-adjacent surfaces a future mobile app will have.
- **Retire Care Guide as a nav item** until it is real.

**Home should answer four questions above the fold:** What do I do today? When is my next appointment? Am I improving? What if it happens again?

---

## J. Proposed Naming System

| Current name | Proposed name | Reason |
|---|---|---|
| Dashboard | **Home** | "Dashboard" is analyst language; patients aren't monitoring a system |
| AI Powered Command Centre *(hero)* | **"Good morning, {name} — your recovery at a glance"** | Technology-facing → patient-facing |
| Medical Records | **My Health** | Warmer, and accommodates the merged timeline/reports |
| Reports | *(section within My Health)* | Not a separate destination |
| Timeline | **My Stroke Journey** | Plain language; "timeline" is a UI pattern name |
| Online Meetings | **Video Consultations** *(merged into Appointments)* | "Meetings" is corporate, not clinical |
| Care Guide / AI Assistant | **Ask a Question** *(when real)* | Sets an honest expectation |
| Liquid Biopsy Card | **Treatment Progress** | Oncology holdover; renders stroke stages |
| Genomics / ctDNA / Tumor *(tab ids)* | **Scans / Recovery Score / Progress** | Internal ids still oncology |
| Biomarkers | **Lab Results** | Patient-comprehensible |
| NIHSS Score | **Stroke Severity Score (NIHSS)** + plain gloss | Keep the clinical term, explain it |
| mRS | **Daily Independence Score (mRS)** + plain gloss | Same principle |
| Emergency Alert | **Get Emergency Help** | Verb-first: says what it does |
| `oncotrace_*` *(storage keys)* | `strokeai_*` | Brand consistency |
| `mockGenes.js` → `mockMutations` | `mockImaging.js` → `imagingFindings` | Code-level oncology holdover |

**Not renamed on purpose:** Profile, Settings, Appointments, Login/Register — these are already clear, and renaming them would be change for its own sake.

### Terminology collisions — the same route has up to four names

A partial de-jargonising pass was applied to the sidebar and Quick Actions but not to page `<h1>`s, the Topbar search index, or the SpokeRail. Three vocabularies now coexist for the same destinations:

| Route | Sidebar | Search index | SpokeRail / Quick Action | Page `<h1>` |
|---|---|---|---|---|
| `/dashboard/ai` | Care Guide | **AI Assistant** | **AI Assistant** / Care guide | **Stroke AI Assistant** |
| `/dashboard/timeline` | Timeline | Timeline | **Care Journey** / Care timeline | **Medical Timeline** |
| `/dashboard/medical-records` | Health Records | **Medical Records** | Health Records | Health Records |
| `/dashboard/reports` | Reports | Reports | **Add a document** | **Medical Reports** |

Also inconsistent: "Golden Hour" vs "Golden Window"; "Explore the platform" vs "Explore the Platform"; and `LandingNavbar.jsx:24` labels a link **"Contacts"** that navigates to `/login`.

Whichever names are chosen, they must be applied to **all four surfaces at once**. The renaming work is as much about eliminating these collisions as about choosing better words.

---

## K. Proposed Three-Role Architecture

**The backend already supports this correctly. The frontend has no concept of roles at all.**

Already in place: a `RoleName` enum (`Admin`, `Patient`, `Doctor`, `HealthcareWorker`, `LabTechnician`); a `Role` table separated from `User` so RBAC can expand without touching users; a variadic `authorize(...roles)` middleware that audit-logs every denial; registration that hardcodes the `Patient` role so no one can self-assign privilege; and `Permission` / `RolePermission` tables scaffolded but unpopulated.

What is missing:

1. **Role-specific profiles.** Only `PatientProfile` exists. `DoctorProfile` (registration number, specialty, hospital, HPR ID) and `AdminProfile` are needed.
2. **The patient–doctor relationship.** There is no assignment model, which is why `profile.routes.ts` correctly refuses to expose a `GET /profile/:id` — there would be no relationship against which to authorise it. **This is the single most important schema addition**, because every doctor-facing endpoint depends on being able to answer "is this patient yours?"
3. **Frontend role awareness.** No role is read or branched on anywhere; `Sidebar.jsx:213` hardcodes the label "Patient".

**Recommended approach — one app, role-based routing** (not three separate apps):

```
/                     public marketing
/login                shared entry — redirect by role after authentication
/app/*                patient portal      role = Patient
/clinic/*             doctor portal       role = Doctor | HealthcareWorker
/admin/*              administration      role = Admin
```

With a shared `AuthContext` exposing `{ user, role, permissions }`; a `<RequireRole allow={['Doctor']}>` guard replacing today's string check; and a per-role layout wrapping shared primitives. Keep the API versioned and role-scoped (`/api/v1/patient/*`, `/api/v1/clinic/*`) so authorisation is legible at the route level rather than buried in handlers.

**Do not** build the doctor and admin portals now. Build the *seams*: `AuthContext` with a real role, the `RequireRole` guard, and the patient–doctor assignment table. Those three make the later portals additive rather than a restructure.

---

## L. Proposed Database Architecture

### Retain unchanged
`Role`, `Permission`, `RolePermission`, `User`, `AuditLog`, `PasswordResetToken`, `ProfilePhoto`. These are well-designed. The audit log in particular is already at the standard ABDM will require.

### Modify
- **`PatientProfile`** — the medical summary fields (`knownAllergies`, `currentMedications`, `existingDiseases`, `familyHistory`, `previousSurgeries`) are encrypted free-text. Adequate today; they must be normalised into real tables before any clinical feature depends on them, because free text cannot drive interaction checks or reminders. The schema comment already anticipates this.
- **`User`** — either implement email verification or drop the four dead fields.

### Add — Tier 1 (needed for the Phase 3 patient portal)

| Model | Purpose | Key fields |
|---|---|---|
| `DoctorProfile` | Doctor identity | `userId`, `registrationNumber`, `hprId`, `specialty`, `qualifications`, `hospitalId` |
| `CareTeamMember` | **Patient ↔ doctor assignment** | `patientId`, `doctorId`, `role`, `isPrimary`, `activeFrom/To` |
| `Appointment` | Real booking | `patientId`, `doctorId`, `scheduledAt`, `durationMins`, `mode` (InPerson/Video), `status`, `reason`, `cancelledAt` |
| `Medication` | Prescriptions + adherence | `patientId`, `prescribedBy`, `drugName`, `dosage`, `frequency`, `startDate`, `endDate`, `isActive` |
| `Document` | Reports and scans | `patientId`, `uploadedBy`, `type`, `filename`, `storageKey`, `mimeType`, `sizeBytes`, `reviewedBy`, `reviewedAt` |
| `Notification` | Replaces hardcoded bell menu | `userId`, `type`, `title`, `body`, `readAt`, `actionUrl` |
| `ClinicalEvent` | Powers the timeline | `patientId`, `type`, `occurredAt`, `title`, `description`, `recordedBy` |

### Add — Tier 2 (needed before launch)

| Model | Purpose |
|---|---|
| `Consent` | ABDM consent artefacts — who accessed what, when, and under which purpose. Non-negotiable for compliance |
| `EmergencyContact` | Currently a mock array; needs to be real and reachable offline |
| `StrokeAssessment` | NIHSS / mRS scores over time — the core recovery metric |

### Explicitly do not add yet
Messaging, billing, insurance claims, lab-order workflow, bed management, ambulance dispatch. These belong to the doctor/admin/dispatch phases; modelling them now would be speculative.

### Migration risks
- No destructive migration is required — every Tier 1 addition is additive.
- Normalising the free-text medical summary fields **will** need a careful data migration; do it before those fields carry real patient data, not after.
- **Renaming the JWT issuer/audience (`oncotrace-ai` → `stroke-ai`) invalidates every live token.** Sequence it: accept both values for one release, then drop the old one.
- The localStorage key rename (`oncotrace_*` → `strokeai_*`) logs everyone out unless a one-time migration shim reads the old keys and rewrites them.

---

## M. Proposed Backend Architecture

**Do not restructure the backend. Replicate its existing module pattern.** The auth and profile modules are already a good template:

```
src/<domain>/
  <domain>.routes.ts       wiring only
  <domain>.controller.ts   parse → validate → delegate → respond
  <domain>.service.ts      business logic; never imports prisma
  <domain>.repository.ts   the only layer touching prisma
  <domain>.validator.ts    Zod schemas
```

New modules in priority order: `appointment/`, `document/`, `medication/`, `careteam/`, `notification/`.

Additions needed regardless of domain:

1. **Refresh tokens** — a `RefreshToken` table mirroring `PasswordResetToken` (hash-only, single-use, rotating), with the access token dropped to ~15 min and refresh at 7–30 days. Highest-value backend change.
2. **Redis** for rate-limit state and a token denylist, making logout real.
3. **File storage** — S3-compatible object storage with presigned URLs. Never store binaries in Postgres (the schema already says this). Validate magic bytes, not just MIME type; cap size; scan uploads.
4. **Structured logging** — replace `console.error` with pino, and thread the existing `X-Request-Id` through application logs.
5. **Testing** — install vitest, add a `test` script, delete the duplicate hand-rolled runner, and cover login, RBAC, and encryption round-tripping. The `createApp()` factory was built for exactly this.
6. **CI** — typecheck + lint + test. All three scripts already exist and nothing runs them.

Explicitly avoid: microservices, GraphQL, event sourcing, a message queue. A well-organised modular monolith is the right architecture at this scale.

---

## N. Proposed Frontend Architecture

```
src/
  app/          router, providers, guards
  features/     appointments/ · health/ · medications/ · careteam/ · emergency/ · auth/
                  each: components/ · hooks/ · api.js · types
  components/   ui/ (primitives) · layout/
  lib/          apiClient · queryClient · formatters
  hooks/        cross-feature only
  styles/       one token system
```

Priority changes:

1. **Add an `ErrorBoundary`** at the router level and around each feature area. This is the cheapest high-value fix in the repo.
2. **Add `AuthContext`** — a single provider holding `{ user, role, isAuthenticated, login, logout }`, replacing the per-component `useAuth` and the scattered direct `localStorage` reads in `Sidebar.jsx:91` and `Topbar.jsx:108`. Prerequisite for the three-role architecture.
3. **Validate the JWT in `isAuthenticated()`** — decode and check `exp` rather than trusting a sentinel string.
4. **Adopt TanStack Query** for server state. Seven pages need loading/error/empty states built as they are wired up; hand-rolling that seven times is how inconsistency gets baked in.
5. **Split the 12 giant components** along the sub-component boundaries that already exist inside them — a mechanical, low-risk refactor.
6. **Delete the dead code** (§D-M6) and extract the duplicated `pageVariants` and `DotGrid`.
7. **Move routed pages out of `components/`** — `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `LandingPage`, `MeetingsPage` are pages living in the components tree; delete the 2-line re-export stubs.
8. **Migrate mock data to fixtures** under `src/mocks/` used only by tests and Storybook, so it stops shipping to production (§D-M4).

**Do not** introduce Redux, a component library, or a CSS-in-JS runtime. The hand-rolled primitives in `components/common/` are good and the app is not complex enough to need a store beyond Context + Query.

---

## O. Proposed Design System

**The problem is fragmentation, not quality.** Four token systems coexist (`index.css` `@theme`; `landing/theme.js`; `landing/hero/heroTheme.js`; an undocumented block copy-pasted across the four auth pages) and **seven font families** load through three different mechanisms (CSS `@import`, `<link>`, `@font-face`): Plus Jakarta Sans, Helvetica, Aether, Playfair Display, Lato, Archivo Variable, and Inter (in the dead stylesheets). `public/fonts/helvetica/` ships 7 files of which only 2 are declared.

### Proposed direction

**Two type families, total.** One serif for marketing display (Playfair Display, already in use and working), one humanist sans for everything else (Plus Jakarta Sans). Drop Helvetica, Aether, Inter, and — unless the hero specifically needs its width axis — Archivo. Remove the undeclared font files.

**One token file** as the single source of truth, with the landing's editorial palette expressed as a *theme within* it rather than a parallel system.

**Palette** — extend the existing, restrained base rather than replacing it:

| Role | Value | Use |
|---|---|---|
| Ink | `#0F172A` | Primary text |
| Ink muted | `#475569` | Secondary text — **replaces `#64748B` for body copy** |
| Ink subtle | `#64748B` | Metadata only — **never below 14 px** |
| Primary | `#2563EB` | Actions, links |
| Calm green | `#3C6B63` | Recovery, positive trend |
| Warm amber | `#B45309` | Attention, not alarm |
| Urgent red | `#DC2626` | **Emergency only — reserved** |
| Soft purple | `#6D5B96` | Therapy / rehabilitation |
| Surfaces | `#FFFFFF` / `#FAFBFC` / `#F1F5F9` | Elevation |
| Landing cream | `#F7F5EF` / `#FFFDF8` | Marketing ground |

**Retire `#94A3B8` as a text colour** (153 current uses) — see §P.

**Principles:** red reserved exclusively for emergency, so it never becomes wallpaper; one motion element per view; the existing `--ease-premium` curve referenced as a token rather than pasted as a literal; generous touch targets (≥44 px) given the motor-impairment reality of the stroke population; and typography one step larger than a typical consumer app.

**Avoid** — consistent with the landing page's existing and correct instincts: neon, heavy gradients, glassmorphism, deep shadow stacks, rainbow categorical colour, decorative animation, and robot/AI imagery.

---

## P. Accessibility Strategy

The stroke population makes this a **functional requirement, not compliance paperwork**: post-stroke patients frequently have hemianopia, motor impairment affecting one hand, aphasia, and fatigue.

Already good — and worth preserving: excellent image alt text (`PartnerMap.jsx:173` is genuinely exemplary), a full `prefers-reduced-motion` implementation at both CSS and JS layers, semantic `role="status"` on loaders, iOS zoom prevention, `min-width: 320px`, and only a single `<div onClick>` in the entire codebase.

Issues, in priority order:

| # | Issue | Detail |
|---|---|---|
| P1 | **Contrast failures** | `#94A3B8` on white is **2.8:1** (needs 4.5:1) and is used **153 times**; `#CBD5E1` is 1.7:1, used 26 times. Also `text-slate-400` (13) and `text-gray-400` (24). Demote all to `#475569`/`#64748B` for any text conveying meaning |
| P2 | **Accessibility prefs do nothing** | Six toggles persist to the database and no component reads them (§D-M1). Either implement them or remove them — a setting that silently fails is worse than none |
| P3 | **No skip-to-content link** | Keyboard users traverse the full sidebar on every page |
| P4 | **Modal focus management unverified** | `Modal.jsx` needs a focus trap, focus restoration on close, and `aria-modal` |
| P5 | **No live regions** | Async results (save confirmations, validation errors, the AI typing indicator) are not announced |
| P6 | **Aphasia support absent** | Icons alongside text labels for primary navigation; the plain-language glosses from §F |
| P7 | **One-handed operation** | Primary actions should sit within thumb reach on mobile |

**Target:** WCAG 2.2 AA, verified with axe in CI, plus a manual keyboard-only pass of the emergency flow every release.

---

## Q. Security Findings

**The backend security work is genuinely strong** and deserves acknowledgement: Argon2id with tuned parameters; AES-256-GCM field encryption with random per-value IVs and a *separate* blind-index key; SQL injection structurally impossible (Prisma query builder only, zero raw queries); a strict CORS allowlist with no wildcard; Helmet with a restrictive CSP; deliberate timing-attack resistance on login; hashed single-use password-reset tokens; no sensitive values in logs; and a Docker image running as non-root.

| Sev | Finding | Action |
|---|---|---|
| High | **"HIPAA-compliant" claimed 7× on an India-deployed product** | Remove all 7 strings (§D-C6) |
| High | **Real institution data + real people's photos in fixtures** | Replace with fictional Coimbatore data (§D-C7) |
| High | `stroke-ai-hero-spec.md` is **served publicly** from `client/public/`, disclosing that stats are placeholders and badges may not be held | Move to a private `docs/` |
| High | Live SMTP credential in `server/.env` (correctly gitignored, never committed — verified) | Rotate the Gmail app password |
| High | EmailJS keys recoverable from git history, commit `8e2628a` | Rotate; enable domain restrictions. Public keys, so limited to quota abuse |
| High | No refresh tokens; 15-minute sessions | §M item 1 |
| High | `client/node_modules` committed (15,264 files, 63 MB `.git`) | `git rm -r --cached client/node_modules` |
| Medium | JWT in `localStorage` — XSS-readable | Move to httpOnly cookies; `withCredentials` is already set |
| Medium | Logout does not revoke the token | Redis denylist |
| Medium | In-memory rate limiting | `rate-limit-redis` before multi-replica deploy |
| Medium | No email verification despite schema support | Implement or remove |
| Low | `X-Forwarded-For` trusted unconditionally in dev | Gate behind `trust proxy` |
| Low | `/health` leaks `NODE_ENV`, unthrottled | Trim payload |
| Low | Prisma query logging in dev | Acceptable; values are ciphertext |

**Before handling real patient data:** a CERT-In empanelled security audit is required for ABDM production access, and India's DPDP Act obligations (consent, breach notification, data-principal rights) must be met. The audit log is already at the right standard; the consent model is the gap.

---

## R. Production Readiness

| Area | Status | Blocker |
|---|---|---|
| Frontend build | ✅ Passes | 390 kB mock chunk ships |
| Backend typecheck | ✅ Clean, exit 0 | — |
| Frontend lint | ❌ **Broken** | Missing `globals` package |
| Tests | ❌ **None runnable** | No `test` script; vitest not installed |
| CI/CD | ❌ **None** | No workflow of any kind |
| Containerisation | ⚠️ Server only | No frontend Dockerfile, no compose |
| Migrations | ✅ Three, replayable | Correctly excluded from container start |
| Env config | ✅ Zod-validated, hard-exits | `.env.example` has a typo; encryption-key generation undocumented there |
| Error handling | ⚠️ Backend good, frontend absent | No error boundary |
| Logging | ⚠️ HTTP only | No structured logs, request ID not threaded |
| Monitoring | ❌ None | No Sentry, no APM, no uptime check |
| Legal | ❌ Placeholders | Terms and Privacy are stubs |
| Repo hygiene | ❌ Poor | `node_modules` and `dist/` committed; stale lint log |

**Not production-ready.** The gating items are: no tests, no CI, no monitoring, no error boundary, no legal pages, and the §D-CRITICAL fabrications.

---

## S. Recommended Implementation Roadmap

### Phase 2 — Truthfulness and identity *(recommended next; ~1–2 weeks)*

**The guiding principle: make the product honest before making it prettier.** A redesign applied first would make the fabrications more convincing, not less.

1. **Remove the unverifiable regulatory claims (§D-C6).** Delete all 7 "HIPAA-compliant" strings. Say nothing about compliance until it is true and verified, then say the accurate thing (DPDP / ABDM).
2. **Purge the third-party legal exposures (§D-C7).** Replace UCSF with a fictional Coimbatore facility, remove the real MyChart URL and `@ucsf.edu` address, replace `Blue Shield of California`, and replace all Unsplash portraits with illustrated avatars or initials — the `Avatar` component already renders initials.
3. **Neutralise the three undisclosed fabrications (§D-C1/C2/C3).** Either disable Care Guide, upload and booking behind a flag, or label them preview *exactly as the Emergency flow and demo consoles already correctly do*. The pattern to copy already exists in the codebase.
4. **Fix the emergency checklist (§D-C8)** so symptoms are required and transmitted, and **add 108/112 as a `tel:` link** — there is currently no dialable number anywhere in the codebase, and the timeline copy still says "called 911".
5. **Fix the NIHSS/ctDNA rendering bug and purge the oncology fixtures (§D-C9).**
6. **Add an error boundary** at the router level (§D-C4).
7. **Complete the OncoTrace → Stroke AI rename** — package names, JWT issuer/audience (dual-accept for one release), localStorage keys (with a migration shim), Docker user, README, schema header, and the oncology-named data files and components. Resolve the terminology collisions in §J across all four surfaces at once.
8. **Repo hygiene** — untrack `client/node_modules` and `dist/`, fix the lint config, delete the dead code and the stale lint log. Move `stroke-ai-hero-spec.md` out of `client/public/` — it is currently **served publicly** and states that the stats are placeholders, the brand is a working name, and the regulatory badges may not be held.
9. **Rotate the exposed credentials** (§Q).
10. **Relocalise the fixtures to India** — Coimbatore rather than San Francisco, `+91` numbers, ABHA/PM-JAY rather than Blue Shield, IST-first timezones, and Tamil/Malayalam in the language list. Keep all sample patients fictional. Also reconcile the four contradictory NIHSS trajectories (8→3, 8→2, 14→2, 2 from 14) across `Dashboard.jsx`, `mockAI.js`, `mockReports.js` and `mockTimeline.js`.

*Exit criterion: nothing in the portal claims to do something it does not do.*

### Phase 3 — Real data for one vertical slice *(~3–4 weeks)*

Refresh tokens; `AuthContext` with a real role; `RequireRole`; TanStack Query. Then build **Appointments end-to-end** — schema, module, real API, real UI with genuine loading/error/empty states — as the reference implementation. Follow with Documents (real upload to object storage) and Medications.

### Phase 4 — Patient experience *(~3–4 weeks)*

The §I information architecture; the §J renaming; plain-language glosses for every clinical score; the §P accessibility fixes (contrast first); the §O design-system consolidation; and real notifications.

### Phase 5 — Compliance and launch readiness

ABDM/ABHA linkage and the consent model; FHIR R4; tests and CI; monitoring; legal pages; CERT-In audit.

### Phase 6+ — Doctor portal, then admin portal

Only after the seams from Phase 3 exist. The `CareTeamMember` assignment model is the prerequisite for every doctor-facing endpoint.

**Deliberately deferred:** real video calling (buy, don't build — and only when a doctor exists to join the call), the mobile app, and any AI inference feature.

---

## Phase 1 Closing Summary

**What I discovered.** STROKE-AI is an oncology platform reskinned at the content layer, with a rename that never reached the code. It splits into a production-grade auth/profile backend, a genuinely good landing page, and a patient portal that is ~95% mock and in three places actively misleading. There is no AI in the product today.

**What is good.** The backend's security engineering, layering and India-readiness (ABHA, Aadhaar policy, Indian validation). The landing page's editorial discipline and its documented refusal to invent medical statistics. The centralised API client. The mobile drawer and reduced-motion support. The honesty of the Emergency flow and demo badging. Unusually high comment quality throughout — the code explains its own reasoning, including where it is incomplete.

**What is broken.** A fake AI assistant giving randomised clinical reassurance with no disclaimer; report uploads that discard files; bookings no doctor receives; a BEFAST checklist that neither gates nor accompanies the emergency alert; a stroke severity score rendering a leftover tumour-DNA value; "HIPAA-compliant" claimed 7× on an India-deployed product; a real hospital's addresses, portal URL and email domain plus real people's photographs attached to fictional clinicians; no error boundary; 15-minute sessions; committed `node_modules`; broken lint; no runnable tests; 153 contrast failures; and accessibility preferences that silently do nothing.

**What needs to change.** Finish the rebrand; make the portal honest; build real data for one vertical slice before broadening; relocalise to India; consolidate four token systems and seven fonts; add the role seams now so the doctor and admin portals are additive later.

**Recommended architecture.** Keep the stack. Keep the modular monolith and replicate the existing backend module pattern per domain. One React app with role-based routing rather than three apps. Additive schema changes only, with `CareTeamMember` as the keystone. Design consent and audit in from the start, because ABDM will require them.

**Phase 2 should be truthfulness and identity** — neutralise the fabrications, complete the rename, clean the repository, relocalise the content. Not a redesign.

---

*Phase 1 complete. No source files were modified. Every finding above is anchored to a file and line read directly during this audit.*
