import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseAllergens,
  checkAllergy,
  checkDose,
  canSign,
  type SafetyRule,
  type DoseBand,
} from '../drugSafety';

// ─────────────────────────────────────────────────────────────────────────────
// The deterministic hard stop.
//
// ⚠️ Note what this file does NOT import: no Prisma, no app, no AI client, no
// env. If these tests pass, the hard stop provably works with every model off
// and the database unreachable — which is exactly the property UI_ATLAS §4.2
// requires ("safety never depends on the model being up") and the single most
// important thing to be able to prove about this product.
// ─────────────────────────────────────────────────────────────────────────────

/** Seeded from UI_ATLAS §8.5's fixed allergy and drug vocabulary. */
const RULES: SafetyRule[] = [
  {
    allergenKey: 'penicillin',
    blocksClass: 'Penicillin',
    rationale:
      'Documented penicillin allergy. Beta-lactam antibiotics share the core structure and carry a risk of cross-reactivity.',
  },
  {
    allergenKey: 'sulfa',
    blocksClass: 'Sulfonamide',
    rationale: 'Documented sulfa allergy.',
  },
  {
    allergenKey: 'iodinated contrast',
    blocksClass: 'IodinatedContrast',
    rationale: 'Documented contrast reaction.',
  },
];

const CO_AMOXICLAV = { genericName: 'Co-amoxiclav', allergenClass: 'Penicillin' };
const PIP_TAZO = { genericName: 'Piperacillin-tazobactam', allergenClass: 'Penicillin' };
const AZITHROMYCIN = { genericName: 'Azithromycin', allergenClass: 'Macrolide' };
const PARACETAMOL = { genericName: 'Paracetamol', allergenClass: null };

describe('normaliseAllergens', () => {
  it('splits a delimited free-text list', () => {
    assert.deepEqual(normaliseAllergens('Penicillin, Sulfa'), ['penicillin', 'sulfa']);
    assert.deepEqual(normaliseAllergens('Penicillin; Iodinated contrast'), [
      'penicillin',
      'iodinated contrast',
    ]);
  });

  it('treats "none"-like text as no allergies, not as an allergen', () => {
    // Regression guard: naive splitting makes "NKDA" an allergen called
    // "nkda", which then matches nothing and silently disables the check.
    for (const text of ['None', 'NKDA', 'nil', 'No known allergies', 'N/A', '']) {
      assert.deepEqual(normaliseAllergens(text), [], `"${text}" should yield no allergens`);
    }
  });

  it('handles null and undefined', () => {
    assert.deepEqual(normaliseAllergens(null), []);
    assert.deepEqual(normaliseAllergens(undefined), []);
  });
});

describe('checkAllergy — the hard stop', () => {
  it('BLOCKS co-amoxiclav for a penicillin-allergic patient (SD-P-03, deck beat #8)', () => {
    const hit = checkAllergy(normaliseAllergens('Penicillin'), CO_AMOXICLAV, RULES);

    assert.notEqual(hit, null, 'the hard stop must fire');
    assert.equal(hit?.drugName, 'Co-amoxiclav');
    assert.equal(hit?.allergenKey, 'penicillin');
    assert.match(hit.rationale, /penicillin/i);
  });

  it('BLOCKS piperacillin-tazobactam too — beta-lactam cross-reactivity', () => {
    // The clinically important case. Both §8.5 antibiotics are beta-lactams,
    // so a penicillin allergy must stop BOTH. A rule set that only knew the
    // exact drug name would let this one through.
    const hit = checkAllergy(normaliseAllergens('Penicillin'), PIP_TAZO, RULES);
    assert.notEqual(hit, null, 'cross-reactive beta-lactam must also be blocked');
    assert.equal(hit?.blocksClass, 'Penicillin');
  });

  it('ALLOWS a non-beta-lactam alternative for the same patient', () => {
    assert.equal(checkAllergy(normaliseAllergens('Penicillin'), AZITHROMYCIN, RULES), null);
  });

  it('allows any drug for a patient with no documented allergy', () => {
    assert.equal(checkAllergy([], CO_AMOXICLAV, RULES), null);
    assert.equal(checkAllergy(normaliseAllergens('NKDA'), CO_AMOXICLAV, RULES), null);
  });

  it('allows a drug that belongs to no allergen class', () => {
    assert.equal(checkAllergy(normaliseAllergens('Penicillin'), PARACETAMOL, RULES), null);
  });

  it('matches free text that surrounds the allergen name', () => {
    // A clinician types "Penicillin allergy - rash", not a controlled term.
    const hit = checkAllergy(normaliseAllergens('penicillin allergy - rash'), CO_AMOXICLAV, RULES);
    assert.notEqual(hit, null, 'surrounding free text must not defeat the match');
  });

  it('is case-insensitive in both directions', () => {
    assert.notEqual(checkAllergy(['PENICILLIN'], CO_AMOXICLAV, RULES), null);
    assert.notEqual(
      checkAllergy(['penicillin'], { genericName: 'X', allergenClass: 'PENICILLIN' }, RULES),
      null,
    );
  });

  it('does not block on an unrelated allergy', () => {
    assert.equal(checkAllergy(normaliseAllergens('Sulfa'), CO_AMOXICLAV, RULES), null);
  });
});

