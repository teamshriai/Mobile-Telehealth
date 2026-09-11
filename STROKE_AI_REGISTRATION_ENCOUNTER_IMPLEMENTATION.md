# STROKE-AI — Registration, Encounter & Stroke-Assessment Implementation

**Phase 6** · 11 September 2026
Scope: P0 + P1 of the platform-wide registration/encounter architecture (offline sync and
ABHA API integration deferred to a later phase — see §15).

---

## 1. Requirements implemented

| # | Requirement | Status |
|---|---|---|
| P0 | Patient can exist with no login account | ✅ Done |
| P0 | SHRI-AI Patient ID — stable, non-enumerable, server-generated | ✅ Done |
| P0 | Encounter model — generic, not stroke-specific | ✅ Done |
| P1 | Staff/field registration workflow | ✅ Done |
| P1 | Patient search (ABHA / mobile / SHRI-AI ID / name+DOB) | ✅ Done |
| P1 | Duplicate detection — explainable, conservative, never auto-merge | ✅ Done |
| P1 | Stroke domain module — symptoms, Last Known Well, urgency flag | ✅ Done |
| P1 | New permissions, audit actions, IDOR protection | ✅ Done |
| P2 | Offline-capable field registration | ⏸️ Deferred (seams only — §15) |
| P2 | ABHA/ABDM API integration | ⏸️ Deferred (seams only — §15) |

Two additional defects, found during this phase's own audit and fixed as part of it:

- `careRelationshipService` resolved `HealthcareWorker` via `DoctorProfile` (the wrong
  table — HW users get a `StaffProfile`), which would have denied every HealthcareWorker
  404 the moment this phase's registration workflow tried to use it. Fixed before any new
  code depended on it.
- `AuthContext` never exposed `profile` or `loading`, even though `AccessibilityContext`
  and the Login/Register forms had depended on them since Phase 5. Accessibility
  preferences never survived a page reload; login/register submit buttons never disabled.
  Both fixed and verified in a real browser (§12).

---

## 2. Architecture decisions

### 2.1 Patient can exist without a login (the core P0 blocker)

`PatientProfile.userId` was required and unique; `User` required a unique email and
password. The only creation path was self-registration. **A patient could not exist
without a login — the ambulance/field scenario this phase exists to serve was
unrepresentable.**

**Decision: made `userId` nullable, rather than introducing a separate `Patient` entity.**
A separate entity would have required repointing three foreign keys
(`appointments.patient_id`, `care_team_members.patient_id`, `profile_photos.patient_profile_id`)
and rewriting every existing service that resolves "the caller's own patient" — a data
migration on live rows, in a codebase with no test runner, for a benefit (cleaner
separation) that nullability achieves at a fraction of the risk. `dateOfBirth` was made
nullable for the same reason (an unconscious patient may have no known DOB), paired with
a `dobIsEstimated` flag so a guessed date is never silently treated as confirmed —
relevant to age-based dosing decisions downstream.

An unidentified patient gets a deterministic placeholder name (`Unknown` /
`Patient-<shortcode>`) rather than a relaxed `NOT NULL` on the name columns — this keeps
the existing `[lastName, firstName]` search index and every name-rendering code path
working unchanged.

### 2.2 SHRI-AI Patient ID

Format `SHRI-XXXXXX-C` — Crockford Base32 (excludes I, L, O, U — the characters most
often confused when handwritten on a field form or dictated over a phone) plus one check
character. Generated from CSPRNG output (`crypto.randomBytes`), never sequential or
derivable from creation order.

**A real bug was found and fixed while writing this phase's own test suite** (not by
manual inspection): the first checksum design used sequential position weights (1, 2, 3…),
which mathematically fails to catch some single-character substitutions whenever the
weight shares a factor with the 32-character alphabet (half of all positions). Measured
directly: the original design caught only ~95.4% of single-character corruptions in a
1,000-sample test. Redesigned using distinct prime weights (the same family of technique
ISBN/IBAN check digits use) — re-measured at **100%** single-character-substitution
detection and ~94% adjacent-transposition detection across a 100,000-sample stress test.
The transposition figure is documented honestly as a measured result, not oversold as
100% — no weighted-sum checksum can mathematically guarantee catching every transposition.

