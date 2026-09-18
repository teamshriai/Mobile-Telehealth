/**
 * Deterministic emergency interlock.
 *
 * Runs BEFORE the data-policy gate, before the budget check and before any
 * provider call. It is pure and local: no I/O, no tokens, no network. Nothing
 * — not a rate limit, not an outage, not a jailbreak — can delay or skip it.
 *
 * Safety in a stroke product cannot depend on a language model behaving
 * correctly. A model that is throttled, slow, offline, or simply wrong becomes
 * a patient-safety failure at the worst possible moment, so the escalation
 * path is a pattern match that runs first and short-circuits.
 *
 * Bias: when in doubt, FIRE. A false positive costs one dismissible alert. A
 * false negative costs a brain. The suppression rules below exist only to stop
 * the obvious non-emergencies (asking what a symptom *is*, describing a past
 * episode), because this app's whole purpose is letting people ask about
 * stroke symptoms — an interlock that fires on every such question would be
 * alarm wallpaper, which the product explicitly refuses to ship.
 */

/** Bumped whenever the rules below change, and stored on the turn. */
export const SAFETY_RULE_VERSION = 'emergency-2026-09-18';

export type EmergencyCategory = 'stroke' | 'medical' | 'selfHarm';

export type EmergencyMatch = {
  category: EmergencyCategory;
  /** Rule id only. The matched text is PHI and is never logged or stored. */
  ruleId: string;
  ruleVersion: string;
};

/**
 * Acute stroke language. Matched as phrases, deliberately without requiring a
 * grammatical subject: "face drooping right now" has no first-person marker
 * and must still fire, as must a caregiver's "my husband can't speak".
 */
