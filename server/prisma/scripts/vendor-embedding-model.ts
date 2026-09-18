/**
 * vendor-embedding-model.ts
 *
 * One-time operator script: downloads the embedding model used for retrieval
 * (Xenova/all-MiniLM-L6-v2, quantized) into server/models/, then writes a
 * SHA-256 manifest of every file.
 *
 * This is what makes "package/pin/verify the model in the deployment
 * artifact instead of relying on runtime downloads" true. The runtime module
 * (src/ai/embeddings/embedder.ts) sets `allowRemoteModels = false` and
 * verifies the manifest before its first embed — it will refuse to run
 * against a model file that was not vendored through this script, or that
 * has been silently swapped since.
 *
 * Run once, commit the `models/` directory, and re-run only to deliberately
 * change the pinned model:
 *
 *   npx tsx prisma/scripts/vendor-embedding-model.ts
 */

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { env as transformersEnv, pipeline } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const MODEL_DIR_NAME = 'all-MiniLM-L6-v2';
const MODELS_ROOT = path.resolve(__dirname, '../../models');
const MANIFEST_PATH = path.join(MODELS_ROOT, 'manifest.json');

async function sha256OfFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(full)));
    else files.push(full);
  }
  return files;
}

async function main(): Promise<void> {
  // Download into MODELS_ROOT via the library's own cache mechanism, using
  // the local path as both the cache dir and the eventual serving path —
  // after this script exits, nothing in the runtime path ever touches the
  // network again.
  transformersEnv.allowRemoteModels = true;
  transformersEnv.allowLocalModels = true;
  transformersEnv.cacheDir = MODELS_ROOT;
  transformersEnv.useBrowserCache = false;

  console.log(`Downloading ${MODEL_ID} (quantized) into ${MODELS_ROOT} ...`);
  // Triggers the download; the pipeline itself is discarded — this script
  // only wants the files on disk, not to hold a session open.
  await pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' });
  console.log('Download complete.');

  const modelDir = path.join(MODELS_ROOT, MODEL_ID);
  const dirStat = await stat(modelDir).catch(() => null);
  if (dirStat === null || !dirStat.isDirectory()) {
    throw new Error(
      `Expected the model to land at ${modelDir} but it did not. Vendoring failed.`,
    );
  }

  const files = await walkFiles(modelDir);
  const manifest: Record<string, { sha256: string; bytes: number }> = {};
  for (const file of files) {
    const relative = path.relative(MODELS_ROOT, file);
    const content = await readFile(file);
    manifest[relative] = {
      sha256: createHash('sha256').update(content).digest('hex'),
      bytes: content.length,
    };
  }

  await writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      {
        modelId: MODEL_ID,
        dtype: 'q8',
        vendoredAt: new Date().toISOString(),
        files: manifest,
      },
      null,
      2,
    ),
  );

  const totalBytes = Object.values(manifest).reduce((sum, f) => sum + f.bytes, 0);
  console.log(`\nManifest written: ${MANIFEST_PATH}`);
  console.log(`Files: ${Object.keys(manifest).length} · Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log('\nCommit the models/ directory. The runtime never downloads this model again.');
}

main().catch((err: unknown) => {
  console.error('Vendoring failed:', err);
  process.exitCode = 1;
});