Collision handling: generate → attempt the unique-constrained insert → retry (max 5) on a
`P2002` targeting `shri_patient_id` specifically. Deliberately not a pre-check `SELECT`,
which would be a TOCTOU race under concurrent registrations.

### 2.3 Encounter model

Generic by design: `EncounterType` (ClinicVisit, AmbulanceIntake, Emergency, Telehealth,
FollowUp, Screening, FieldRegistration) carries no stroke-specific vocabulary.
`onDelete: Restrict` on the patient relation (unlike `Appointment`/`CareTeamMember`, which
cascade) — an encounter is a clinical record and must never be silently destroyed as a
side effect of another operation.

### 2.4 Stroke as a domain module, not a platform concern

`StrokeAssessment` hangs off `Encounter` via `encounterId @unique` and touches nothing on
`Patient` or `Encounter` itself. A future `OncologyAssessment`/`CardiologyAssessment` is a
pure additive `CREATE TABLE` with the same shape — no migration to this phase's models.

A polymorphic single `Assessment` table with a domain discriminator and a JSON payload
was considered and rejected: it would make future domains "free" at the cost of type
safety on values where a wrong entry is a patient-harm event (a JSON key cannot be
indexed or validated the way a typed column can).

**Last Known Well (LKW)** gets its own append-only revision table
(`StrokeLkwRevision`), written in the **same database transaction** as the assessment
update — not relying on the fire-and-forget `AuditLog`, whose own service explicitly
swallows write failures (acceptable for "someone viewed a page"; not acceptable for the
value that gates thrombolysis eligibility). A `reason` is mandatory on every revision.
A generic `AuditLog` row is *also* written for the security trail — this is the one place
in the codebase two writes are deliberately coupled rather than left to the fire-and-forget
path.

The symptom checklist and the urgency flag are explicitly a **workflow signal**, never a
diagnosis. Enforced in code, not just in prose: `toAssessmentResponseShape`'s
`clinicalNote` field reads *"Potential stroke symptoms identified — this is a workflow
flag, not a diagnosis"* — verified by a live test asserting the string contains both
"potential" and "diagnosis" (§12).

### 2.5 Duplicate detection — conservative, explainable, no auto-merge

`patient.identity.service.ts` scores candidates on a fixed additive table (not a learned
model), so every match has a one-line, non-engineer-readable explanation in the audit log
(`abha_exact`, `mobile_exact`, `name_exact`, `dob_exact`, `dob_near`, `gender_match`).

Policy, enforced in `patient.service.register()`:

| Confidence | Score | Behaviour |
|---|---|---|
| `strong` | ≥100 | Always refused (409). No acknowledgement can override it. |
| `moderate` | 60–99 | Refused (409) unless the caller sets `acknowledgedDuplicates: true`. |
| `weak` | 35–59 | Proceeds; candidates returned for information only. |

Only an ABHA exact match (100) reaches `strong` alone — it is the one government-verified
identifier this platform has. **Discovered while writing the test suite, not designed up
front, and now documented accurately**: four independent exact matches together (mobile +
name + DOB + gender = 105) *also* legitimately reach `strong` — that is correct, not a
loophole, since that combination is itself about as certain as identity gets without a
government ID. A mobile-only match is `weak` (55), below the moderate floor — verified
live: two people sharing a phone number with completely different names register without
requiring acknowledgement.

**No merge endpoint exists.** `IdentityStatus.MergedAway` is in the schema so the concept
has a home, but nothing sets it. Merging two patient records is destructive and
irreversible; building that mechanism is deferred until there is a real duplicate and an
authorized human process to decide on it — not built speculatively.

### 2.6 Search — server-side, paginated, anti-enumeration by construction

Search modes: ABHA (existing blind index), mobile (**new** blind index — see §2.7), SHRI-AI
ID, name+DOB. Two independent anti-enumeration controls:

- **Minimum specificity**, enforced in the Zod schema: name search requires a surname
  *plus* either a given name or a DOB. `by: 'name', lastName: 'a'` is rejected with 400
  before it ever reaches the database — verified live.
