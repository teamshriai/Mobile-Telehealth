import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// `OTP_DEV_FIXED_CODE` — the demo code must be impossible in production.
//
// ⚠️ WHY A CHILD PROCESS. The guard is the environment schema itself, which
// runs at import and calls `process.exit(1)` on failure. Importing it here
// would either kill the test runner or test a copy of the schema. Booting the
// REAL module in a separate process, with a controlled environment, tests the
// exact thing a deploy would hit.
//
// Each case compares against a control that differs ONLY in the variable under
// test, because a production-mode boot can fail for other reasons (missing
// secrets) and "it exited 1" alone would prove nothing.
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * ⚠️ The module loads `dotenv/config`, which fills any variable missing from
 * the process environment from `server/.env` — so deleting a key here does not
 * remove it if the developer's `.env` sets it. The child therefore reads a
 * COPY of `.env` with every key under test stripped, and gets those keys only
 * from `extra`. The result no longer depends on what is in anyone's `.env`.
 */
function boot(extra: Record<string, string | undefined>): { status: number | null; output: string } {
  const source = path.join(SERVER_ROOT, '.env');
  const lines = fs.existsSync(source) ? fs.readFileSync(source, 'utf8').split('\n') : [];
  const stripped = lines.filter((l) => !Object.keys(extra).some((k) => l.startsWith(`${k}=`)));
  const dotenvPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'envtest-')), '.env');
  fs.writeFileSync(dotenvPath, stripped.join('\n'), { mode: 0o600 });

  const env: NodeJS.ProcessEnv = { ...process.env, ...extra, DOTENV_CONFIG_PATH: dotenvPath };
  for (const [k, v] of Object.entries(extra)) if (v === undefined) delete env[k];
  const r = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', "require('./src/config/env.config.ts')"],
    { cwd: SERVER_ROOT, env, encoding: 'utf8', timeout: 30_000 },
  );
  fs.rmSync(path.dirname(dotenvPath), { recursive: true, force: true });
  return { status: r.status, output: `${r.stdout}\n${r.stderr}` };
}

describe('OTP_DEV_FIXED_CODE', () => {
  it('production refuses to boot when it is set, and names it', () => {
    const r = boot({ NODE_ENV: 'production', OTP_DEV_FIXED_CODE: '123456' });
    assert.equal(r.status, 1);
    assert.match(r.output, /OTP_DEV_FIXED_CODE must not be set when NODE_ENV=production/);
  });

  it('control: without it, production does not raise that error', () => {
    const r = boot({ NODE_ENV: 'production', OTP_DEV_FIXED_CODE: undefined });
    assert.doesNotMatch(r.output, /OTP_DEV_FIXED_CODE/);
  });

  it('development accepts a six-digit value', () => {
    const r = boot({ NODE_ENV: 'development', OTP_DEV_FIXED_CODE: '123456' });
    assert.equal(r.status, 0, r.output);
  });

  it('rejects anything that is not exactly six digits, even in development', () => {
    for (const bad of ['12345', '1234567', '12a456', ' 123456']) {
      const r = boot({ NODE_ENV: 'development', OTP_DEV_FIXED_CODE: bad });
      assert.equal(r.status, 1, `accepted ${JSON.stringify(bad)}`);
      assert.match(r.output, /exactly six digits/);
    }
  });
});
