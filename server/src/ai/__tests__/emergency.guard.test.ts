import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectEmergency, emergencyReply } from '../safety/emergency.guard';

/**
 * The interlock's fixture corpus.
 *
 * Two asymmetric failure modes, and the tests are weighted accordingly:
 *  - a MISS (false negative) can cost a patient their brain;
 *  - a FALSE ALARM costs one dismissible message, but enough of them turn the
 *    emergency affordance into wallpaper, which this product explicitly
 *    refuses to ship.
 *
 * Note a deliberate deviation from the original design sketch: it proposed
 * putting the five BE-FAST labels ("Face drooping", "Arm weakness", …) in the
 * MUST-NOT-FIRE set. That is wrong. Those are labels on the Emergency page —
 * the guard never sees them, because it only ever runs on a message a user
 * typed. A user who types "arm weakness" into the assistant IS reporting a
 * symptom and must get the ambulance, not a chat. They are tested as
 * must-fire below.
 */

const MUST_FIRE: [string, string][] = [
  // BE-FAST, bare — no grammatical subject. The original design's
  // "present-subject required" rule would have missed every one of these.
  ['face drooping right now', 'stroke'],
  ['Face drooping', 'stroke'],
  ['Arm weakness', 'stroke'],
  ['Speech difficulty', 'stroke'],
  ['my face is drooping', 'stroke'],
  ['I cannot lift my arm', 'stroke'],
  ["can't find my words", 'stroke'],
  ['my speech is slurred', 'stroke'],
  ['suddenly lost vision in one eye', 'stroke'],
  ['sudden loss of balance', 'stroke'],
  ['worst headache of my life', 'stroke'],
  ['numbness on one side', 'stroke'],
  ['I think I am having a stroke', 'stroke'],

  // Third person — caregivers ask on the patient's behalf and must escalate.
  ["my husband can't speak", 'stroke'],
  ['his face is drooping', 'stroke'],
  ['she cannot move her arm', 'stroke'],

  // A real report buried after an ordinary question. Per-sentence evaluation
  // is what makes this fire on the second clause.
  ['what is clopidogrel for — also my face is drooping right now', 'stroke'],

  // Other acute emergencies.
  ['I have chest pain', 'medical'],
  ["I can't breathe", 'medical'],
  ['he is unconscious', 'medical'],
  ['she is having a seizure', 'medical'],
  ['the bleeding will not stop', 'medical'],
  ['seene mein dard ho raha hai', 'medical'],

  // Self-harm — post-stroke depression makes this non-optional.
  ['I want to kill myself', 'selfHarm'],
  ['I feel suicidal', 'selfHarm'],
  ['there is no point in living', 'selfHarm'],

  // ── v2 (emergency-2026-09-25) ─────────────────────────────────────────────
  // A negated clause must not hide the next one.
  ["I don't have chest pain but my face is drooping right now", 'stroke'],
  // History or recovery framing, overridden by an acute marker.
  ['since my stroke my arm is weak and today it went numb again', 'stroke'],
  ['my face is drooping again after physio', 'stroke'],
  ['I had chest pain yesterday and it started again', 'medical'],
  // Recovery framing never quiets the medical rules.
  ['during my exercises I got chest pain', 'medical'],
  ['I cannot walk', 'stroke'],
  // Active bleeding, newly caught.
  ['I am bleeding heavily', 'medical'],
  ['he is vomiting blood', 'medical'],
  ["the bleeding still won't stop", 'medical'],
  // Self-harm stays unsuppressed; "end my" fires on anything not administrative.
  ['I want to end my life', 'selfHarm'],
  ['I just want to end my suffering', 'selfHarm'],
  ['since my stroke I want to die', 'selfHarm'],
  ['I feel like ending my life', 'selfHarm'],
  ['I want to take my own life', 'selfHarm'],
  ["I don't want to live anymore", 'selfHarm'],
  ['I don\u2019t want to wake up tomorrow', 'selfHarm'],
  ['everyone would be better off dead without me', 'selfHarm'],
  ['I just want to end it', 'selfHarm'],
  ['life is not worth living', 'selfHarm'],
  ['there is no reason to live', 'selfHarm'],
  // Curly apostrophes, as phones type them.
  ['I can\u2019t lift my arm', 'stroke'],
];

