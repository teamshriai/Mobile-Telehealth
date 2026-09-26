import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Downloads the NLM Visible Human source files into a local cache.
//
// ⚠️ NEVER COMMITTED. The cache lives in `server/.cache/nlm-vhp/` (gitignored);
// only the list and the checksums are in the repository. `--pin` records each
// file's size and SHA-256 the first time; every later run verifies them, so a
// changed or truncated download fails loudly instead of producing wrong images.
//
// Offline, it fails with the list of files it could not get.
// ─────────────────────────────────────────────────────────────────────────────

export const NLM_BASE = 'https://data.lhncbc.nlm.nih.gov/public/Visible-Human/';
export const CACHE_DIR = path.resolve(__dirname, '../../../.cache/nlm-vhp');
const LOCK_PATH = path.resolve(__dirname, 'nlm-sources.lock.json');

type Lock = Record<string, { bytes: number; sha256: string }>;

function readLock(): Lock {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8')) as Lock;
  } catch {
    return {};
  }
}

const sha256 = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex');

async function download(rel: string, attempt = 1): Promise<Buffer> {
  try {
    const res = await fetch(NLM_BASE + rel, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const expected = Number(res.headers.get('content-length') ?? buf.length);
    if (buf.length !== expected) throw new Error(`short read ${buf.length}/${expected}`);
    return buf;
  } catch (err) {
    if (attempt >= 4) throw new Error(`${rel}: ${(err as Error).message}`);
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return download(rel, attempt + 1);
  }
}

/**
 * Make sure every file is cached and matches the lock; returns local paths in
 * the same order. Four downloads at a time.
 */
export async function ensureCached(
  rels: string[],
  opts: { pin: boolean; offline: boolean },
): Promise<string[]> {
  const lock = readLock();
  let changed = false;
  const missing: string[] = [];
  const out: string[] = new Array(rels.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < rels.length) {
      const i = next++;
      const rel = rels[i];
      const local = path.join(CACHE_DIR, rel);
      let buf: Buffer | null = fs.existsSync(local) ? fs.readFileSync(local) : null;
      if (buf === null) {
        if (opts.offline) {
          missing.push(rel);
          continue;
        }
        try {
          buf = await download(rel);
        } catch (err) {
          missing.push(`${rel} (${(err as Error).message})`);
          continue;
        }
        fs.mkdirSync(path.dirname(local), { recursive: true });
        fs.writeFileSync(local, buf);
      }
      const entry = lock[rel];
      if (entry === undefined) {
        if (!opts.pin)
          throw new Error(`${rel} is not in nlm-sources.lock.json — run once with --pin`);
        lock[rel] = { bytes: buf.length, sha256: sha256(buf) };
        changed = true;
      } else if (entry.bytes !== buf.length || entry.sha256 !== sha256(buf)) {
        fs.rmSync(local, { force: true });
        throw new Error(
          `${rel} does not match its pinned checksum (removed from the cache; re-run to download again)`,
        );
      }
      out[i] = local;
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (missing.length > 0) {
    throw new Error(
      `Could not get ${missing.length} source file(s):\n  ${missing.slice(0, 12).join('\n  ')}`,
    );
  }
  if (changed) {
    const sorted = Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(LOCK_PATH, `${JSON.stringify(sorted, null, 1)}\n`);
  }
  return out;
}

/** `.Z` (compress) and `.gz` both decompress with `gzip -dc`. */
export function decompress(localPath: string): Buffer {
  const r = spawnSync('gzip', ['-dc', localPath], { maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`gzip is required to unpack the sources: ${r.error.message}`);
  if (r.status !== 0)
    throw new Error(`gzip failed on ${path.basename(localPath)}: ${r.stderr.toString().trim()}`);
  return r.stdout;
}
