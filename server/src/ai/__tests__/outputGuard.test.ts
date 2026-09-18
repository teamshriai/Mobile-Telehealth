import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkOutput } from '../safety/outputGuard';

const CONTEXT =
  'Medicines: Clopidogrel 75mg once daily; Atorvastatin 40mg at night; Amlodipine 5mg once daily. ' +
  'Blood pressure recorded: 138/86 mmHg. Known allergies: Penicillin (rash).';

describe('checkOutput — must reject', () => {
  it('rejects a diagnosis assertion', () => {
    const r = checkOutput('Based on what you describe, you have had a stroke.', CONTEXT);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'diagnosis_assertion');
  });

  it('rejects false reassurance', () => {
    const r = checkOutput(
      'Do not worry, you are completely fine, nothing to worry about.',
      CONTEXT,
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'false_reassurance');
  });

  it('rejects a dosing instruction', () => {
    const r = checkOutput('You should take 150mg of Clopidogrel instead.', CONTEXT);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'dosing_instruction');
  });

  it('rejects the wrong emergency number', () => {
    const r = checkOutput('This sounds urgent — please call 911 immediately.', CONTEXT);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'wrong_emergency_number');
  });

  it('re-escalates emergency-grade content the input guard missed', () => {
    const r = checkOutput(
      'It sounds like your face is drooping and your speech is slurred.',
      CONTEXT,
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'emergency_missed_by_input_guard');
  });

  it('rejects a hallucinated medication not in context', () => {
    // Warfarin never appears in this patient's medication list.
    const r = checkOutput(
      'Warfarin is a blood thinner that is commonly prescribed after a stroke.',
      CONTEXT,
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'fabricated_medication');
  });

  it('rejects a fabricated numeric result not in context', () => {
    const r = checkOutput('Your blood pressure reading of 210 mmHg is very high.', CONTEXT);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'fabricated_number');
  });

  it('rejects an empty / truncated reply', () => {
    const r = checkOutput('   ', CONTEXT);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.failure, 'truncated_reply');
  });
});

describe('checkOutput — must pass', () => {
  it('accepts a plain explanation grounded in context', () => {
    const r = checkOutput(
      'Clopidogrel is a blood-thinning medicine often prescribed after a stroke to help ' +
        'prevent clots. Your record shows you take 75mg of it once daily. Your prescribing ' +
        'doctor is the right person to ask before changing how or when you take it.',
      CONTEXT,
    );
    assert.deepEqual(r, { ok: true });
  });

  it('accepts a reply that correctly names 108 for an emergency referral', () => {
    const r = checkOutput(
      'If you ever notice sudden new weakness, call 108 right away rather than waiting.',
      CONTEXT,
    );
    assert.deepEqual(r, { ok: true });
  });

  it('accepts a number that is actually present in context', () => {
    const r = checkOutput('Your last recorded blood pressure was 138/86 mmHg.', CONTEXT);
    assert.deepEqual(r, { ok: true });
  });
});
