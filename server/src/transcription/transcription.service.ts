import { env } from '../config/env.config';
import { AppError } from '../middleware/errorHandler';
import { localWhisper, verifyWhisperManifest } from './localWhisper';
import { createSingleFlightQueue, QueueFullError } from './queue';
import { assessTranscript, type TranscriptQuality } from './quality';

const queue = createSingleFlightQueue(env.STT_QUEUE_MAX);

export type TranscriptionResult = {
  text: string;
  quality: TranscriptQuality;
  engine: string;
  latencyMs: number;
};

export const transcriptionService = {
  /** Whether voice notes are switched on at all (the UI asks before recording). */
  get enabled(): boolean {
    return env.STT_PROVIDER === 'local';
  },

  /**
   * Called at boot in production. A deployment configured for local speech
   * recognition must have the verified model on disk; finding out on a
   * patient's first recording is too late.
   */
  async assertReady(): Promise<void> {
    if (env.STT_PROVIDER === 'local') await verifyWhisperManifest();
  },

  async transcribe(samples: Float32Array, language: string): Promise<TranscriptionResult> {
    if (!this.enabled) {
      throw new AppError(
        'Voice notes are not available on this server. You can type your note instead.',
        503,
      );
    }
    const started = Date.now();
    let timer: NodeJS.Timeout | undefined;
    try {
      // ⚠️ The timeout releases the PATIENT, not the CPU: an ONNX run cannot
      // be interrupted, so the queue slot stays held until it really ends.
      const text = await Promise.race([
        queue.run(() => localWhisper.transcribe(samples, language)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new AppError(
                  'Transcription took too long. Please try a shorter recording, or type your note.',
                  504,
                ),
              ),
            env.STT_TIMEOUT_MS,
          );
        }),
      ]);
      return {
        text,
        quality: assessTranscript(text, language),
        engine: localWhisper.id,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      if (err instanceof QueueFullError) throw new AppError(err.message, 503);
      if (err instanceof AppError) throw err;
      // Never echo engine internals to a patient.
      console.error('[transcription] failed:', (err as Error).message);
      throw new AppError(
        'We could not transcribe that recording. You can try again or type your note.',
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  },
};
