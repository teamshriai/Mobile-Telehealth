import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * ⚠️ The break-glass test is inherently stateful and cannot clean up after
 * itself from the browser: a clinician cannot un-break glass, by design. Once
 * Dr Desai has broken glass on a patient the gate never appears again for the
 * life of the grant, so a second run of the suite would silently exercise an
 * ordinary authorized read while still passing most of its assertions.
 *
 * Expiring the demo grants here — before any test runs — is what makes the
 * suite repeatable. It expires rather than deletes, so nothing is erased from
 * the audit trail.
 *
 * A failure is logged and swallowed: the database may not be reachable in
 * every environment, and the break-glass test will then fail loudly and
 * specifically, which is more useful than the whole run refusing to start.
 */
export default async function globalSetup(): Promise<void> {
  try {
    const cwd = new URL('../../server', import.meta.url).pathname

    /**
     * ⚠️ TWO resets, and the second matters as much as the first.
     *
     * Several tests click "Start consultation", which creates a real encounter
     * and a blank draft note. Those accumulate across runs, and because the
     * chart lists notes newest-first, the next run's coherence check opens the
     * blank draft a previous run left behind instead of the seeded note — and
     * reports that a visit opens onto nothing, which is exactly the defect the
     * test exists to catch. A test that fails because of its own debris trains
     * you to ignore it.
     *
     * The cleanup is conservative by design: it removes only in-progress
     * shells with no chief complaint, no problems or instructions, no signed
     * note and no basket with items. Anything a clinician typed survives.
     */
    // The third removes the refill requests the medicines spec made (marked
    // "[e2e]"): one open request per medicine is all the database allows.
    for (const script of ['db:demo:reset-breakglass', 'db:demo:reset-encounters', 'db:demo:reset-refills']) {
      const { stdout } = await run('npm', ['run', '--silent', script], { cwd })
      process.stdout.write(`[global-setup] ${stdout.trim()}\n`)
    }
  } catch (err) {
    process.stdout.write(
      `[global-setup] could not reset break-glass grants: ${(err as Error).message}\n` +
        '[global-setup] the break-glass test may fail because a grant is still active.\n',
    )
  }
}
