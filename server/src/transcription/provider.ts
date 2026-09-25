/**
 * The seam every speech-to-text engine plugs into. Today there is exactly one
 * (localWhisper); an Indic-tuned model later is a new implementation of this,
 * not a change to the health-note code.
 *
 * `language` is one of the app's codes: en | kn | hi | ta | ml.
 */
export interface TranscriptionProvider {
  /** Recorded on every note, so a transcript is traceable to its engine. */
  readonly id: string;
  transcribe(samples16kMono: Float32Array, language: string): Promise<string>;
}
