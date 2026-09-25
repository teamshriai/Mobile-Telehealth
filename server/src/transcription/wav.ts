/**
 * Parse and validate the ONE audio format the transcription endpoint accepts:
 * RIFF/WAVE, PCM 16-bit, 16 kHz, mono.
 *
 * ⚠️ WHY ONLY THIS. Node has no audio decoder and this server has no ffmpeg,
 * so the browser does the decoding (it has to anyway, to record) and uploads
 * exactly what Whisper consumes. Accepting "any audio" would mean shipping a
 * decoder for untrusted media on the request path, which is a larger attack
 * surface than the feature needs.
 *
 * ⚠️ The declared MIME type and file name are never trusted — this reads the
 * bytes. Every size in the header is checked against the buffer, so a
 * truncated or lying header is refused rather than read past its end.
 */

export const WAV_SAMPLE_RATE = 16_000;

export type WavCheck =
  { ok: true; samples: Float32Array; durationMs: number } | { ok: false; reason: string };

export function parsePcm16kMonoWav(buf: Buffer, maxSeconds: number): WavCheck {
  if (buf.length < 44) return { ok: false, reason: 'The recording is empty or too short.' };
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return { ok: false, reason: 'The recording is not a WAV file.' };
  }

  let off = 12;
  let fmt: { format: number; channels: number; rate: number; bits: number } | null = null;
  let data: Buffer | null = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    const bodyStart = off + 8;
    if (bodyStart + size > buf.length) {
      // A `data` chunk may legitimately be declared longer than written by a
      // streaming encoder; anything else overrunning is a malformed file.
      if (id !== 'data') return { ok: false, reason: 'The recording is damaged.' };
      data = buf.subarray(bodyStart);
      break;
    }
    if (id === 'fmt ') {
      if (size < 16) return { ok: false, reason: 'The recording is damaged.' };
      fmt = {
        format: buf.readUInt16LE(bodyStart),
        channels: buf.readUInt16LE(bodyStart + 2),
        rate: buf.readUInt32LE(bodyStart + 4),
        bits: buf.readUInt16LE(bodyStart + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(bodyStart, bodyStart + size);
      break;
    }
    off = bodyStart + size + (size % 2);
  }

  if (fmt === null || data === null) return { ok: false, reason: 'The recording is damaged.' };
  if (fmt.format !== 1 || fmt.bits !== 16 || fmt.channels !== 1 || fmt.rate !== WAV_SAMPLE_RATE) {
    return { ok: false, reason: 'The recording is not in the expected format (16 kHz mono PCM).' };
  }

  const sampleCount = Math.floor(data.length / 2);
  if (sampleCount === 0) return { ok: false, reason: 'The recording is empty.' };
  const durationMs = Math.round((sampleCount / WAV_SAMPLE_RATE) * 1000);
  if (durationMs > maxSeconds * 1000) {
    return { ok: false, reason: `Recordings can be at most ${maxSeconds} seconds long.` };
  }
  if (durationMs < 500) return { ok: false, reason: 'The recording is too short to transcribe.' };

  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) samples[i] = data.readInt16LE(i * 2) / 32768;
  return { ok: true, samples, durationMs };
}