- **A dedicated rate limiter** (`patientSearchLimiter`, 30/15min, distinct from the login
  limiter) — the threat model here is population-scanning, not credential guessing.

Results are a narrow, explicit-column projection (`SEARCH_RESULT_SELECT`) — never the
internal UUID, never a phone number, never a medical-summary field. Verified live: a
search response contains exactly `{shriPatientId, firstName, lastName, dateOfBirth,
gender, identityStatus, lastEncounterAt}` and nothing else.

### 2.7 The hard constraint that shaped the whole search design

`phoneNumber`, `village`, `district`, `state` are AES-256-GCM encrypted with a random IV
per value — not SQL-searchable at all. The existing `abhaId`/`abhaIdHash` blind-index
pattern (a deterministic HMAC-SHA256 of the plaintext, carrying the uniqueness/lookup
constraint instead of the ciphertext) was generalised to mobile numbers:
`phoneNumberHash`.

**Deliberately NOT `@unique`.** Verified directly against live data before writing a line
of code: of the 8 pre-existing patients, 4 had a phone number, but those 4 numbers were
only 3 *distinct* — one was already shared by two patients. A unique constraint here would
have made the backfill fail on data that already existed, and would make registering a
second family member sharing one handset impossible. Mobile is therefore a strong
corroborating signal, never an identity guarantee — reflected directly in the scoring
table (55 points, not enough alone to require acknowledgement).

No blind index was added for village/district — a low-cardinality field is a
re-identification risk (it partitions the patient base into visible buckets) for very
little query value.

### 2.8 Authorization — tightened during this phase's own testing

`careRelationshipService.requirePatientAccess()` already existed (written ahead of the
doctor portal, called from nowhere) and is now this phase's first real consumer. Row-level
rule, by role:

- **Patient** → own record only.
- **Doctor** → active `CareTeamMember` row, **or** a patient they personally registered /
  opened an encounter for within the last 24 hours (the same narrow, time-bounded grant a
  HealthcareWorker gets — see below). Not a blanket "any Doctor reads any patient": that
  was the initial design, caught by this phase's own regression suite (§12), and corrected.
- **HealthcareWorker** → the same 24-hour field-relationship grant. HW users get a
  `StaffProfile`, not a `DoctorProfile`, and there is no schema path to put one "on a care
  team" — this is the deliberate substitute, narrow and auditable rather than open-ended.
- **Admin** → denied. Unchanged from the pre-existing design: "if an admin ever needs
  clinical access it must be an explicit, separately audited break-glass flow, never a
  silent side effect of being an admin."

Always 404, never 403, on a failed check — a 403 would confirm the record exists, which is
itself a disclosure that enables enumeration by status code.

**The permission `patient:read:any` exists in the codebase but is granted to no role.**
It is infrastructure for a genuine future admin break-glass flow — the bypass logic that
reads it is already written and in one place (`patient.service.ts`, `encounter.service.ts`),
ready for that day, but nothing today exercises it. This was a real design correction made
during testing: the original plan granted it to Doctor by default, which a live regression
test caught as "any Doctor can read any patient system-wide" — exactly the unrestricted
clinical-record access `careRelationshipService`'s own long-standing design argues against
for Admin. The same reasoning was applied here.

New permissions, following the existing `resource:action:scope` convention:
`patient:create:any`, `patient:search:any`, `patient:read:any` (ungranted, see above),
`patient:manage:any`, `encounter:create:any`, `encounter:read:own`,
`encounter:read:assigned`, `encounter:manage:assigned`, `assessment:read:assigned`,
`assessment:write:assigned`. HealthcareWorker gets create/search/encounter-create but
*not* `assessment:write:assigned` — a field worker registers and opens an encounter; a
clinician authors the assessment. Verified live: an HW token gets 403 attempting to write
an assessment; a Doctor with a genuine relationship to that patient gets 200.

### 2.9 Audit — 10 new event types, PHI discipline preserved

`PatientRegistered`, `PatientSearched`, `PatientRecordViewed`, `PatientDuplicateDetected`,
`PatientDuplicateAcknowledged`, `PatientAccountLinked`, `EncounterCreated`,
`EncounterClosed`, `AssessmentCreated`, `AssessmentUpdated`. `PatientSearched` records the
search *mode* and result *count* — never the search term itself (a surname is PHI),
matching the existing rule in `appointment.service.ts` ("never the reason text").

