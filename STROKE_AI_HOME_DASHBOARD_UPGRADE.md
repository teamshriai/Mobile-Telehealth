# STROKE-AI — Home Dashboard Experience Upgrade

**11 September 2026** · Scope: Patient Home (`/app`) only

---

## 1. Problems identified

The Home page was audited in a real browser against the demo patient before any code
was written. It made **one** API call (`GET /profile`) and rendered a greeting, a
full-width emergency block, and four static navigation cards.

| # | Problem | Evidence |
|---|---|---|
| 1 | **Almost no patient data reached the page** | Appointments, care team, notifications and medications all existed in the database and were served by working endpoints. None were requested. |
| 2 | **Two-thirds of the desktop viewport was empty** | Content ended at ~720px of a 1400px viewport at 1280 wide. |
| 3 | **Four "cards" were navigation, not content** | They carried a label and a sentence of static copy — a menu styled to look like a dashboard. |
| 4 | **Emergency outweighed everything, permanently** | The heaviest object on a page seen daily. A standing red alarm above a patient's ordinary information trains people to stop seeing it, and raises anxiety for someone living with stroke risk. |
| 5 | **No sense of "today"** | Nothing answered *what is happening now* — the one question a patient opens a health app to ask. |

**What was already right and was preserved:** honest content (Phase 1 removed a
hardcoded NIHSS score every patient saw), a real dialable `tel:108` link, semantic
`<section>` landmarks, and zero horizontal overflow.

---

## 2. Design direction

Calm, warm, information-first. Colour used to encode meaning, not to decorate:

- **Blue** — care logistics (appointments, clinicians, navigation)
- **Teal/green** — medication and care-team facts
- **Amber** — something to be aware of (a recorded allergy)
- **Red** — emergency only, and nothing else

No gradients, no glassmorphism, no AI visual language, no decorative charts.

---

## 3. Information hierarchy

The page now answers five questions in order of what a patient actually needs:

1. **Who am I / what is this?** — greeting with real first name
2. **What do my records say?** — Health Snapshot (four counted facts)
3. **What is coming up?** — next appointment, given real prominence
4. **What changed recently / who is looking after me?** — activity + care team
5. **Where do I go?** — compact navigation, then emergency

Emergency moved from the top to a proportionate block near the bottom. It is
**still unmissable** — distinct colour, siren icon, dialable button — and is
additionally always one tap away in the sidebar.

---

## 4. Visual and graphical representation

Per §10, every graphic answers "what does this help the patient understand?"

| Element | What it shows | Why it is honest |
|---|---|---|
| **Snapshot tiles** | Counts of medicines, upcoming appointments, clinicians, allergies | Each is **counted from a real record** and links to the page that proves it. |
| **Calendar date block** | Month + day of the next appointment | A date read as a date, not as prose. |
| **Activity timeline** | Connected markers down the notification list | Real rows the backend wrote because something happened. |
| **Care team avatars** | Who is on the team, primary flagged | Reuses the shared `Avatar`, so initials/colours match the rest of the app. |

**No chart library was added.** The only "chart" is a CSS rule connecting timeline
markers. Bundle grew **0.11 kB gzipped**.

---

## 5. Data sources — all pre-existing

| Source | Endpoint | Used for |
|---|---|---|
| Profile | `GET /profile` | Name, medications, allergies |
| Appointments | `GET /appointments` | Next appointment, upcoming count |
| Care team | `GET /care-team` | Preview, clinician count |
| Notifications | `GET /notifications?limit=4` | Activity timeline |

**No new endpoint. No new field. No schema change. No migration.**

The four requests use `Promise.allSettled`, not `Promise.all` — a care-team outage
must degrade one panel to its empty state, not blank the dashboard.

Medication and allergy counts parse the existing free-text fields (`countMedications`,
`countAllergies`), treating "none"-like text as zero. This is a display-layer count of
data the patient already entered, not derived clinical meaning.

---

## 6. Components

**Created** (`src/components/home/`): `HealthSnapshot`, `UpcomingAppointment`,
`RecentActivity`, `CareTeamPreview` — four, not a dozen micro-components.

**Rewritten:** `pages/patient/PatientHome.jsx`.

**Reused from the existing design system:** `Avatar`, `Banner`, `Skeleton`,
`SkeletonText`, `focus-ring`, `min-h-11`, the `@theme` palette. No second design
system was introduced.

---

## 7. What was deliberately NOT built

§36 asked for a 20% cut. Five candidates were removed **because each would have
required inventing data**:

