/**
 * One transcription at a time, a short line behind it, and a clear "busy"
 * beyond that.
 *
 * ⚠️ WHY SINGLE-FLIGHT. One Whisper-small job uses most of this CPU for
 * ~0.2× the clip length; two in parallel do not finish sooner, they both
 * finish later and double the memory. An unbounded queue turns a busy moment
 * into minutes of silent waiting for everyone, so the waiting line is capped
 * and the next caller is told plainly to try again.
 */

export class QueueFullError extends Error {
  constructor() {
    super('Transcription is busy. Please try again in a moment.');
  }
}

export interface SingleFlightQueue {
  run<T>(job: () => Promise<T>): Promise<T>;
  readonly waitingCount: number;
  readonly busy: boolean;
}

export function createSingleFlightQueue(maxWaiting: number): SingleFlightQueue {
  let running = false;
  const waiting: Array<() => void> = [];

  async function run<T>(job: () => Promise<T>): Promise<T> {
    if (running) {
      if (waiting.length >= maxWaiting) throw new QueueFullError();
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    running = true;
    try {
      return await job();
    } finally {
      const next = waiting.shift();
      if (next !== undefined) next();
      else running = false;
    }
  }

  return {
    run,
    get waitingCount() {
      return waiting.length;
    },
    get busy() {
      return running;
    },
  };
}
