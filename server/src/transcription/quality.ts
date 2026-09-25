/**
 * Is this transcript probably wrong?
 *
 * ⚠️ WHY THIS EXISTS. Whisper fails confidently. Measured on this build:
 * English speech transcribed with language forced to Hindi came back as
 * "अज़ा आप आप आप आप आप…" repeated to the token limit, and forced to Kannada it
 * came back in DEVANAGARI — the wrong script entirely. Both look like text,
 * and a patient could save either as their own words. This does not fix a
 * transcript; it tells the patient to check it, in words.
 *
 * Suppressing repetition during decoding was tried and rejected: it stopped
 * the loop but also dropped a word from a correct English transcript. Warning
 * is safer than silently rewriting.
 */

export type TranscriptQuality = 'ok' | 'empty' | 'repetitive' | 'wrong_script';

/** Unicode blocks each supported language is written in. */
const SCRIPT: Record<string, RegExp> = {
  en: /[A-Za-z]/u,
  hi: /[ऀ-ॿ]/u,
  kn: /[ಀ-೿]/u,
  ta: /[஀-௿]/u,
  ml: /[ഀ-ൿ]/u,
};

const LETTER = /\p{L}/u;

export function assessTranscript(text: string, language: string): TranscriptQuality {
  const trimmed = text.trim();
  if (trimmed === '') return 'empty';

  const words = trimmed.split(/\s+/u);
  let run = 1;
  for (let i = 1; i < words.length; i++) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    if (run >= 6) return 'repetitive';
  }
  if (words.length >= 10) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top / words.length > 0.4) return 'repetitive';
  }

  const expected = SCRIPT[language];
  if (expected !== undefined) {
    // Numbers and punctuation are script-neutral ("145/90" is fine in any
    // language); only letters are counted.
    const letters = [...trimmed].filter((c) => LETTER.test(c));
    if (letters.length >= 4) {
      const inScript = letters.filter((c) => expected.test(c)).length;
      // Mixed-script notes are normal (English drug names inside a Hindi
      // sentence), so the bar is "mostly", not "entirely".
      if (inScript / letters.length < 0.5) return 'wrong_script';
    }
  }
  return 'ok';
}
