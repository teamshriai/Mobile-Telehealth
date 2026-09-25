/**
 * The pinned speech-to-text model. One place, shared by the vendoring script
 * and the runtime, so the two can never disagree about which files to load.
 *
 * ⚠️ Changing either value means re-running `npm run models:fetch:whisper`,
 * which rewrites models/whisper-manifest.json. The runtime refuses a manifest
 * whose modelId or dtype differs from these.
 */
export const WHISPER_MODEL_ID = 'onnx-community/whisper-small';

/** 8-bit weights for both halves: the CPU-feasible point on this hardware. */
export const WHISPER_DTYPE = { encoder_model: 'q8', decoder_model_merged: 'q8' } as const;
