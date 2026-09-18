import { detectEmergency } from './emergency.guard';

// ─────────────────────────────────────────────────────────────────────────────
// Post-generation output guard.
//
// A system prompt guarantees nothing — it is a soft prior on an open-weights
// 20B model, defeated by ordinary sampling variance and by prompt injection
// arriving through the patient's own record text placed in context. These
// checks are deterministic and run on the model's OUTPUT before it is shown
// or stored. Rejection is reject-and-replace, never edit-in-place: editing a
// model's clinical-sounding text risks producing a different but equally
// wrong clinical-sounding text.
// ─────────────────────────────────────────────────────────────────────────────

export type OutputCheckFailure =
  | 'diagnosis_assertion'
  | 'false_reassurance'
  | 'dosing_instruction'
  | 'wrong_emergency_number'
  | 'fabricated_number'
  | 'fabricated_medication'
  | 'emergency_missed_by_input_guard'
  | 'truncated_reply';

export type OutputCheckResult = { ok: true } | { ok: false; failure: OutputCheckFailure };

/** Normalises for matching: lowercase, contractions expanded just enough that
 *  "you're fine" and "you are fine" are caught by one rule. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/you're/g, 'you are')
    .replace(/it's/g, 'it is')
    .replace(/that's/g, 'that is')
    .replace(/\s+/g, ' ')
    .trim();
}

const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou (have|are having|had|have had) (a |an )?(stroke|tia|heart attack|infection)\b/,
  /\bthis (is|means) (a |an )?(stroke|tia|heart attack)\b/,
  /\byou are (having|experiencing) a (stroke|tia)\b/,
  /\bmy diagnosis is\b/,
  /\bi (diagnose|can confirm) you\b/,
];

const REASSURANCE_PATTERNS: RegExp[] = [
  /\byou are (fine|okay|ok|normal|alright)\b/,
  /\bnothing to worry about\b/,
  /\bno need to worry\b/,
  /\bthis is (completely )?normal\b/,
  /\bprobably (just|nothing)\b/,
  /\bit is (just|only) \w+, nothing serious\b/,
  /\byou do not need to see (a doctor|your care team)\b/,
];

const DOSING_PATTERNS: RegExp[] = [
  // "take" alone is not instructional — "your record shows you take 75mg" is
  // a plain description of what is already prescribed, and must be allowed.
  // It only becomes an instruction paired with advisory framing.
  /\b(should|must|need to|have to|try to|i recommend|i suggest|i advise|please)\b[^.?!]{0,30}\b(take|stop|start|increase|reduce|double|skip|halve)\b[^.?!]{0,40}\b\d+\s?(mg|ml|mcg|g|iu|tablets?|pills?|units?)\b/,
  // A change-of-regimen verb (never "take") near a dose is instructional on
  // its own — "stop the 75mg", "increase to 100mg" have no benign reading.
  /\b(stop|start|increase|reduce|double|skip|halve)\b[^.?!]{0,40}\b\d+\s?(mg|ml|mcg|g|iu|tablets?|pills?|units?)\b/,
  /\b\d+\s?(mg|ml|mcg|g|iu|tablets?|pills?|units?)\b[^.?!]{0,40}\b(stop|start|increase|reduce|double|skip|halve)\b/,
  /\byou should (take|stop|start) \d+/,
];

/** Only 108/112 (India) and 14416 (Tele-MANAS) are correct. A US-trained
 *  model reaches for 911 by default — this is the concrete failure mode. */
const WRONG_EMERGENCY_NUMBER =
  /\b911\b|\b999\b|\b000\b|\bemergency services at \d{2,4}\b(?!.*\b(108|112|14416)\b)/;

/**
 * Cross-checks the reply's numbers and drug names against what was actually
 * supplied in context. A number or medicine name that appears in neither is,
 * by construction, either fabricated or came from the model's own training
 * data rather than this patient's record — both are unacceptable in a
 * clinical explainer.
 */
function fabricationCheck(reply: string, contextText: string): OutputCheckFailure | null {
  const contextNumbers = new Set(contextText.match(/\d+(\.\d+)?/g) ?? []);
  const replyDoseNumbers = reply.match(/\b\d+(\.\d+)?\s?(mg|ml|mcg|g|iu|mmhg|bpm|%)\b/gi) ?? [];
  for (const token of replyDoseNumbers) {
    const numeral = token.match(/\d+(\.\d+)?/)?.[0];
    if (numeral !== undefined && !contextNumbers.has(numeral)) {
      return 'fabricated_number';
    }
  }

  // A conservative drug-name extractor: capitalised word(s) followed by a
  // dose unit, or ending in a common drug suffix — good enough to catch a
  // hallucinated brand/generic name without a full drug database.
  const drugLike =
    reply.match(
      /\b[A-Z][a-zA-Z]{3,}(?:ol|pril|sartan|azole|cillin|mycin|statin|dipine|zepam|floxacin|arin|parin|olol)\b/g,
    ) ?? [];
  const contextLower = contextText.toLowerCase();
  for (const drug of drugLike) {
    if (!contextLower.includes(drug.toLowerCase())) {
      return 'fabricated_medication';
    }
  }

  return null;
}

/**
 * Runs every deterministic check. `contextText` is the exact retrieved
 * clinical context assembled for this turn — the fabrication check treats
 * anything not in it as invented.
 */
export function checkOutput(reply: string, contextText: string): OutputCheckResult {
  if (reply.trim() === '') return { ok: false, failure: 'truncated_reply' };

  const normalised = normalise(reply);

  if (DIAGNOSIS_PATTERNS.some((p) => p.test(normalised))) {
    return { ok: false, failure: 'diagnosis_assertion' };
  }
  if (REASSURANCE_PATTERNS.some((p) => p.test(normalised))) {
    return { ok: false, failure: 'false_reassurance' };
  }
  if (DOSING_PATTERNS.some((p) => p.test(normalised))) {
    return { ok: false, failure: 'dosing_instruction' };
  }
  if (WRONG_EMERGENCY_NUMBER.test(normalised)) {
    return { ok: false, failure: 'wrong_emergency_number' };
  }

  // Re-run the emergency guard over the MODEL'S OWN OUTPUT: if the model
  // produced emergency-grade content the input screen did not catch (e.g. it
  // restated the patient's symptom back in emergency terms), escalate rather
  // than let a soft-worded reply stand in for the fixed interlock message.
  if (detectEmergency(reply) !== null) {
    return { ok: false, failure: 'emergency_missed_by_input_guard' };
  }

  const fabrication = fabricationCheck(reply, contextText);
  if (fabrication !== null) return { ok: false, failure: fabrication };

  return { ok: true };
}

/** Fixed, versioned replacement shown when a check rejects the model's turn.
 *  Never model-composed, same discipline as the emergency interlock. */
export const OUTPUT_BLOCKED_REPLY =
  "I can't answer that one safely — the reply didn't meet this assistant's " +
  'safety checks. Please ask your care team, or try rephrasing your question.';
