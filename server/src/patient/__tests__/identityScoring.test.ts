import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Identity matching — scoring table tests
//
// patient.identity.service.ts's scoring logic is inline in findCandidates(),
// which itself is a database-querying function and not directly unit
// testable without a live DB. This file extracts and re-verifies the pure
// arithmetic — the threshold boundaries in particular — since a silent
// off-by-one at a threshold boundary (e.g. a score of exactly 60 landing in
// the wrong confidence tier) is exactly the kind of defect that would not
// surface until a real duplicate slipped through in production.
//
// Run with: npx tsx --test src/patient/__tests__/identityScoring.test.ts
// ─────────────────────────────────────────────────────────────────────────────

const SCORE = {
  abhaExact: 100,
  mobileExact: 55,
  nameExact: 25,
  dobExact: 20,
  dobNear: 8,
  genderMatch: 5,
} as const;

function confidenceForScore(score: number): 'strong' | 'moderate' | 'weak' | 'none' {
  if (score >= 100) return 'strong';
  if (score >= 60) return 'moderate';
  if (score >= 35) return 'weak';
  return 'none';
}

describe('confidence thresholds', () => {
  test('ABHA exact match alone reaches strong', () => {
    assert.equal(confidenceForScore(SCORE.abhaExact), 'strong');
  });

  test('mobile + name + DOB exact (55+25+20=100) reaches strong', () => {
    const score = SCORE.mobileExact + SCORE.nameExact + SCORE.dobExact;
    assert.equal(score, 100);
    assert.equal(confidenceForScore(score), 'strong');
  });

  test('mobile + name alone (55+25=80) is moderate, NOT strong', () => {
    const score = SCORE.mobileExact + SCORE.nameExact;
    assert.equal(score, 80);
    assert.equal(confidenceForScore(score), 'moderate');
  });

  test('mobile match alone (55) is weak, NOT moderate — below the 60 floor', () => {
    // Verified live against the running API during manual testing: a mobile-
    // only match with no other corroborating signal proceeds WITHOUT
    // requiring acknowledgement, returning the candidate for information
    // only. This was initially assumed (incorrectly) to be `moderate` when
    // reasoning about it verbally — writing this test caught the mistake
    // before it became a wrong assumption baked into documentation.
    assert.equal(confidenceForScore(SCORE.mobileExact), 'weak');
  });

  test('mobile + dob_near (55+8=63) DOES cross into moderate', () => {
    // This is the scenario that originally looked like "mobile alone is
    // moderate" in manual testing: two people sharing a phone number whose
    // DOBs happen to fall within the 2-year "near" window score high enough
    // together to require acknowledgement, even with completely different
    // names.
    const score = SCORE.mobileExact + SCORE.dobNear;
    assert.equal(score, 63);
    assert.equal(confidenceForScore(score), 'moderate');
  });

  test('name + DOB + gender (25+20+5=50) is weak', () => {
    const score = SCORE.nameExact + SCORE.dobExact + SCORE.genderMatch;
    assert.equal(score, 50);
    assert.equal(confidenceForScore(score), 'weak');
  });

  test('name exact alone (25) is below the weak floor -> none', () => {
    assert.equal(confidenceForScore(SCORE.nameExact), 'none');
  });

  test('boundary: exactly 60 is moderate, 59 is weak', () => {
    assert.equal(confidenceForScore(60), 'moderate');
    assert.equal(confidenceForScore(59), 'weak');
  });

  test('boundary: exactly 100 is strong, 99 is moderate', () => {
    assert.equal(confidenceForScore(100), 'strong');
    assert.equal(confidenceForScore(99), 'moderate');
  });

  test('boundary: exactly 35 is weak, 34 is none', () => {
    assert.equal(confidenceForScore(35), 'weak');
    assert.equal(confidenceForScore(34), 'none');
  });

  test('four independent exact matches (mobile+name+dob+gender) can ALSO reach strong, deliberately', () => {
    // This was discovered while writing this test, not designed up front —
    // it is documented in patient.identity.service.ts's header comment now.
    // No SINGLE signal other than ABHA reaches strong alone (mobile alone is
    // only 55 = weak; mobile+name is 80 = moderate); but four independent
    // exact corroborating matches together (55+25+20+5=105) legitimately
    // should count as strong too, since that combination is itself about as
    // certain as identity gets without a government ID.
    const allFourExact = SCORE.mobileExact + SCORE.nameExact + SCORE.dobExact + SCORE.genderMatch;
    assert.equal(allFourExact, 105);
    assert.equal(confidenceForScore(allFourExact), 'strong');

    // But mobile alone, or mobile+name alone, must NOT reach strong —
    // that is the actual invariant worth protecting.
    assert.equal(confidenceForScore(SCORE.mobileExact), 'weak');
    assert.equal(confidenceForScore(SCORE.mobileExact + SCORE.nameExact), 'moderate');
  });
});
