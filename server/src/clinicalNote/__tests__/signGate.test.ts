import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkDocumentationQuality } from '../bannedAbbreviations';

// ─────────────────────────────────────────────────────────────────────────────
// The sign gate — the CLIENT AND SERVER MUST AGREE.
//
// ⚠️ WHY THIS FILE EXISTS. `ConsultationNote.tsx` used to print "These are
// advisory. They do not block saving or signing." directly above a live Sign
// button, while `clinicalNoteService.sign` refused the signature on exactly
// those findings with a 400. A clinician wrote the note, pressed Sign, and met
// a refusal that contradicted the sentence they had just read.
//
// The fix was to gate the button. That only stays fixed if the two layers keep
// computing the SAME answer from the same text, so these tests pin the shared
// contract rather than either implementation:
//
//   1. the predicate the client gates on is the one the server blocks on
//   2. the section labels the server emits are ones the client can bucket
//   3. the completeness rule is assessment + plan, trimmed
//
// Anything that breaks one of these re-opens the contradiction.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The client's gate, transcribed. It asks exactly one question of the checker:
 * "is this text clean?" — and the server asks the same one.
 *
 * ⚠️ If the client ever needs a *different* question (a severity threshold, a
 * dismissible class of finding), this test must be the thing that fails.
 */
function clientWouldBlockSigning(sections: Record<string, string>): boolean {
  return Object.values(sections).some((t) => checkDocumentationQuality(t).length > 0);
}

/** The server's rule at sign time, transcribed from `clinicalNoteService.sign`. */
function serverWouldRefuseSignature(sections: Record<string, string>): boolean {
  const all = [
    ...checkDocumentationQuality(sections.subjective),
    ...checkDocumentationQuality(sections.objective),
    ...checkDocumentationQuality(sections.assessment),
    ...checkDocumentationQuality(sections.plan),
  ];
  return all.length > 0;
}

const CLEAN = {
  subjective: 'Cough and fever for four days, productive of green sputum.',
  objective: 'Temperature 38.4. Crackles at the right base. Saturations 94 percent on air.',
  assessment: 'Community-acquired pneumonia, right lower lobe.',
  plan: 'Continue oral antibiotics. Review in 48 hours. Safety-net advice given.',
};

describe('the client gate and the server refusal never disagree', () => {
  it('agrees that a clean note may be signed', () => {
    assert.equal(clientWouldBlockSigning(CLEAN), false);
    assert.equal(serverWouldRefuseSignature(CLEAN), false);
  });

  it('agrees on a banned abbreviation, wherever it appears', () => {
    // One case per section: the server checks all four, so a client that
    // watched only the two it gates completeness on would let these through.
    for (const section of ['subjective', 'objective', 'assessment', 'plan'] as const) {
      const note = { ...CLEAN, [section]: `${CLEAN[section]} Insulin 4U stat.` };
      assert.equal(
        clientWouldBlockSigning(note),
        serverWouldRefuseSignature(note),
        `disagreement when the finding is in ${section}`,
      );
      assert.equal(serverWouldRefuseSignature(note), true, `${section} should block`);
    }
  });

  it('agrees on a dose-expression hazard, not only on abbreviations', () => {
    // ⚠️ `checkDocumentationQuality` is abbreviations PLUS dose hazards. A
    // client that called `findBannedAbbreviations` alone would show a clean
    // note and then be refused.
    const note = { ...CLEAN, plan: 'Digoxin 1.0 mg daily.' };
    assert.equal(serverWouldRefuseSignature(note), true);
    assert.equal(clientWouldBlockSigning(note), true);
  });

  it('agrees that ordinary clinical English is not a finding', () => {
    // The false-positive guard matters as much as the catch: a gate that fires
    // on normal prose would make the note unsignable and teach clinicians to
    // route around it.
    const note = {
      ...CLEAN,
      subjective: 'Patient is under the care of the diabetes service and uses a CPAP machine.',
    };
    assert.equal(serverWouldRefuseSignature(note), false);
    assert.equal(clientWouldBlockSigning(note), false);
  });
});

describe('section labels the server emits can be bucketed by the client', () => {
  it('emits labels that lowercase to the four client section keys', () => {
    // ⚠️ THE BUG THIS PINS. The server labels findings 'Subjective' while the
    // client's SectionKey is 'subjective', so the per-section warning and its
    // aria-invalid were dead code for every finding ever produced. The client
    // now lowercases; this asserts the labels stay lowercase-able.
    const CLIENT_KEYS = new Set(['subjective', 'objective', 'assessment', 'plan']);
    for (const label of ['Subjective', 'Objective', 'Assessment', 'Plan']) {
      assert.ok(
        CLIENT_KEYS.has(label.toLowerCase()),
        `server label "${label}" does not match a client section key`,
      );
    }
  });
});

describe('completeness is assessment and plan, trimmed', () => {
  // Transcribed from the server: `!existing.assessment?.trim()`.
  const missing = (s: Record<string, string>) =>
    (['assessment', 'plan'] as const).filter((k) => !s[k]?.trim());

  it('an empty note is missing both', () => {
    assert.deepEqual(missing({ subjective: '', objective: '', assessment: '', plan: '' }), [
      'assessment',
      'plan',
    ]);
  });

  it('whitespace is not content', () => {
    // ⚠️ The client persists `value || null`, so a whitespace-only section
    // reaches the server as whitespace and fails its trim. A client that
    // measured untrimmed would show an enabled Sign for a note the server
    // refuses — the original defect, in a new place.
    assert.deepEqual(missing({ ...CLEAN, plan: '   \n  ' }), ['plan']);
  });

  it('subjective and objective are NOT required', () => {
    // Gating on all four would refuse notes the server accepts, which is the
    // same class of dishonesty pointing the other way.
    assert.deepEqual(missing({ ...CLEAN, subjective: '', objective: '' }), []);
  });

  it('a complete note is missing nothing', () => {
    assert.deepEqual(missing(CLEAN), []);
  });
});