| Cut | Why |
|---|---|
| Profile-completeness ring | The demo profile is effectively complete — a permanent 100% ring is decoration. |
| Medication adherence chart | **No adherence data exists.** A percentage would be fabricated. |
| "Ask Stroke AI" panel | No backend. A prominent entry point to nothing is the exact defect Phases 1–5 removed. |
| Sparklines / trend lines | No time-series data exists anywhere in the schema. |
| Health-records donut | There is no records model yet. |

Also unchanged, per §3: Appointments, Medicines, My Health, My Care Team, Emergency,
Profile, Settings. All four were regression-tested.

---

## 8. Responsive

Measured in a real browser at **320 / 390 / 768 / 1280**.

| Width | Overflow | Layout |
|---|---|---|
| 320 | **0px** | Single-column; snapshot 2×2; all labels readable |
| 390 | **0px** | As above |
| 768 | **0px** | Two-column pairs begin |
| 1280 | **0px** | Snapshot 4-across; activity + care team side by side |

**One real defect found and fixed during testing:** at 390px the quick-links grid
truncated "Appointments" to "Appoint…" and "My Care Team" to "My Care …". A
navigation label the patient cannot read defeats its purpose — the grid now goes
single-column below 420px.

**A second fix:** the empty-state appointment block initially rendered ~500px tall
(the shared `EmptyState` is built for a full page column). It gave "nothing to see"
more room than a real appointment — replaced with a compact inline row.

---

## 9. Accessibility

Verified by DOM inspection, not assumption:

- Heading order `h1 → h2 × 6`, no skipped levels ✅
- **Zero controls under 44px** (excluding `sr-only` inputs and inline prose links,
  which WCAG 2.5.8 exempts) ✅
- Every link has a discernible name (0 unnamed) ✅
- Status never depends on colour alone — "New" and "Primary" are **text badges**, and
  every snapshot tile carries a text hint beneath the number
- The decorative calendar block is `aria-hidden`; the full date is spelled out in text
  beneath it for screen readers
- `prefers-reduced-motion` still honoured — no new animation was introduced

---

## 10. Performance

- **No charting library.** Bundle: 99.67 → 99.78 kB gzipped (**+0.11 kB**)
- Four parallel requests on mount, settled together; no waterfall, no duplicates
- Skeleton placeholders shaped like the final layout, so resolving causes no layout shift

---

## 11. Testing performed

| Area | Result |
|---|---|
| Populated state (demo patient), 320/390/768/1280 | ✅ 0px overflow at every width |
| **Empty state** (all three list endpoints stubbed empty) | ✅ all three empty states render; no `null`/`NaN`/`undefined` on screen |
| Loading state | ✅ skeletons match final layout |
| Console errors / warnings | ✅ **zero** |
| Accessibility probe | ✅ headings, touch targets, link names all clean |
| Regression — Appointments, My Health, Care Team, Settings | ✅ 0px overflow, all render correctly |
| Auth & RBAC regression | ✅ **10/10**, including the three newly-called endpoints rejecting anonymous access (401) and refresh-after-logout correctly rejected |
| `tsc --noEmit` · `vite build` · `eslint` | ✅ clean · clean · **0 errors** |
| Database | ✅ unchanged — 8 patients, 4 doctors, 3 appointments, 4 notifications. Only append-only `AuditLog` grew. |

Two test-harness artifacts were identified and excluded rather than reported as
defects: screenshot sweeps that tripped the dev rate limiter and silently measured the
login page. The probes were hardened to detect that case and the sweeps re-run.

---

## 12. Before / after

| | Before | After |
|---|---|---|
| API calls | 1 | 4 (parallel, independently degrading) |
| Real patient facts shown | 1 (first name) | 12+ across four panels |
| Desktop fill at 1280 | ~720px of 1400px | 1311px, balanced |
| Emergency | Heaviest object, top | Distinct and reachable, proportionate |
| Empty-state handling | none | Three explicit, calm states |
| Fabricated clinical content | none | **still none** |

**Honest assessment.** The page is substantially more useful and more finished: it now
shows Meenakshi her next consultation, what changed this week, who is treating her, and
what her records contain — all of which existed before and none of which reached her.

It is *not* a visually spectacular dashboard, and deliberately so. The available data
supports counts, a date, a timeline and a short list. It does not support trend lines,
risk scores or adherence rings, and inventing them would have reproduced exactly the
defect this programme has spent five phases removing.

The honest remaining limits: **Medicines has no model**, so its count parses a free-text
field; there is **no records model**, so no records summary exists; and there is still
**no automated test suite** — every check above was run by hand.
