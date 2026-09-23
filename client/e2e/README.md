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

Screenshots land in `e2e/screenshots/` and are the evidence behind "the UI is
visibly implemented". They are gitignored — they describe a run, not the source.

## Two things that will waste your afternoon if you do not know them

**1. The suite navigates by clicking, not by `page.goto`.**
Every `page.goto` is a full reload, which drops the in-memory access token and
spends one of the **60 `/auth/refresh` calls per 15 minutes per IP** that
`refreshLimiter` allows. An earlier version of the sweep did five `goto`s per
breakpoint; running the suite twice inside the window exhausted the budget and
*every* test then failed by being bounced to `/login` — which looks exactly
like a catastrophically broken application and is not one. The ceiling is
correct and should not be raised to make tests pass. If you see every test
failing at ~25s with a screenshot of the sign-in page, this is why: wait out
the window.

**2. Break-glass cannot clean up after itself.**
A clinician cannot un-break glass — that is deliberate. Once Dr Desai has a
grant, the gate never appears again for its 12-hour life, so a second run would
silently exercise an ordinary authorized read. `global-setup.ts` expires the
demo grants before each run (it **expires**, never deletes: the audit trail is
not something a test reset may edit). If you run the break-glass flow by hand
and want the gate back, run `npm run db:demo:reset-breakglass` from `server/`.