---

## 3. Database changes

**Four migrations, additive only. No `prisma migrate reset` was run at any point.**

| Migration | Content | Risk |
|---|---|---|
| A — `patient_identity_additive` | Drop `NOT NULL` on `user_id`/`date_of_birth`; add `shri_patient_id` (**nullable at this point**), `phone_number_hash`, `dob_is_estimated`, `registration_source`, `registered_by_user_id`, `identity_status`; two new enums; three new indexes | None — every new/relaxed column is additive or nullable |
| *(backfill script, not a migration)* | Populate `shri_patient_id` + `phone_number_hash` on all 8 existing rows | See §3.1 — the reason this had to be a script |
| B — `patient_identity_constraints` | `SET NOT NULL` + `UNIQUE` on `shri_patient_id` | Gated on the backfill's own verification — fails loudly if incomplete |
| C — `encounter_and_audit_actions` | New `Encounter` table + 2 enums; 10 `ALTER TYPE audit_action ADD VALUE` | None — new table, additive enum values |
| D — `stroke_domain` | `StrokeAssessment` + `StrokeLkwRevision` tables + 2 enums | None — entirely new tables |

### 3.1 Why the backfill could not be a migration

Two independent, hard reasons, both verified rather than assumed:

1. `shri_patient_id` needs the Crockford-Base32 generator, which lives in TypeScript.
   Reimplementing its checksum in PL/pgSQL would mean two independent implementations of a
   checksum that must agree forever — a guaranteed future divergence bug.
2. `phone_number_hash` is **mathematically impossible** to compute in SQL: the plaintext
   phone number is AES-256-GCM encrypted with a random IV, and the HMAC key that derives
   the hash lives in the application's `BLIND_INDEX_KEY` environment variable — Postgres
   never has access to it.

`prisma/scripts/backfill-patient-identity.ts`: idempotent (guarded on `shri_patient_id IS
NULL`), fails loudly and exits non-zero on any decryption error (a decryption failure means
an encryption-key mismatch, and silently writing a wrong hash risks a false identity match
later), and prints a before/after row count so the operator can verify completeness before
Migration B runs. Migration B's `SET NOT NULL` is itself the verification: if the backfill
was incomplete, the migration fails, and that failure is the safe outcome.

**Result, verified**: 8/8 rows backfilled, all 8 generated IDs pass their own checksum, 4/8
rows got a phone hash (matching the 4 rows that had a phone number), 0 decryption failures.

### 3.2 Data safety

- A `pg_dump` (custom format) was taken and verified restorable **before** touching the
  schema.
- Row counts recorded before and after every migration and every test pass. Final
  comparison: **8 patients, 4 doctors [+1 test fixture], 3 appointments, 4 notifications, 2
  care-team rows — identical to the pre-Phase-6 baseline.** Only `AuditLog` grew
  (append-only by design).
- All 8 pre-existing patients individually re-verified post-migration: `userId` still set
  (login intact), `dateOfBirth` still set, a valid `shriPatientId` assigned.
- 13 patients + 2 encounters + 2 assessments + 2 LKW revisions created during manual/live
  testing were identified by their `registrationSource` (`StaffRegistered`/
  `FieldRegistered` — the 8 real patients are all `SelfRegistered`) and removed after
  testing, with the real-patient count re-verified as exactly 8 both before and after the
  cleanup.

---

## 4. API changes

New routers: `patientRouter` (`/api/v1/patients`), `encounterRouter`
(`/api/v1/encounters`), plus encounter-creation/listing nested under
`/api/v1/patients/:shriPatientId/encounters` (a natural sub-resource, following the
existing flat-router convention rather than introducing Express sub-router nesting for
the first time).