describe('canSign', () => {
  it('permits signing with no hits and refuses with any', () => {
    assert.equal(canSign([]), true);
    assert.equal(
      canSign([
        {
          drugName: 'Co-amoxiclav',
          allergenKey: 'penicillin',
          blocksClass: 'Penicillin',
          rationale: 'x',
        },
      ]),
      false,
    );
  });
});

describe('checkDose', () => {
  const adult: DoseBand = {
    cohort: 'Adult',
    minDose: 500,
    maxDose: 1000,
    unit: 'mg',
    perKg: false,
    maxPerDay: 4000,
  };
  const paediatric: DoseBand = {
    cohort: 'Paediatric',
    minDose: 10,
    maxDose: 15,
    unit: 'mg',
    perKg: true,
    maxPerDay: null,
  };

  it('accepts a dose inside the band, including both boundaries', () => {
    assert.equal(checkDose(750, 'mg', adult).status, 'ok');
    assert.equal(checkDose(500, 'mg', adult).status, 'ok', 'lower bound is inclusive');
    assert.equal(checkDose(1000, 'mg', adult).status, 'ok', 'upper bound is inclusive');
  });

  it('flags a dose below and above the band', () => {
    assert.equal(checkDose(100, 'mg', adult).status, 'below');
    assert.equal(checkDose(4000, 'mg', adult).status, 'above');
  });

  it('scales a paediatric band by weight', () => {
    // 12 mg/kg × 20 kg = 240 mg, inside 200–300.
    assert.equal(checkDose(240, 'mg', paediatric, 20).status, 'ok');
    assert.equal(checkDose(500, 'mg', paediatric, 20).status, 'above');
  });

  it('reports UNKNOWN rather than ok when a per-kg drug has no weight', () => {
    // ⚠️ The distinction that matters: "could not check" must never be
    // reported as "checked and safe".
    const verdict = checkDose(240, 'mg', paediatric, null);
    assert.equal(verdict.status, 'unknown');
    assert.match((verdict as { message: string }).message, /weight/i);
  });

  it('reports UNKNOWN when no band exists', () => {
    assert.equal(checkDose(240, 'mg', null).status, 'unknown');
  });

  it('refuses to compare mismatched units', () => {
    const verdict = checkDose(1, 'g', adult);
    assert.equal(verdict.status, 'unknown');
    assert.match((verdict as { message: string }).message, /cannot compare/i);
  });
});

describe('normaliseAllergens — real clinician free text', () => {
  it('strips a parenthetical qualifier rather than splitting on its comma', () => {
    // ⚠️ This is the exact string the demo record holds. Without stripping,
    // the internal comma produced ["penicillin (documented — anaphylaxis",
    // "2019)"] — which still matched, but displayed as nonsense.
    assert.deepEqual(
      normaliseAllergens('Penicillin (documented — anaphylaxis, 2019)'),
      ['penicillin'],
    );
  });

  it('strips square-bracketed qualifiers too', () => {
    assert.deepEqual(normaliseAllergens('Sulfa [rash]'), ['sulfa']);
  });

  it('still blocks correctly after stripping', () => {
    const hit = checkAllergy(
      normaliseAllergens('Penicillin (documented — anaphylaxis, 2019)'),
      CO_AMOXICLAV,
      RULES,
    );
    assert.notEqual(hit, null);
  });
});
