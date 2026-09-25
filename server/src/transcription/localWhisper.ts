import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { WHISPER_DTYPE, WHISPER_MODEL_ID } from './whisperModel';
import type { TranscriptionProvider } from './provider';

// ─────────────────────────────────────────────────────────────────────────────
// Local Whisper — speech-to-text entirely inside this process.
//
// ⚠️ NO NETWORK, EVER, AT RUNTIME. `allowRemoteModels = false`, and every
// model file is checked against models/whisper-manifest.json (written by
// `npm run models:fetch:whisper`) before the first load. A missing, extra-
// version or swapped file refuses to run rather than transcribing a patient
// with an unknown model.
//
// Measured on this machine (i7-1255U, CPU only, q8): ~1.1 s to load, ~0.2×
// real time to transcribe (11 s clip → 2.3 s; 55 s → 12 s), ~1.4 GB resident.
//
// ⚠️ ACCURACY IS NOT EQUAL ACROSS LANGUAGES. English is strong. Whisper-small
// is weak on Kannada and Malayalam and middling on Hindi and Tamil. The
// patient chooses the language (forcing it beats auto-detection), the result
// is ALWAYS editable before saving, and quality.ts flags transcripts that are
// repetitive or in the wrong script. Per-language accuracy has not been
// measured against real patient speech.
// ─────────────────────────────────────────────────────────────────────────────

const MODELS_ROOT = path.resolve(__dirname, '../../models');
const MANIFEST_PATH = path.join(MODELS_ROOT, 'whisper-manifest.json');

type Manifest = {
  modelId: string;
  dtype: unknown;
  files: Record<string, { sha256: string; bytes: number }>;
};

let verified = false;
let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

export async function verifyWhisperManifest(): Promise<void> {
  if (verified) return;
  const raw = await readFile(MANIFEST_PATH, 'utf8').catch(() => null);
  if (raw === null) {
    throw new Error(
      `Whisper manifest not found at ${MANIFEST_PATH}. Run \`npm run models:fetch:whisper\`.`,
    );
  }
  const manifest = JSON.parse(raw) as Manifest;
  if (
    manifest.modelId !== WHISPER_MODEL_ID ||
    JSON.stringify(manifest.dtype) !== JSON.stringify(WHISPER_DTYPE)
  ) {
    throw new Error(
      'The vendored Whisper model does not match the pinned model id/dtype. Re-run the fetch script.',
    );
  }
  for (const [rel, expected] of Object.entries(manifest.files)) {
    const bytes = await readFile(path.join(MODELS_ROOT, rel)).catch(() => null);
    if (bytes === null)
      throw new Error(`Whisper model file missing: ${rel}. Re-run the fetch script.`);
    if (createHash('sha256').update(bytes).digest('hex') !== expected.sha256) {
      throw new Error(
        `Whisper model file does not match its pinned hash: ${rel}. Refusing to transcribe.`,
      );
    }
  }
  verified = true;
}

async function load(): Promise<AutomaticSpeechRecognitionPipeline> {
  await verifyWhisperManifest();
  const { env: tenv, pipeline } = await import('@huggingface/transformers');
  tenv.allowRemoteModels = false;
  tenv.allowLocalModels = true;
  tenv.localModelPath = MODELS_ROOT;
  tenv.useBrowserCache = false;
  tenv.useFSCache = false;
  return pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
    dtype: WHISPER_DTYPE,
    device: 'cpu',
  });
}

function getPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  pipelinePromise ??= load().catch((err: unknown) => {
    // Never cache a failed load — the next request retries.
    pipelinePromise = null;
    throw err;
  });
  return pipelinePromise;
}

export const localWhisper: TranscriptionProvider = {
  id: `local:${WHISPER_MODEL_ID}:q8`,
  async transcribe(samples, language) {
    const asr = await getPipeline();
    const out = (await asr(samples, {
      language,
      task: 'transcribe',
      // Long-form: 30 s windows with overlap, merged by the pipeline.
      chunk_length_s: 30,
      stride_length_s: 5,
    })) as { text: string } | Array<{ text: string }>;
    const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text;
    return text.trim();
  },
};
