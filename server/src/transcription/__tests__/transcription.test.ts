import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePcm16kMonoWav } from '../wav';
import { assessTranscript } from '../quality';
import { createSingleFlightQueue, QueueFullError } from '../queue';

// ─────────────────────────────────────────────────────────────────────────────
// Voice health notes — the pure parts of the pipeline.
//
// ⚠️ The WAV parser is the upload's only gate: it decides what untrusted bytes
// reach the model. So most cases here are REFUSALS, not acceptances.
// ─────────────────────────────────────────────────────────────────────────────

function wav(
  opts: { seconds?: number; rate?: number; channels?: number; bits?: number; format?: number } = {},
): Buffer {
  const { seconds = 1, rate = 16000, channels = 1, bits = 16, format = 1 } = opts;
  const dataBytes = Math.round(seconds * rate) * channels * (bits / 8);
  const b = Buffer.alloc(44 + dataBytes);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + dataBytes, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(format, 20);
  b.writeUInt16LE(channels, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * channels * (bits / 8), 28);
  b.writeUInt16LE(channels * (bits / 8), 32);
  b.writeUInt16LE(bits, 34);
  b.write('data', 36);
  b.writeUInt32LE(dataBytes, 40);
  return b;
}

describe('parsePcm16kMonoWav — the only format the endpoint accepts', () => {
  it('accepts 16 kHz mono PCM16 and reports its duration', () => {
    const r = parsePcm16kMonoWav(wav({ seconds: 2 }), 120);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.durationMs, 2000);
      assert.equal(r.samples.length, 32000);
    }
  });

  const refused: Array<[string, Buffer, number?]> = [
    ['not RIFF at all', Buffer.from('hello, this is not audio at all, just text padding.')],
    ['stereo', wav({ channels: 2 })],
    ['44.1 kHz', wav({ rate: 44100 })],
    ['8-bit', wav({ bits: 8 })],
    ['float (format 3)', wav({ format: 3, bits: 32 })],
    ['longer than the cap', wav({ seconds: 3 }), 2],
    ['shorter than half a second', wav({ seconds: 0.2 })],
    ['empty buffer', Buffer.alloc(0)],
  ];
  for (const [label, buf, max] of refused) {
    it(`refuses: ${label}`, () => {
      assert.equal(parsePcm16kMonoWav(buf, max ?? 120).ok, false);
    });
  }

  it('refuses a fmt chunk whose declared size runs past the buffer', () => {
    const b = wav();
    b.writeUInt32LE(10_000_000, 16);
    assert.equal(parsePcm16kMonoWav(b, 120).ok, false);
  });
});

describe('assessTranscript — flags the confident failures Whisper actually produced', () => {
  it('a clean English sentence is ok', () => {
    assert.equal(assessTranscript('I have had a headache since yesterday evening.', 'en'), 'ok');
  });
  it('the measured Hindi repetition loop is flagged', () => {
    assert.equal(assessTranscript('अज़ा आप आप आप आप आप आप आप आप', 'hi'), 'repetitive');
  });
  it('Devanagari returned for a Kannada recording is flagged as the wrong script', () => {
    assert.equal(
      assessTranscript('अपने आप आन्पार्दाना आत्टाने कर्त्री करे जाएगा', 'kn'),
      'wrong_script',
    );
  });
  it('real Kannada text passes the script check', () => {
    assert.equal(assessTranscript('ನನಗೆ ನಿನ್ನೆ ಸಂಜೆಯಿಂದ ತಲೆನೋವು ಇದೆ', 'kn'), 'ok');
  });
  it('an English drug name inside a Hindi sentence is still Hindi', () => {
    assert.equal(
      assessTranscript('मैंने सुबह levothyroxine की गोली ली और फिर नाश्ता किया', 'hi'),
      'ok',
    );
  });
  it('numbers are script-neutral', () => {
    assert.equal(assessTranscript('ರಕ್ತದೊತ್ತಡ 145/90 ಇತ್ತು', 'kn'), 'ok');
  });
  it('empty output is flagged', () => {
    assert.equal(assessTranscript('   ', 'en'), 'empty');
  });
});

describe('createSingleFlightQueue — one job running, a short line, then "busy"', () => {
  it('never runs two jobs at once, and refuses beyond the waiting cap', async () => {
    const q = createSingleFlightQueue(1);
    let concurrent = 0;
    let peak = 0;
    const job = (): Promise<void> =>
      new Promise<void>((resolve) => {
        concurrent += 1;
        peak = Math.max(peak, concurrent);
        setTimeout(() => {
          concurrent -= 1;
          resolve();
        }, 20);
      });
    const a = q.run(job);
    const b = q.run(job);
    await assert.rejects(q.run(job), QueueFullError);
    await Promise.all([a, b]);
    assert.equal(peak, 1);
  });

  it('a failing job releases the slot for the next one', async () => {
    const q = createSingleFlightQueue(2);
    const failing = q.run(() => Promise.reject(new Error('boom')));
    const next = q.run(() => Promise.resolve('ran'));
    await assert.rejects(failing);
    assert.equal(await next, 'ran');
    assert.equal(q.busy, false);
  });
});
