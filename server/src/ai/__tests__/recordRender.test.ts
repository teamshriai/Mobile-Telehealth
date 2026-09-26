import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderRecord, SECTIONS } from '../context/recordRender';
import type { RecordData } from '../context/recordData';
import { scrubIdentifiers, todayLine, istDate } from '../context/format';
import { selectContext } from '../memory/retrieval';
import { routeQuestion, questionTerms } from '../memory/questionRouter';
import { budgetDeferredReply } from '../replies';

const NOW = new Date('2026-09-25T08:35:00Z'); // 14:05 IST
const at = (iso: string): Date => new Date(iso);
const ID = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function fixture(): RecordData {
  return {
    now: NOW,
    patientId: ID(1),
    isSyntheticData: true,
    profile: {
      id: ID(1),
      updatedAt: at('2026-09-01T00:00:00Z'),
      firstName: 'Meenakshi',
      dateOfBirth: at('1969-11-03T00:00:00Z'),
      gender: 'Female',
      bloodGroup: 'B_Positive',
      allergies: 'Penicillin (rash)',
      selfListedMedicines: null,
      existingDiseases: null,
      familyHistory: null,
      previousSurgeries: null,
      smoking: 'Never',
      alcohol: null,
      tobacco: null,
      activity: 'Light',
    },
    conditions: [
      {
        id: ID(2),
        code: 'I63.9',
        title: 'Cerebral infarction, unspecified',
        status: 'Active',
        onsetDate: at('2026-06-25T00:00:00Z'),
        resolvedAt: null,
        recordedAt: at('2026-06-25T04:00:00Z'),
      },
    ],
    medicines: null,
    appointments: [
      {
        id: ID(3),
        scheduledAt: at('2026-09-29T05:00:00Z'),
        mode: 'InPerson',
        status: 'Confirmed',
        reason: 'Rehabilitation review',
        locationName: 'IndoStates Health Hospital, Coimbatore',
        doctor: { name: 'Dr Karthik Raja', specialty: 'Rehabilitation Medicine', hospital: null },
        updatedAt: NOW,
      },
    ],
    careTeam: [],
    visits: [
      {
        id: ID(4),
        visitId: 'ENC-R05EX7-Y',
        type: 'Emergency',
        startedAt: at('2026-06-25T02:10:00Z'),
        location: 'Emergency',
        reason: 'Sudden right-sided weakness',
        seenBy: ['Dr. Ananya Iyer'],
        diagnoses: ['Cerebral infarction, unspecified (I63.9)'],
        medicines: [],
        instructions: [],
        symptomsReported: ['arm weakness', 'speech difficulty'],
        lastKnownWell: null,
        assessment: 'Acute ischaemic stroke, left MCA territory.',
        plan: 'Thrombolysis. Stroke unit admission.',
        amended: true,
        updatedAt: NOW,
      },
    ],
    labs: [
      {
        id: ID(5),
        reportNumber: 'LAB/1',
        panelName: 'Lipid profile',
        specimen: 'Serum',
        fasting: true,
        collectedAt: at('2026-09-10T02:10:00Z'),
        reportedAt: at('2026-09-10T06:00:00Z'),
        status: 'Final',
        labName: 'Department of Laboratory Medicine',
        validatedBy: null,
        orderedBy: 'Dr. Rohit Desai',
        comment: null,
        isAtlasVocabulary: false,
        results: [
          {
            id: ID(6),
            analyteCode: '13457-7',
            name: 'LDL cholesterol (calculated)',
            value: '76',
            valueNumeric: 76,
            unit: 'mg/dL',
            referenceRange: '< 100',
            referenceLow: null,
            referenceHigh: 100,
            flag: null,
            method: null,
          },
        ],
      },
      {
        id: ID(7),
        reportNumber: 'LAB/0',
        panelName: 'Lipid profile',
        specimen: 'Serum',
        fasting: true,
        collectedAt: at('2026-06-26T00:30:00Z'),
        reportedAt: at('2026-06-26T05:00:00Z'),
        status: 'Final',
        labName: 'Department of Laboratory Medicine',
        validatedBy: null,
        orderedBy: 'Stroke Unit',
        comment: null,
        isAtlasVocabulary: false,
        results: [
          {
            id: ID(8),
            analyteCode: '13457-7',
            name: 'LDL cholesterol (calculated)',
            value: '154',
            valueNumeric: 154,
            unit: 'mg/dL',
            referenceRange: '< 100',
            referenceLow: null,
            referenceHigh: 100,
            flag: 'High',
            method: null,
          },
        ],
      },
    ],
    vitals: [
      {
        id: ID(9),
        type: 'BloodPressure',
        value: 134,
        value2: 82,
        unit: 'mmHg',
        qualifier: null,
        source: 'Facility',
        placeName: 'Stroke Clinic',
        recordedByRole: null,
        deviceName: null,
        isDerived: false,
        measuredAt: at('2026-09-11T05:10:00Z'),
        note: null,
      },
    ],
    imaging: [],
    instructions: [],
    healthNotes: [
      {
        id: ID(10),
        recordedAt: at('2026-09-24T11:11:00Z'),
        source: 'Typed',
        text: 'Slept well. Call me on 98450 12291.',
        updatedAt: NOW,
      },
    ],
  };
}

