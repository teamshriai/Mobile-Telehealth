import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findBannedAbbreviations,
  findDoseExpressionHazards,
  checkDocumentationQuality,
} from '../bannedAbbreviations';

// ─────────────────────────────────────────────────────────────────────────────
// CMP-NABH-05.
//
// ⚠️ The hard part of this rule is NOT catching the abbreviations — it is not
// firing on ordinary English. A check that flags every second sentence gets
// dismissed reflexively, and a dismissed check protects nobody. Roughly half
// the cases below are false-positive guards for exactly that reason.
// ─────────────────────────────────────────────────────────────────────────────

describe('findBannedAbbreviations — catches what it must', () => {
  it('flags "U" for units — the classic tenfold insulin error', () => {
    const found = findBannedAbbreviations('Insulin 4U stat');
    assert.equal(found.length, 1);
    assert.equal(found[0].term, 'U');
    assert.match(found[0].risk, /zero|four/i);
    assert.equal(found[0].useInstead, 'unit');
  });

  it('flags QD, QOD and OD', () => {
    assert.equal(findBannedAbbreviations('Atorvastatin 40mg QD')[0]?.term, 'QD');
    assert.equal(findBannedAbbreviations('Enoxaparin QOD')[0]?.term, 'QOD');
    assert.equal(findBannedAbbreviations('Metformin 500mg OD')[0]?.term, 'OD');
  });

  it('flags MS, which means two entirely different drugs', () => {
    const found = findBannedAbbreviations('Given MS for pain');
    assert.equal(found[0]?.term, 'MS');
    assert.match(found[0].risk, /morphine|magnesium/i);
  });

  it('flags cc, read as "00"', () => {
    assert.equal(findBannedAbbreviations('500 cc normal saline')[0]?.term, 'cc');
  });

  it('flags D/C, which means both discharge and discontinue', () => {
    assert.equal(findBannedAbbreviations('Plan: D/C today')[0]?.term, 'D/C');
  });

  it('reports the position so the UI can point at it', () => {
    const found = findBannedAbbreviations('Patient stable. Insulin 4U given.');
    assert.ok(found[0].index > 0);
  });

  it('finds several distinct hazards in one note, in reading order', () => {
    const found = findBannedAbbreviations('Insulin 4U QD, then 500 cc saline');
    assert.deepEqual(
      found.map((f) => f.term),
      ['U', 'QD', 'cc'],
    );
  });
});

describe('findBannedAbbreviations — does NOT fire on ordinary prose', () => {
  // ⚠️ Each of these is a real sentence a clinician would plausibly write.
  const safe: Array<[string, string]> = [
    ['USUAL does not contain a bare U', 'Patient reports his usual exercise tolerance.'],
    ['lower-case "as" is a conjunction, not an ear', 'Reviewed as planned, no change.'],
    ['lower-case "us" / "ad" inside words', 'We discussed additional advice with the family.'],
    ['"discuss" contains sc but is not subcutaneous', 'Will discuss with the family tomorrow.'],
    ['"HStory" style concatenations', 'History of hypertension.'],
    ['"scan" contains sc', 'NCCT head scan reported as normal.'],
    ['"mode" contains od', 'Mode of arrival was by ambulance.'],
    ['"items" contains MS only in upper case', 'Reviewed all items on the problem list.'],
    ['empty text', ''],
  ];

  for (const [label, text] of safe) {
    it(`stays quiet: ${label}`, () => {
      assert.deepEqual(findBannedAbbreviations(text), [], `false positive on: "${text}"`);
    });
  }

  it('handles null and undefined', () => {
    assert.deepEqual(findBannedAbbreviations(null), []);
    assert.deepEqual(findBannedAbbreviations(undefined), []);
  });
});

describe('findDoseExpressionHazards', () => {
  it('flags a trailing zero — "1.0 mg" read as 10 mg', () => {
    const found = findDoseExpressionHazards('Give 1.0 mg IV');
    assert.equal(found.length, 1);
    assert.match(found[0].risk, /tenfold/i);
  });

  it('flags a missing leading zero — ".5 mg" read as 5 mg', () => {
    const found = findDoseExpressionHazards('Give .5 mg IV');
    assert.equal(found.length, 1);
    assert.match(found[0].risk, /leading zero/i);
  });

  it('accepts a correctly written dose', () => {
    assert.deepEqual(findDoseExpressionHazards('Give 0.5 mg IV'), []);
    assert.deepEqual(findDoseExpressionHazards('Give 1 mg IV'), []);
    assert.deepEqual(findDoseExpressionHazards('Atorvastatin 40mg at night'), []);
  });

  it('does not flag a decimal that is not a dose', () => {
    assert.deepEqual(findDoseExpressionHazards('Temperature 37.0 degrees'), []);
  });
});

describe('checkDocumentationQuality', () => {
  it('combines both rule families in reading order', () => {
    const found = checkDocumentationQuality('Insulin 4U, then 1.0 mg morphine QD');
    const terms = found.map((f) => f.term);
    assert.ok(terms.includes('U'));
    assert.ok(terms.includes('QD'));
    assert.ok(terms.some((t) => t.includes('1.0')));
    // Sorted by position in the text.
    const indexes = found.map((f) => f.index);
    assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
  });

  it('passes a well-written note', () => {
    assert.deepEqual(
      checkDocumentationQuality(
        'Patient reviewed. Chest clear. Continue co-amoxiclav 1.2 g intravenously three times a day.',
      ),
      [],
    );
  });
});