const STROKE_RULES: { id: string; patterns: RegExp[] }[] = [
  {
    id: 'befast.face',
    patterns: [
      /\bface (is )?(droop|drooping|dropping|numb|paralys)/,
      /\b(one|left|right) side of (my|his|her|their|the) face\b/,
      /\bmouth (is )?(droop|drooping|crooked|twisted)/,
    ],
  },
  {
    id: 'befast.arm',
    patterns: [
      /\barm (is )?(weak|weakness|numb|heavy|limp|dead)\b/,
      /\b(can'?t|cannot|unable to) (lift|raise|move|feel) (my|his|her|their|the) (arm|hand|leg)\b/,
      /\b(arm|leg) (went|going|has gone) numb\b/,
      /\bnumb(ness)? (on|down) (one|the left|the right) side\b/,
      /\b(one|left|right) side (is|feels|has gone) (weak|numb|paralys)/,
    ],
  },
  {
    id: 'befast.speech',
    patterns: [
      /\bslurr(ed|ing) (my )?(speech|words)\b/,
      /\bspeech (is )?(slurred|slurring|strange|gone|difficult|difficulty)\b/,
      /\bdifficulty (speaking|with speech|talking)\b/,
      /\b(can'?t|cannot|unable to) (speak|talk|get (my )?words out)\b/,
      /\b(can'?t|cannot) find (my|his|her|the) words\b/,
      /\bwords (are )?(not )?com(e|ing) out (wrong|right)?\b/,
    ],
  },
  {
    id: 'befast.eyes',
    patterns: [
      /\bsudden(ly)? (lost|loss of|blurred|double) vision\b/,
      /\b(lost|losing) (my )?(vision|sight)\b/,
      /\bcan'?t see (out of|from)\b/,
      /\bsudden(ly)? (can'?t|cannot) see\b/,
    ],
  },
  {
    id: 'befast.balance',
    patterns: [
      /\bsudden(ly)? (lost|loss of) balance\b/,
      /\b(can'?t|cannot|unable to) (walk|stand|stay upright)\b/,
      /\b(keep )?(falling|collaps(ed|ing)) over\b/,
    ],
  },
  {
    id: 'befast.headache',
    patterns: [
      /\bworst headache\b/,
      /\bsudden(ly)? (severe|terrible|blinding|thunderclap) headache\b/,
      /\bthunderclap\b/,
    ],
  },
  {
    id: 'stroke.explicit',
    patterns: [
      /\b(having|have|had) a stroke (right )?now\b/,
      /\bi think (i|he|she|they|my \w+) (am|is|are)? ?having a stroke\b/,
      /\bstroke (is )?happening\b/,
    ],
  },
];

/** Non-stroke emergencies a stroke patient plausibly reports here. */
const MEDICAL_RULES: { id: string; patterns: RegExp[] }[] = [
  {
    id: 'acute.chest',
    patterns: [
      /\bchest pain\b/,
      /\bcrushing (pain|chest)\b/,
      /\bpain in (my|his|her) chest\b/,
      /\bseene mein dard\b/,
    ],
  },
  {
    id: 'acute.breathing',
    patterns: [
      /\b(can'?t|cannot|struggling to|trouble) breath(e|ing)\b/,
      /\bshort(ness)? of breath\b/,
      /\bsaans (nahi|nhi)\b/,
    ],
  },
  {
    id: 'acute.consciousness',
    patterns: [
      /\b(unconscious|unresponsive|passed out|blacked out|fainted|collapsed)\b/,
      /\bwon'?t wake up\b/,
      /\bbehosh\b/,
    ],
  },
  { id: 'acute.seizure', patterns: [/\b(seizure|fitting|convulsion|convulsing)\b/] },
  {
    id: 'acute.bleeding',
    patterns: [/\bbleeding (won'?t|will not|doesn'?t) stop\b/, /\bheavy bleeding\b/],
  },
];

/**
 * Post-stroke depression is common enough that omitting this would be a
 * glaring gap. Routed to the same interlock with different copy.
 */
const SELF_HARM_RULES: { id: string; patterns: RegExp[] }[] = [
  {
    id: 'selfharm.intent',
    patterns: [
      /\b(kill|killing) myself\b/,
      /\bsuicid(e|al)\b/,
      /\bend (my|it all|my life)\b/,
      /\b(want|going) to die\b/,
      /\bno (point|reason) (in )?(living|going on)\b/,
      /\bharm myself\b/,
      /\bhurt myself\b/,
    ],
  },
];

/**
 * Sentences that are ASKING ABOUT a symptom rather than reporting one.
 * This is the only suppression family, and it deliberately does NOT include
 * any grammatical-subject requirement — requiring "I am" would have missed
 * "face drooping right now", which is exactly the message that must fire.
 */
const SUPPRESSORS: RegExp[] = [
  // Hypothetical / reference / educational framing
  /\bwhat (is|are|does|do)\b/,
  /\bwhat'?s\b/,
  /\bhow (do|would|can) i (know|tell)\b/,
  /\bis (that|this|it) a sign\b/,
  /\bsigns? of\b/,
  /\bsymptoms? of\b/,
  /\bwhy (does|do|is)\b/,
  /\bmeaning of\b/,
  /\bwhat should i (ask|do if)\b/,
  /\bexplain\b/,
  /\btell me about\b/,
  /\bdefine\b/,
  /\bmy doctor said\b/,
  /\bi read\b/,
  /\bi was told\b/,
  // Negation — two shapes, both narrower than a blanket "no|not", which
  // over-suppressed: "the bleeding will NOT STOP" is itself the emergency
  // phrase (the symptom IS the inability to stop), not a negated symptom.
  //   (a) "no <word> weakness/numbness/drooping/..." — negates a symptom noun.
  /\bno\s+\w*\s?(weakness|numbness|drooping|difficulty|trouble|problem)\b/,
  //   (b) "not/never/don't have/had/felt/noticed/experienced any <symptom>" —
  //       negates having experienced it, distinct from "will not stop".
  /\b(no|not|never|don'?t|doesn'?t|didn'?t|haven'?t|hasn'?t|isn'?t|wasn'?t) (have|having|had|felt|feel|noticed|experienced|seen|any)\b/,
  /\bwithout any\b/,
  // Past / historical
  /\bsince my stroke\b/,
  /\bafter my stroke\b/,
  /\bwhen i had\b/,
  /\blast (year|month|week|time)\b/,
  /\bin \d{4}\b/,
  /\bused to\b/,
  /\bat the time\b/,
  /\bback then\b/,
];

/** Lowercase, fold punctuation, collapse space. NFKC so unicode look-alikes
 *  cannot slip a phrase past the matcher. */
function normalise(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split on sentence-ish boundaries BEFORE punctuation is folded away, so
 *  "what is clopidogrel — also my face is drooping" is judged as two clauses
 *  and the second one still fires. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\s+[—–-]{1,2}\s+|\n+/u)
    .map((s) => normalise(s))
    .filter((s) => s.length > 0);
}

function anyMatch(rules: { id: string; patterns: RegExp[] }[], s: string): string | null {
  for (const rule of rules) {
    for (const p of rule.patterns) if (p.test(s)) return rule.id;
  }
  return null;
}

/**
 * Returns the first emergency match, or null.
 *
 * Self-harm is checked without suppression: "I want to die" inside an
 * otherwise discursive sentence is not a hypothetical worth filtering, and the
 * cost of a false negative here is the same as for stroke.
 */
export function detectEmergency(message: string): EmergencyMatch | null {
  const whole = normalise(message);
  const parts = sentences(message);
  // Evaluate the whole message too: a bare phrase with no sentence structure
  // ("face drooping right now") must be seen even if splitting yields oddly.
  const candidates = parts.length > 0 ? [...parts, whole] : [whole];

  for (const s of candidates) {
    const selfHarm = anyMatch(SELF_HARM_RULES, s);
    if (selfHarm !== null) {
      return { category: 'selfHarm', ruleId: selfHarm, ruleVersion: SAFETY_RULE_VERSION };
    }
  }

  for (const s of candidates) {
    if (SUPPRESSORS.some((p) => p.test(s))) continue;

    const stroke = anyMatch(STROKE_RULES, s);
    if (stroke !== null) {
      return { category: 'stroke', ruleId: stroke, ruleVersion: SAFETY_RULE_VERSION };
    }
    const medical = anyMatch(MEDICAL_RULES, s);
    if (medical !== null) {
      return { category: 'medical', ruleId: medical, ruleVersion: SAFETY_RULE_VERSION };
    }
  }

  return null;
}

/**
 * Fixed, versioned replies. Never model-composed.
 *
 * The wording obeys the schema's own rule that symptoms are never rendered as
 * "you are having a stroke" — only as something that *can be* a sign. Stating
 * a diagnosis would be both clinically wrong and the exact failure mode this
 * codebase removed a previous assistant for.
 */
export function emergencyReply(category: EmergencyCategory): string {
  switch (category) {
    case 'stroke':
      return (
        'Some of what you have described can be a sign of a stroke. I cannot tell you ' +
        'whether it is — but this needs an ambulance, not a chat.\n\n' +
        'Call 108 now.\n\n' +
        'Note the time your symptoms started. Your care team will need it, because it ' +
        'decides which treatments are still possible.'
      );
    case 'medical':
      return (
        'What you have described needs urgent medical help, not a chat.\n\n' +
        'Call 108 now.\n\n' +
        'If someone is with you, ask them to stay until help arrives.'
      );
    case 'selfHarm':
      return (
        'I am sorry you are feeling this way, and I am not the right kind of help for it.\n\n' +
        'Please talk to someone now — Tele-MANAS on 14416 (free, 24 hours), or 108 if ' +
        'you are in immediate danger.\n\n' +
        'Your care team can help with this too. Feeling low after a stroke is common ' +
        'and it is treatable.'
      );
  }
}