| Method | Path | Permission |
|---|---|---|
| POST | `/patients` | `patient:create:any` |
| GET | `/patients/search` | `patient:search:any` (+ dedicated rate limiter) |
| GET | `/patients/:shriPatientId` | `patient:read:assigned` **or** `patient:read:any` |
| POST | `/patients/:shriPatientId/link-account` | `patient:manage:any` |
| POST | `/patients/:shriPatientId/encounters` | `encounter:create:any` |
| GET | `/patients/:shriPatientId/encounters` | `encounter:read:assigned` **or** `encounter:read:own` |
| GET | `/encounters/:id` | same as above |
| PATCH | `/encounters/:id/close` | `encounter:manage:assigned` |
| GET/PUT | `/encounters/:id/assessment` | `assessment:read:assigned` / `assessment:write:assigned` |
| GET | `/encounters/:id/assessment/lkw-history` | `assessment:read:assigned` |

A new `requireAnyPermission()` middleware (OR semantics) was added alongside the existing
`requirePermission()` (AND semantics) — needed because `GET /patients/:shriPatientId` is
legitimately reachable via two distinct capabilities, and modelling that as one route
requiring both permissions would be wrong.

All request/response bodies follow the existing `{ success, message, data, timestamp }`
envelope; errors carry `requestId`, matching Phase 5.

---

## 5. Frontend changes

Scoped narrowly, per the plan: this phase is backend-first. Two pre-existing bugs (not new
regressions) were fixed because they blocked verifying this phase's own accessibility and
security posture:

- **`AuthContext` now exposes `profile`.** `AccessibilityContext` has consumed
  `useAuth().profile` since Phase 5 to read saved `largeText`/`highContrast`/
  `reduceMotion` preferences; the value was always `undefined`, so saved preferences never
  survived a reload. Verified live: toggle Large Text → reload → **the setting is still
  applied** (previously it silently reset).
- **`AuthContext` now exposes `loading`.** `Login.jsx` and `Register.jsx` have always
  destructured `loading` to disable their submit button during the request; it did not
  exist, so double-submit was possible on a slow connection. Verified live: the submit
  button is `disabled` within 80ms of a click.

No other frontend surface (registration UI, search UI, encounter/assessment UI) was built
this phase — the plan's explicit scope was the API and its security properties, not a new
staff-facing UI, and `/clinic` remains the pre-existing placeholder.

---

## 6. Security changes

- **IDOR**: no new endpoint accepts an internal patient/encounter UUID from the client —
  every route takes the public `shriPatientId` or a `PATCH .../assessment` on an
  already-resolved encounter; ownership is re-checked in the service layer via
  `careRelationshipService`, never trusted from the URL.
- **404-not-403** preserved on every new denial path.
- **Rate limiting**: a dedicated `patientSearchLimiter`, separate from the auth limiter,
  reflecting a different threat model (enumeration, not credential guessing).
- **Encryption**: `locationName`, `chiefComplaint` (Encounter), `lkwNote`,
  `otherSymptomNote` (StrokeAssessment), and the LKW revision `reason` are all AES-256-GCM
  encrypted at rest — verified directly by reading the raw database columns and confirming
  the `iv.authTag.ciphertext` format.
- **Clinical-safety wording enforced in code**: the assessment response's `clinicalNote`
  field is asserted by a live test to contain "potential" and never claim a diagnosis.

### Findings from a pre-commit release gate, and their fixes

Before anything was committed, a separate, systematic review of the complete diff — every
migration, every new permission, every new endpoint, read file-by-file rather than
sampled — was performed specifically looking for what the implementation-and-manual-
testing pass above might have missed. (The over-broad `PatientReadAny` grant described in
§2.8 was a *different*, earlier finding, caught by this phase's own regression suite
during implementation itself, before this gate pass began — it is not repeated here.)
This gate found and fixed two further real defects, plus one piece of dead code:

1. **Cross-patient appointment linkage (found by deliberately trying to exploit it, not
   by inspection alone).** `POST /patients/:id/encounters` accepted an `appointmentId`
   from the client and passed it straight to the database. The foreign-key constraint
   only guarantees the referenced appointment *exists* — it says nothing about whose
   appointment it is. **Live-tested and confirmed exploitable**: a HealthcareWorker could
   register an unrelated new patient, then successfully (`201`) link a real, unconnected
   patient's actual appointment to that new patient's encounter, permanently consuming
   the appointment's one-to-one `Encounter` slot (`appointmentId` is `@unique`) in the
   process. Fixed by validating the appointment belongs to the same patient
   (`appointmentRepository.findByIdForPatient`, the same ownership check
   `appointment.service.ts`'s own endpoints already rely on) before creating the
   encounter. Re-tested live: the same exploit attempt now returns `400`, and the
   legitimate no-appointment and same-patient paths are unaffected.
2. **`Encounter.visitId` had no collision-retry**, unlike `PatientProfile.shriPatientId`
   generated from the identical Crockford-Base32 keyspace via
   `withGeneratedShriPatientId`. A `visitId` collision (astronomically unlikely, but the
   patient-ID path is explicitly retried for exactly this reason) would have surfaced as
   an unhandled `P2002` rather than transparently regenerating. The retry helper was
   generalized (`withGeneratedId`, parameterized by target column and candidate
   generator) so both ID types share one implementation rather than one being safe and
   the other not for no principled reason. `withGeneratedShriPatientId`'s existing
   signature and both its call sites (self-registration, staff registration) are
   untouched.
3. **Dead code removed**: an unused `acknowledgeDuplicateSchema`/`AcknowledgeDuplicateDto`
   export in `patient.validator.ts` — a leftover from an earlier design where duplicate
   acknowledgement might have been its own endpoint, before it became the
   `acknowledgedDuplicates` boolean already inside `registerPatientSchema`. Confirmed via
   a repository-wide grep that nothing imported it before removing it. (A second,
   documented utility, `shriPatientIdExists`, was found similarly unused but was kept
   deliberately — it is a small, self-contained function explicitly intended for manual
   operational lookups, not a leftover from an abandoned feature.)

All three were fixed, then re-verified against the live system before being folded into
this document. The full regression suite (§11) was re-run after each fix, and the
database was confirmed back at the exact pre-gate baseline (8 patients, 3 appointments, 4
notifications, 2 care-team rows) after every test round's data was cleaned up.

---

## 7. Offline/sync implementation status

**Not built this phase — deferred to P2, deliberately, per the approved plan.** Seams left
so it can land without rework: `RegistrationSource.FieldRegistered` already exists as a
value; `Encounter.createdByUserId` is nullable (a future device-originated encounter may
have no synchronously-authenticated user at capture time); `shriPatientId`/`visitId` are
server-generated and client-independent by construction, so no client-side ID scheme needs
to be retrofitted later. A future batch-sync endpoint will need its own raised
`express.json` body-size limit — the current global `10kb` limit is noted as a constraint
for that future work, not silently raised now.

## 8. Stroke-specific domain implementation status

Fully implemented per §2.3–2.4: `StrokeAssessment` with the FAST symptom checklist,
`urgentFlag` derived from encounter type + symptoms (never a diagnosis), Last Known Well
with structured certainty/source and a transactional, reason-mandatory revision log.
NIHSS/mRS scoring was explicitly **not** added — it remains outside this phase's and the
product's stated scope (per the seed data's own long-standing comment: "the core recovery
metric... intentionally absent... a clinical assessment the product does not perform").

## 9. ABHA integration status

**Not integrated. No ABDM API call exists anywhere in this codebase, before or after this
phase.** The seam: `patientIdentityService.findCandidates({ abhaId })` is the single call
site a future verified-ABHA lookup would use, and `IdentityStatus.Verified` is the state a
future verifier would set. Nothing was fabricated to make this look more complete than it
is — a QR scan is not pretended to have verified anyone.

## 10. Existing patient portal impact

**None, verified directly.** The full existing auth lifecycle (login, refresh rotation,
logout, refresh-after-logout correctly rejected), and every existing patient-facing read
(`/profile`, `/appointments`, `/care-team`, `/notifications`) were re-tested after every
migration and pass identically to the pre-Phase-6 baseline. The demo patient's computed
`age` (56) is unchanged. All 8 pre-existing patients retain their login.

## 11. Testing performed

**Automated (`node:test`, built into Node 20 — zero new dependency):**

- `src/utils/__tests__/shriId.test.ts` — 9 tests: format, exclusion of ambiguous
  characters (payload only, not the fixed prefix), every generated ID passes its own
  checksum, collision rate matches the expected birthday-paradox math, malformed input
  rejected, tampered checksum rejected, **100% single-substitution detection** (measured,
  2000 samples), **majority transposition detection** (measured, ~94% on 3000 samples,
  asserted against an 85% floor rather than an unachievable 100%), normalization.
- `src/patient/__tests__/identityScoring.test.ts` — 11 tests covering every confidence
  threshold boundary (59/60, 99/100, 34/35) and the specific scoring combinations that
  matter for the duplicate policy (mobile alone = weak, mobile+name = moderate, four exact
  signals together = strong).
- **Total: 20/20 passing.** `npm test` added to `package.json`.

Writing these tests caught two real misunderstandings before they became bugs or wrong
documentation: the original checksum's transposition weakness (§2.2), and an incorrect
assumption that "mobile alone" scored as `moderate` rather than `weak` (corrected in both
the test and the service's doc comment).

**Manual, against the live system** (documented in-session, re-run after each fix):

- Full P0 scenario: HealthcareWorker registers a patient with no email/password →
  `hasPortalAccount: false` verified directly in the database.
- Unidentified-patient path: placeholder name, null DOB, `Provisional` status.
- Strong-match refusal: duplicate ABHA → 409, no override possible.
- Moderate-match policy: shared mobile + different name (borderline DOB proximity) → 409
  without acknowledgement, 201 with it, audited either way.
- Search: mobile search returns both family members sharing a handset; an
  under-specified name search is rejected with 400 before touching the database.
- RBAC: HealthcareWorker blocked (403) from writing an assessment; a Doctor with a genuine
  relationship can; a Doctor with **no** relationship to a patient is blocked (404) —
  this specific assertion is what caught and reversed the overly-broad
  `patient:read:any` grant described in §2.8.
- LKW: a change with no `lkwChangeReason` is rejected; a change with one succeeds and
  produces a revision row whose `reason` is stored encrypted and decrypts correctly on
  read.
- Anonymous access rejected (401) on every new endpoint.
- Full regression: 19/19 (existing functionality) + 9/9 (Phase 6 with corrected
  permissions) = 28/28 passing across two consolidated live-API test runs.

**Release-gate testing** (a separate pass, immediately before commit, specifically
probing for what the above might have missed):

- **Route-ordering check**: confirmed live that `GET /patients/search` resolves to the
  search handler, not swallowed by the `GET /patients/:shriPatientId` pattern (Express
  matches in registration order; the two routes share a prefix, so this was worth
  checking rather than assuming from the route file's declaration order alone).
- **Cross-patient appointment exploit, reproduced then fixed then re-verified**: created
  an unrelated patient, attempted to link a real, uninvolved patient's actual appointment
  to it — confirmed `201` (vulnerable) before the fix, confirmed `400` after, confirmed
  the legitimate paths (no appointment; a patient's own appointment) still work, and
  confirmed the real patient's appointment record was left completely unmodified
  throughout.
- **`encounter.repository.findByIdForPatient` ownership check**, unit-verified in
  isolation: a correct (id, patientId) pair returns non-null; a real id paired with a
  different patient's id returns null.
- **Full permission matrix**, computed programmatically for all 5 roles × 10 new
  permissions and checked against the intended design in one pass, rather than spot-checked
  per-role: confirmed `PatientReadAny` granted to nobody, `AssessmentWriteAssigned`
  Doctor-only, `PatientManageAny` Admin-only.
- **Migration safety**: every one of the four migration SQL files read in full and
  grepped for `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM` — none found; the
  only `CASCADE`s present are `ON UPDATE CASCADE` (harmless) and one `ON DELETE CASCADE`
  from `StrokeLkwRevision` to its own parent `StrokeAssessment` (correct — a revision is
  meaningless without its assessment).
- **Backfill idempotency re-confirmed**: re-ran `backfill-patient-identity.ts` after
  Migration B had already been applied — correctly reported "nothing to do" and 8/8
  verified, with no error and no attempted write.
- **Secret scan**: the actual demo-patient and test-fixture passwords, plus JWT/
  encryption/blind-index key values, searched for verbatim across every new and modified
  file (source and documentation) — none found.
- **Full database reconciliation after every test round**: row counts for every table
  checked back to the exact pre-gate baseline (8 patients, 3 appointments, 4
  notifications, 2 care-team rows, 5 doctors/1 staff/14 users counting the two documented
  test fixtures) after each round of manual testing, including one stray notification
  (a real "potential stroke symptoms" workflow alert correctly generated by a
  gate-review test) that was identified and removed.

**Browser (Chrome via CDP), for the two frontend bug fixes:**

- Accessibility preference (`data-large-text`) toggled, then the page **reloaded** — the
  attribute is still present after reload (previously would have reset to absent).
- Login form submit button confirmed `disabled` within 80ms of a click, before the request
  resolves.

## 12. Known limitations

- **No automated test suite for the existing ~5,200 LOC codebase** — unchanged from every
  prior phase's own stated limitation. This phase added 20 tests for its own two riskiest
  pure-function modules (ID generation, identity scoring); the rest of the backend,
  including this phase's own services/controllers/repositories, has no automated coverage
  and was verified entirely by hand.
- **No staff-facing registration UI.** `/clinic` remains the pre-existing placeholder. This
  phase is API-only, per the approved scope.
- **`patient:read:any` is infrastructure with no consumer** — a deliberate choice (§2.8),
  not an oversight, but worth naming: there is currently no way for an authorized
  administrator to look up an arbitrary patient outside a care relationship, even for a
  legitimate support case. Building that access path is exactly the "explicit,
  separately audited break-glass flow" the codebase's design calls for — not done here.
- **Offline sync and ABHA integration are not built** (§7, §9) — deferred to a later
  phase by deliberate, approved scope decision, not silently dropped.
- **The demo/production SMTP credential issue noted in Phase 5 is unrelated to and
  unaffected by this phase** — not re-verified here.

## 13. Deferred work

Restated from the approved plan, for anyone picking this up next:

- Offline-capable field registration (IndexedDB queue, idempotent sync, conflict handling)
- ABHA/ABDM API integration (the identity-matching seam is ready; the actual government API
  call is not built)
- A `merge` endpoint for `IdentityStatus.MergedAway`, once a real duplicate and an
  authorized process exist to justify it
- Admin break-glass access to `patient:read:any`, with its own dedicated audit trail
- Staff-facing registration/search UI (`/clinic` build-out)
- The programme-wide absence of an automated test suite for the pre-existing codebase

## 14. Production readiness assessment

**CONDITIONALLY PRODUCTION READY for the P0/P1 scope delivered**, with the same
conditions Phase 4 already stated (SMTP credential rotation, the Stroke-AI-UI/Telehealth-UI
naming question, and the still-growing list of documented DEFER items) plus these
additions specific to this phase:

1. The backfill script and Migration B's staged-application procedure (§3.1) must be
   followed in order on any environment that already has patient data — running Migration
   B before the backfill will correctly and safely fail, but running the backfill without
   first taking a verified backup would not be prudent regardless of how safe the script
   is by design.
2. `patient:read:any` currently has no operational path for a legitimate support/admin
   need to see a patient outside a care relationship. This is a deliberate gap, not an
   oversight, but it should be closed with a genuine audited break-glass flow before this
   is relied on in a real support workflow.
3. This phase's own new code has automated coverage for exactly two files (§11). Everything
   else — including the duplicate-detection policy's live behaviour and the LKW
   transactional write — was verified by hand and would benefit from the same kind of
   `node:test` coverage before being extended further.

A pre-commit release gate (§6's "Findings from a pre-commit release gate" subsection)
subsequently reviewed the complete diff file-by-file, found and fixed a real
cross-patient data-integrity defect (§6) that neither the original implementation nor its
manual test pass had caught, and reconciled the database back to its exact pre-phase
baseline afterward. That a second, independent pass over the same code found a genuine
defect is itself informative: it is further evidence for, not against, point 3 above —
manual review and manual testing, however careful, are not a substitute for automated
coverage at this surface area, and a phase this size should be expected to contain more
such findings than the ones caught so far.

**This is not production ready as a complete platform** — it does not claim to be one.
It is a verified, additive foundation for the identity/registration/encounter layer that
the rest of the platform (offline, ABHA, staff UI) can build on without architectural
surgery, which was the phase's stated objective.

No secrets, credentials, keys, or tokens appear anywhere in this document.
