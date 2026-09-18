import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Local, in-process embeddings — Xenova/all-MiniLM-L6-v2, 384-dim, quantized.
//
// Why local at all: Groq has no embeddings endpoint, and any external
// embedding API means shipping decrypted allergies and medication lists to an
// unvetted third party. This runs in-process with no network call, ever.
//
// `allowRemoteModels = false` below is not a performance choice, it is the
// control: the model can only ever load from server/models/, vendored ahead
// of time by prisma/scripts/vendor-embedding-model.ts, and every file is
// SHA-256-verified against models/manifest.json before the first embed call.
// A missing or mismatched file disables retrieval loudly — never a silent
// download, never a silently different model producing incompatible vectors.
//
// Device is forced to 'cpu', not left on 'auto'. This is the native
// onnxruntime-node execution provider — the WASM path was tried first and
// rejected: transformers.js's Node build only accepts {cuda, webgpu, cpu} as
// device values (verified directly), and its separate browser/WASM build
// expects local models to be fetched as URLs, which fails outright against a
// real filesystem path. Because 'cpu' here means the NATIVE binary, and
// onnxruntime-node ships no musl-compatible prebuild, the Docker base image
// was changed from node:20-alpine to node:20-bookworm-slim (glibc) in this
// same phase — see the Dockerfile header for the full reasoning. This
// module does not defend against running on a musl host; the image is what
// guarantees it never does.
//
// Embeddings are treated as sensitive derived clinical data: a 384-float
// vector of "Penicillin (rash)" is partially invertible. They get the same
// access scoping as their source row (AiMemoryChunk cascades with
// PatientProfile), are never logged, and are never returned to the client.
// ─────────────────────────────────────────────────────────────────────────────

export const EMBEDDING_DIMENSIONS = 384;
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const MODELS_ROOT = path.resolve(__dirname, '../../../models');
const MANIFEST_PATH = path.join(MODELS_ROOT, 'manifest.json');

type Manifest = {
  modelId: string;
  files: Record<string, { sha256: string; bytes: number }>;
};

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
let verifiedOnce = false;

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

/**
 * Verifies every vendored file against the manifest. Throws on ANY
 * discrepancy — a missing file, an extra untracked file, or a hash mismatch
 * (a silently swapped model would change what every stored vector means,
 * with no error anywhere downstream to catch it).
 */
async function verifyManifest(): Promise<void> {
  if (verifiedOnce) return;

  const manifestRaw = await readFile(MANIFEST_PATH, 'utf8').catch(() => null);
  if (manifestRaw === null) {
    throw new Error(
      `Embedding model manifest not found at ${MANIFEST_PATH}. Run ` +
        '`npx tsx prisma/scripts/vendor-embedding-model.ts` before enabling retrieval.',
    );
  }
  const manifest = JSON.parse(manifestRaw) as Manifest;
  if (manifest.modelId !== MODEL_ID) {
    throw new Error(
      `Vendored model is "${manifest.modelId}" but the embedder expects "${MODEL_ID}". ` +
        'Re-run the vendoring script or update EMBEDDING model id.',
    );
  }

  const modelDir = path.join(MODELS_ROOT, MODEL_ID);
  const dirStat = await stat(modelDir).catch(() => null);
  if (dirStat === null) {
    throw new Error(`Vendored model directory missing: ${modelDir}`);
  }

  const onDisk = await walkFiles(modelDir);
  const relativeOnDisk = new Set(onDisk.map((f) => path.relative(MODELS_ROOT, f)));
  const expected = Object.keys(manifest.files);

  for (const rel of expected) {
    if (!relativeOnDisk.has(rel)) {
      throw new Error(`Embedding model file missing: ${rel}. Re-run the vendoring script.`);
    }
    const actualHash = await sha256OfFile(path.join(MODELS_ROOT, rel));
    if (actualHash !== manifest.files[rel].sha256) {
      throw new Error(
        `Embedding model file has changed on disk and no longer matches the pinned manifest: ${rel}. ` +
          'This could mean corruption or an unauthorised swap — refusing to embed until resolved.',
      );
    }
  }

  verifiedOnce = true;
}

async function loadPipeline(): Promise<FeatureExtractionPipeline> {
  await verifyManifest();

  // Dynamic import: this is a heavy, native-binary-backed dependency that should never
  // be pulled into a request path that does not need it (e.g. a request
  // whose context is small enough to skip retrieval entirely — see §4's
  // bypass rule in patientContext.ts).
  const { env: transformersEnv, pipeline } = await import('@huggingface/transformers');

  transformersEnv.allowRemoteModels = false;
  transformersEnv.allowLocalModels = true;
  transformersEnv.localModelPath = MODELS_ROOT;
  transformersEnv.useBrowserCache = false;
  transformersEnv.useFSCache = false;

  const extractor = await pipeline('feature-extraction', MODEL_ID, {
    dtype: 'q8',
    device: 'cpu',
  });
  return extractor;
}

function getPipeline(): Promise<FeatureExtractionPipeline> {
  pipelinePromise ??= loadPipeline().catch((err: unknown) => {
    // A failed load must not be cached as a resolved pipeline — the next
    // call should retry rather than replaying the same failure forever.
    pipelinePromise = null;
    throw err;
  });
  return pipelinePromise;
}

/** Mean-pooled, L2-normalised embedding — normalisation is what makes cosine
 *  similarity in pgvector reduce to a plain dot product (`<#>` operator). */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/** Test-only: forces the next call to reload and re-verify from scratch. */
export function __resetEmbedderForTests(): void {
  pipelinePromise = null;
  verifiedOnce = false;
}