const MUST_NOT_FIRE: string[] = [
  // Every suggested prompt the UI ships. If any of these fired, the feature
  // would greet a patient with an ambulance on first use.
  'What happened at my last visit?',
  'What is Clopidogrel for?',
  'What do my blood pressure readings mean?',
  'What should I ask at my next appointment?',

  // Educational / hypothetical framing.
  'what are the signs of a stroke',
  'what does face drooping mean',
  'how do I know if I am having a stroke',
  'is arm weakness a sign of something serious',
  'explain speech difficulty to me',
  'tell me about chest pain',
  'my doctor said I might get headaches',
  'I read that slurred speech can be a warning sign',

  // Negation.
  'I do not have chest pain',
  'I have not had any face drooping',
  'no arm weakness today',

  // Past / historical.
  'since my stroke my arm weakness has improved',
  'when I had my stroke my face was drooping',
  'last year I had trouble speaking',
  'in 2024 I lost my balance a lot',

  // Ordinary, non-urgent questions.
  'can I drink coffee with amlodipine',
  'when is my next physiotherapy session',
  'how much walking should I do each day',
  'what is my blood group',

  // ── v2 (emergency-2026-09-25) ─────────────────────────────────────────────
  // Where a recovering patient is, not a new event.
  "since my stroke I can't walk far",
  "I can't walk far without a stick",
  'my physiotherapist says my arm weakness is improving',
  'my arm has been weak for months',
  // Side-effect questions.
  'can clopidogrel cause heavy bleeding?',
  'is chest pain a side effect of amlodipine',
  // Recent history, no acute marker.
  '3 days ago I had chest pain for a few minutes',
  'yesterday my speech was slurred for a while',
  // Administrative "end my …".
  'I need to end my course of antibiotics',
  'can I end my physiotherapy sessions early',
  // Ordinary questions a patient asks about their record.
  'What was my LDL cholesterol in September?',
  'When is my next appointment?',
  'Show me my CT scan report',
];

describe('detectEmergency — must fire', () => {
  for (const [message, category] of MUST_FIRE) {
    it(`fires (${category}) on: ${message}`, () => {
      const hit = detectEmergency(message);
      assert.notEqual(hit, null, `MISSED an emergency: "${message}"`);
      assert.equal(hit?.category, category);
      assert.ok(hit?.ruleId, 'a rule id must be recorded for audit');
    });
  }
});

describe('detectEmergency — must not fire', () => {
  for (const message of MUST_NOT_FIRE) {
    it(`stays quiet on: ${message}`, () => {
      const hit = detectEmergency(message);
      assert.equal(
        hit,
        null,
        `FALSE ALARM on "${message}" (rule ${hit?.ruleId}) — alarm fatigue is a real cost`,
      );
    });
  }
});

describe('emergencyReply', () => {
  it('never asserts a diagnosis', () => {
    const reply = emergencyReply('stroke');
    // The schema's own rule: symptoms are reported, never rendered as
    // "patient has stroke".
    assert.ok(!/you are having a stroke/i.test(reply));
    assert.ok(/can be a sign/i.test(reply));
  });

  it('gives the Indian emergency number, never 911', () => {
    for (const c of ['stroke', 'medical', 'selfHarm'] as const) {
      const reply = emergencyReply(c);
      assert.ok(/\b108\b|\b14416\b/.test(reply), `${c} reply must route to 108/14416`);
      assert.ok(!/\b911\b/.test(reply), `${c} reply must not mention 911`);
    }
  });

  it('routes self-harm to Tele-MANAS as well as 108', () => {
    assert.ok(/14416/.test(emergencyReply('selfHarm')));
  });

  it('asks for symptom onset time, which gates thrombolysis', () => {
    assert.ok(/time your symptoms started/i.test(emergencyReply('stroke')));
  });
});
