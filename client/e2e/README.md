# Browser verification — clinician portal (UI_ATLAS M-06)

This suite is the **acceptance gate** for the clinician portal, not a smoke
test. `tsc`, `eslint` and `vite build` all passing says nothing about whether a
clinician can use the screens, which is the thing being delivered.

## Running it

The suite starts the Vite dev server itself. It does **not** start the API,
because the API needs a database and a seeded demo clinic, and silently
starting one here would hide a missing seed behind a timeout.

```bash
# 1. Database (from server/) — idempotent, safe to re-run
npm run db:demo:clinic

# 2. API (from server/)
npm run dev                      # listens on :5000

# 3. The suite (from client/)
DEMO_CLINIC_PASSWORD='…' npx playwright test
```

`DEMO_CLINIC_PASSWORD` is read from the environment so no credential is
committed. It is the same value the seed prints, i.e. the server's
`DEMO_CLINIC_PASSWORD`.

## What each spec proves

| Spec | Claim |
|---|---|
| `clinician-sweep` | every clinician route renders at 375 / 768 / 1024 / 1440 / 1920 with **no console errors** and **no horizontal overflow**, reachable from the nav |
| `spine` | the `W-06-1` workflow is walkable end to end: My Day → chart → timeline → consultation → note → save → problems → prescription → instructions |
| `hard-stop` | prescribing co-amoxiclav to a penicillin-allergic patient is **deterministically blocked** by a focus-trapped `alertdialog` that survives Escape, offers alternatives, and demands a second consultant to override |
| `break-glass` | a clinician with no care relationship is **offered** emergency access rather than refused, sees only a name and UHID before giving a reason, and then carries a non-dismissible `GP-10` banner |
| `resident-cosign` | authorization reads **capabilities, not role names**: a user without `note:sign:own` gets "Submit for co-signature" instead of "Sign note", and a consultant cannot counter-sign a note they have not opened |
| `chart-atlas` | `S-06-02` carries its seven atlas tabs, `Z6` rail and always-enabled escape hatch; the rail relocates correctly at each breakpoint; `AI-OFF` **removes** the AI affordances rather than greying them; the assistant declines clinical questions |
| `note-sign-gate` | the screen never presents a signing state the server would refuse — empty note and banned abbreviations both disable `Sign` and say why *before* it is pressed; `problemCode` persists; a parent-only ICD-10 code is rejected server-side on a direct API call; a signed note stays LOCKED with addendum as the only path |
| `auth-guard` | ⚠️ the counterweight to `storageState`: a protected route is unreachable without a session, and signing out **revokes server-side**, not just in the browser. Without these, nothing in the suite would notice if the guards stopped guarding |

Screenshots land in `e2e/screenshots/` and are the evidence behind "the UI is
visibly implemented". They are gitignored — they describe a run, not the source.

## Authentication

The suite authenticates **once per run**, over HTTP, before any browser opens.

`auth.setup.ts` is a Playwright *setup project*: it POSTs `/auth/login` for each
of the three demo clinicians with an `APIRequestContext` and saves the cookie
jar to `e2e/.auth/{doctor,desai,resident}.json`. No page is loaded, so it costs
nothing against the refresh budget. Specs then run from that state; the default
is the consultant, and a spec that needs someone else says so:

```ts
test.use({ demoUser: 'resident' })   // or 'desai'
```

**⚠️ The state files are credentials, not fixtures.** Each holds a live
`strokeai_refresh` cookie with a 30-day life. They are gitignored and re-minted
every run.

**⚠️ And they are one-shot.** `/auth/refresh` *rotates*: the token presented is
revoked and a replacement issued. Replaying a revoked token is not a soft
failure — `refreshToken.service.ts` reads it as a captured credential, revokes
the **entire login family**, and writes a Critical `TokenReuseDetected` audit
row. That is why `fixtures.ts` copies the rotated jar back to disk after every
test, and why the suite is pinned to `workers: 1`. Going parallel needs
per-worker state files; it is not a config flag flip.

### ⚠️ The suite writes one `TokenReuseDetected` audit row per run

`auth-guard.spec.ts` proves that signing out revokes the session **on the server**, not just
in the browser, by presenting the captured refresh token to `/auth/refresh` and requiring a
401. Presenting a revoked token is exactly what reuse detection is for, so the server logs a
Critical `TokenReuseDetected` row — a true statement about what just happened.

**If you are investigating a real reuse event, expect one row per suite run and check the
timestamp against your test runs before treating it as an incident.**

## Two things that will waste your afternoon if you do not know them

**1. The budget is page LOADS, not logins.**
The access token lives in page memory, and `AuthContext` re-mints it from the
cookie on every boot — so **each full page load spends one of the 60
`/auth/refresh` calls per 15 minutes per IP**. A login costs nothing extra
(`loginLimiter` sets `skipSuccessfulRequests`), and `storageState` does not
change the count either: it trades an anonymous 401 probe for a successful
rotation. One run is ~22 loads, so two runs fit a window and three do not.

Navigate by clicking, not by `page.goto` — every avoided reload is one back in
the budget. The ceiling is correct and must not be raised to make tests pass.
If you see every test failing at ~25s with a screenshot of the sign-in page,
this is why: the client cannot distinguish a 429 from "not signed in"
(`AuthContext` catches every failure into `clearSession`). Wait out the window.

**2. Break-glass cannot clean up after itself.**
A clinician cannot un-break glass — that is deliberate. Once Dr Desai has a
grant, the gate never appears again for its 12-hour life, so a second run would
silently exercise an ordinary authorized read. `global-setup.ts` expires the
demo grants before each run (it **expires**, never deletes: the audit trail is
not something a test reset may edit). If you run the break-glass flow by hand
and want the gate back, run `npm run db:demo:reset-breakglass` from `server/`.
