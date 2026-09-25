/**
 * vendor-whisper-model.ts
 *
 * One-time operator script: downloads the speech-to-text model used for
 * patient voice health notes into server/models/, then writes a SHA-256
 * manifest of every file. The same shape as vendor-embedding-model.ts, and for
 * the same reason: the runtime (src/transcription/localWhisper.ts) sets
 * `allowRemoteModels = false` and refuses to run against any file that does
 * not match this manifest.
 *
 * ⚠️ DIFFERENT FROM THE EMBEDDER IN ONE WAY: THIS MODEL IS NOT COMMITTED.
 * It is a few hundred megabytes, so `models/onnx-community/` is gitignored and
 * each environment runs this script once. The manifest records exactly which
 * bytes were vetted, so a deployment that fetched something else fails loudly
 * at first use instead of transcribing with an unknown model.
 *
 *   npm run models:fetch:whisper
 *
 * ⚠️ Whisper SMALL, multilingual, 8-bit quantised. It is the smallest Whisper
 * that covers all five app languages (en, kn, hi, ta, ml). Accuracy for
 * Kannada and Malayalam is known to be weak at this size; see the header of
 * src/transcription/localWhisper.ts.
 */

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { env as transformersEnv, pipeline } from '@huggingface/transformers';
import { WHISPER_DTYPE, WHISPER_MODEL_ID } from '../../src/transcription/whisperModel';

const MODELS_ROOT = path.resolve(__dirname, '../../models');
const MANIFEST_PATH = path.join(MODELS_ROOT, 'whisper-manifest.json');

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
  transformersEnv.allowRemoteModels = true;
  transformersEnv.allowLocalModels = true;
  transformersEnv.cacheDir = MODELS_ROOT;
  transformersEnv.useBrowserCache = false;

  console.log(`Downloading ${WHISPER_MODEL_ID} (quantised) into ${MODELS_ROOT} ...`);
  const asr = await pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
    dtype: WHISPER_DTYPE,
    device: 'cpu',
  });
  await asr.dispose();
  console.log('Download complete.');

  const modelDir = path.join(MODELS_ROOT, WHISPER_MODEL_ID);
  const dirStat = await stat(modelDir).catch(() => null);
  if (dirStat === null || !dirStat.isDirectory()) {
    throw new Error(`Expected the model at ${modelDir} but it is not there. Vendoring failed.`);
  }

  const manifest: Record<string, { sha256: string; bytes: number }> = {};
  for (const file of await walkFiles(modelDir)) {
    const content = await readFile(file);
    manifest[path.relative(MODELS_ROOT, file)] = {
      sha256: createHash('sha256').update(content).digest('hex'),
      bytes: content.length,
    };
  }

  await writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      { modelId: WHISPER_MODEL_ID, dtype: WHISPER_DTYPE, vendoredAt: new Date().toISOString(), files: manifest },
      null,
      2,
    ),
  );

  const totalBytes = Object.values(manifest).reduce((sum, f) => sum + f.bytes, 0);
  console.log(`\nManifest written: ${MANIFEST_PATH}`);
  console.log(`Files: ${Object.keys(manifest).length} · Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err: unknown) => {
  console.error('Vendoring failed:', err);
  process.exitCode = 1;
});
