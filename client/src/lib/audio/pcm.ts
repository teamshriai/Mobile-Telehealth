/**
 * Turn whatever the browser recorded into the ONE format the server accepts:
 * WAV, PCM 16-bit, 16 kHz, mono.
 *
 * ⚠️ WHY THE BROWSER DOES THIS. The server has no audio decoder (no ffmpeg,
 * and Node has no AudioContext), and accepting arbitrary compressed audio
 * would mean running a decoder on untrusted media there. The browser already
 * decodes audio natively, so it resamples here and uploads exactly what the
 * speech model consumes — ~32 kB per second, ~3.8 MB for the 120 s cap.
 */

const TARGET_RATE = 16_000

export async function toPcm16kMonoWav(recording: Blob): Promise<{ wav: Blob; durationMs: number }> {
  const encoded = await recording.arrayBuffer()
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(encoded)
  } finally {
    void ctx.close()
  }

  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE))
  // An OfflineAudioContext at 16 kHz with one channel does the resampling AND
  // the down-mix in one render, using the browser's own resampler.
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  const samples = rendered.getChannelData(0)

  return { wav: new Blob([encodeWav(samples)], { type: 'audio/wav' }), durationMs: Math.round(rendered.duration * 1000) }
}

function encodeWav(samples: Float32Array): ArrayBuffer {
  const dataBytes = samples.length * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const v = new DataView(buf)
  const ascii = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  ascii(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, TARGET_RATE, true); v.setUint32(28, TARGET_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  ascii(36, 'data'); v.setUint32(40, dataBytes, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}