describe('renderRecord', () => {
  const ctx = renderRecord(fixture());
  const text = (section: string): string =>
    ctx.sections
      .filter((s) => s.section === section)
      .map((s) => s.text)
      .join('\n');

  it('ends every line with a source tag, and the guard knows every tag', () => {
    for (const s of ctx.sections) {
      const m = s.text.match(/\[([^\]]+)\]$/);
      assert.ok(m, `no source tag: ${s.text}`);
      assert.ok(ctx.guard.sourceTags.has(m[1].toLowerCase()), `tag not registered: ${m[1]}`);
    }
  });

  it("labels the patient's own words and reported symptoms as such", () => {
    assert.match(text('healthNotes'), /\(your own words, not reviewed by a clinician\)/);
    assert.match(text('allergies'), /your own words; not confirmed by the care team/);
    assert.match(
      text('visits'),
      /Symptoms reported at the time \(not a diagnosis\): arm weakness, speech difficulty/,
    );
  });

  it("gives lab results with the lab's own flag and the previous value", () => {
    assert.match(
      text('labs'),
      /LDL cholesterol \(calculated\) 154 mg\/dL \(lab range < 100\), marked High by the lab/,
    );
    assert.match(
      text('labs'),
      /LDL cholesterol \(calculated\) 76 mg\/dL \(lab range < 100\) \(was 154 on 26 Jun 2026; now lower\)/,
    );
    const ldl = ctx.guard.labs.find((l) => l.names.includes('ldl'));
    assert.ok(ldl);
    assert.deepEqual([...ldl.flags].sort(), ['high', 'none']);
  });

  it('quotes the signed Assessment and Plan, and says when the visit was amended', () => {
    assert.match(
      text('visits'),
      /Assessment \(from the signed visit note\): "Acute ischaemic stroke/,
    );
    assert.match(text('visits'), /later amended/);
  });

  it('scrubs identifiers from free text', () => {
    assert.match(text('healthNotes'), /\[phone removed\]/);
    assert.doesNotMatch(text('healthNotes'), /98450/);
  });

  it('writes appointments with weekday, India time and how far away', () => {
    assert.match(
      text('upcoming'),
      /^Tue 29 Sep 2026, 10:30 — in-person appointment with Dr Karthik Raja \(Rehabilitation Medicine\).*\(in 4 days\)/,
    );
  });

  it("records the care team's conditions for the guard", () => {
    assert.deepEqual(ctx.guard.conditions, [
      { code: 'I63.9', title: 'Cerebral infarction, unspecified' },
    ]);
  });
});

