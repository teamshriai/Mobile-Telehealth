import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * Leaves the demo patients as the suite found them: the medicines spec's
 * refill requests (marked "[e2e]") would otherwise sit on the demo account as
 * "sent to your doctor" until the next run. Logged and swallowed on failure,
 * like global-setup — the next run's setup removes them anyway.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    const cwd = new URL('../../server', import.meta.url).pathname
    const { stdout } = await run('npm', ['run', '--silent', 'db:demo:reset-refills'], { cwd })
    process.stdout.write(`[global-teardown] ${stdout.trim()}\n`)
  } catch (err) {
    process.stdout.write(`[global-teardown] could not remove test refill requests: ${(err as Error).message}\n`)
  }
}