describe('format', () => {
  it('writes today in India time', () => {
    assert.equal(todayLine(NOW), 'Today is Friday, 25 Sep 2026, 14:05 (India time).');
    assert.equal(istDate(at('2026-06-25T20:00:00Z')), '26 Jun 2026');
  });

  it('masks phone, email, Aadhaar and ABHA but not clinical numbers', () => {
    const t = scrubIdentifiers(
      'Call +91 98765 43210 or mail a.b@example.com; Aadhaar 1234 5678 9012; ABHA 12-3456-7890-1234; BP 134/82, LDL 76.',
    );
    assert.doesNotMatch(t, /98765|example\.com|5678|7890/);
    assert.match(t, /BP 134\/82, LDL 76\./);
  });
});

describe('selectContext', () => {
  const ctx = renderRecord(fixture());

  it('sends the whole record when it fits', () => {
    const sel = selectContext(ctx.sections, 'anything', routeQuestion('anything'), [], 5000);
    assert.equal(sel.usedAll, true);
    assert.equal(sel.included.length, ctx.sections.length);
    // Sections in canonical order.
    const order = SECTIONS.map((s) => s.heading).filter((h) => sel.text.includes(`## ${h}`));
    const positions = order.map((h) => sel.text.indexOf(`## ${h}`));
    assert.deepEqual(
      positions,
      [...positions].sort((a, b) => a - b),
    );
  });

  it('under a tight budget keeps core, then the sections the question is about, and says what was left out', () => {
    const q = 'What was my LDL cholesterol in September?';
    const sel = selectContext(ctx.sections, q, routeQuestion(q), [], 260);
    assert.equal(sel.usedAll, false);
    assert.ok(sel.included.some((c) => c.section === 'conditions'));
    assert.ok(
      sel.included.some((c) => c.section === 'labs'),
      'the routed section is included',
    );
    assert.ok(!sel.included.some((c) => c.section === 'healthNotes'), 'unrelated sections wait');
    assert.match(sel.text, /not included/);
  });

  it('never cuts a line', () => {
    const sel = selectContext(ctx.sections, 'x', routeQuestion('x'), [], 120);
    for (const c of sel.included) assert.ok(sel.text.includes(c.text));
  });
});

describe('routeQuestion', () => {
  const cases: Array<[string, string[]]> = [
    ['What was my LDL?', ['labs']],
    ['When is my next appointment?', ['upcoming']],
    ['Show me my CT report', ['scans', 'labs']],
    ['What did Dr Desai say at my last visit?', ['visits', 'doctors']],
    ['my blood pressure readings', ['vitals']],
    ['Did I miss any doses this week?', ['medicines']],
  ];
  for (const [q, expected] of cases) {
    it(`routes "${q}"`, () => {
      const r = routeQuestion(q);
      for (const e of expected) assert.ok(r.sections.has(e as never), `${q} → ${e}`);
    });
  }

  it('routes a medicine named in the record', () => {
    assert.ok(
      routeQuestion('Can I take clopidogrel at night?', ['clopidogrel']).sections.has('medicines'),
    );
  });

  it('marks summary questions as broad', () => {
    assert.equal(routeQuestion('Can you summarise my health?').broad, true);
  });

  it('keeps short medical abbreviations as search terms', () => {
    assert.deepEqual(questionTerms('What is my LDL and TSH?'), ['ldl', 'tsh']);
  });
});

describe('budgetDeferredReply', () => {
  it("gives the patient's daily reset as a clock time in India", () => {
    assert.match(budgetDeferredReply('patient_daily_messages', 3600), /5:30 am \(India time\)/);
  });
  it('gives the per-minute wait in minutes', () => {
    assert.match(budgetDeferredReply('shared_minute_tokens', 40), /about 1 minute\b/);
  });
});
