import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInsights, clock, type InsightFacts } from '../insights.service';

// Saturday 26 Sep 2026, 1:30 pm in India.
const NOW = new Date('2026-09-26T08:00:00Z');
/** An instant from an India-time wall clock. */
const ist = (isoLocal: string): Date => new Date(`${isoLocal}+05:30`);

const EMPTY: InsightFacts = {
  appointment: null,
  doses: [],
  labReport: null,
  scanReport: null,
  refill: null,
  instruction: null,
};

const texts = (facts: Partial<InsightFacts>): string[] =>
  buildInsights({ ...EMPTY, ...facts }, NOW).map((i) => i.text);

describe('insights — clock', () => {
  it('writes India time the way the portal does', () => {
    assert.equal(clock(ist('2026-09-29T09:00')), '9:00 am');
    assert.equal(clock(ist('2026-09-29T00:05')), '12:05 am');
    assert.equal(clock(ist('2026-09-29T12:30')), '12:30 pm');
    assert.equal(clock(ist('2026-09-29T21:00')), '9:00 pm');
  });
});

describe('insights — appointment', () => {
  const base = { id: 'a1', mode: 'InPerson' as const, doctorName: 'Dr. Ananya Iyer' };

  it('a confirmed visit on another day', () => {
    assert.deepEqual(
      texts({
        appointment: { ...base, scheduledAt: ist('2026-09-29T09:00'), status: 'Confirmed' },
      }),
      ['Your next visit with Dr. Ananya Iyer is on Tue 29 Sep at 9:00 am.'],
    );
  });

  it('today and tomorrow are named, and a video visit says so', () => {
    assert.deepEqual(
      texts({
        appointment: {
          ...base,
          scheduledAt: ist('2026-09-26T17:00'),
          status: 'Confirmed',
          mode: 'Video',
        },
      }),
      ['Your next visit with Dr. Ananya Iyer is today at 5:00 pm by video.'],
    );
    assert.deepEqual(
      texts({
        appointment: { ...base, scheduledAt: ist('2026-09-27T10:15'), status: 'Confirmed' },
      }),
      ['Your next visit with Dr. Ananya Iyer is tomorrow at 10:15 am.'],
    );
  });

  it('a request still waiting says who confirms it', () => {
    assert.deepEqual(
      texts({
        appointment: { ...base, scheduledAt: ist('2026-09-29T09:00'), status: 'Requested' },
      }),
      [
        'Your request to see Dr. Ananya Iyer on Tue 29 Sep at 9:00 am is waiting for the hospital to confirm.',
      ],
    );
  });

  it('with no doctor chosen ("no preference")', () => {
    assert.deepEqual(
      texts({
        appointment: {
          ...base,
          doctorName: null,
          scheduledAt: ist('2026-10-02T11:00'),
          status: 'Requested',
        },
      }),
      [
        'Your request to see a doctor on Fri 2 Oct at 11:00 am is waiting for the hospital to confirm.',
      ],
    );
  });

  it('shows the year only when it is not this year', () => {
    assert.deepEqual(
      texts({
        appointment: { ...base, scheduledAt: ist('2027-01-05T09:00'), status: 'Confirmed' },
      }),
      ['Your next visit with Dr. Ananya Iyer is on Tue 5 Jan 2027 at 9:00 am.'],
    );
  });

  it('the id changes when the status does, so a confirmation is shown afresh', () => {
    const at = ist('2026-09-29T09:00');
    const [a] = buildInsights(
      { ...EMPTY, appointment: { ...base, scheduledAt: at, status: 'Requested' } },
      NOW,
    );
    const [b] = buildInsights(
      { ...EMPTY, appointment: { ...base, scheduledAt: at, status: 'Confirmed' } },
      NOW,
    );
    assert.notEqual(a.id, b.id);
  });
});

describe('insights — doses', () => {
  it('a dose due now, and two at the same time', () => {
    assert.deepEqual(texts({ doses: [{ at: ist('2026-09-26T13:30'), state: 'due' }] }), [
      "It's time for your 1:30 pm dose. You can mark it in Medicines.",
    ]);
    assert.deepEqual(
      texts({
        doses: [
          { at: ist('2026-09-26T13:30'), state: 'due' },
          { at: ist('2026-09-26T13:30'), state: 'due' },
        ],
      }),
      ["It's time for your 1:30 pm doses. You can mark them in Medicines."],
    );
  });

  it('the next dose, and how many more follow', () => {
    assert.deepEqual(
      texts({
        doses: [
          { at: ist('2026-09-26T08:00'), state: 'taken' },
          { at: ist('2026-09-26T14:00'), state: 'upcoming' },
          { at: ist('2026-09-26T20:00'), state: 'upcoming' },
          { at: ist('2026-09-26T21:00'), state: 'upcoming' },
        ],
      }),
      ['Your next dose today is at 2:00 pm, and 2 more later on.'],
    );
  });

  it('the last dose of the day', () => {
    assert.deepEqual(texts({ doses: [{ at: ist('2026-09-26T21:00'), state: 'upcoming' }] }), [
      'Your last dose for today is at 9:00 pm.',
    ]);
  });

  it('unmarked doses are "not marked", never "missed"', () => {
    const out = texts({
      doses: [
        { at: ist('2026-09-26T08:00'), state: 'missed' },
        { at: ist('2026-09-26T09:00'), state: 'missed' },
      ],
    });
    assert.deepEqual(out, [
      "2 of today's doses aren't marked yet. You can still mark them in Medicines.",
    ]);
    assert.doesNotMatch(out.join(' '), /missed/i);
  });

  it('says nothing when every dose is marked, or there are none', () => {
    assert.deepEqual(texts({ doses: [{ at: ist('2026-09-26T08:00'), state: 'taken' }] }), []);
    assert.deepEqual(texts({ doses: [{ at: ist('2026-09-26T08:00'), state: 'skipped' }] }), []);
    assert.deepEqual(texts({ doses: [] }), []);
  });
});

describe('insights — reports, refills, instructions', () => {
  const lab = { id: 'l1', panelName: 'Lipid profile', reportedAt: ist('2026-09-10T11:00') };
  const scan = { id: 's1', title: 'MRI Brain', reportedAt: ist('2026-09-12T10:30') };

  it('the newest report, lab or scan, with its own question', () => {
    const [newestScan] = buildInsights({ ...EMPTY, labReport: lab, scanReport: scan }, NOW);
    assert.equal(newestScan.text, 'Your MRI Brain report from 12 Sep is ready in Reports.');
    assert.equal(newestScan.question, 'What did my last scan report say?');
    const [onlyLab] = buildInsights({ ...EMPTY, labReport: lab }, NOW);
    assert.equal(onlyLab.text, 'Your Lipid profile report from 10 Sep is ready in Reports.');
    assert.equal(onlyLab.question, 'What did my last lab report show?');
  });

  it('each refill state in plain words; a cancelled one is not mentioned', () => {
    const r = { id: 'r1', medicine: 'Atorvastatin 40 mg', forwardedToName: 'Dr. Rohit Desai' };
    assert.deepEqual(texts({ refill: { ...r, status: 'Requested' } }), [
      'Your refill request for Atorvastatin 40 mg is with the hospital.',
    ]);
    assert.deepEqual(texts({ refill: { ...r, status: 'Forwarded' } }), [
      'Your refill request for Atorvastatin 40 mg has been passed to Dr. Rohit Desai.',
    ]);
    assert.deepEqual(texts({ refill: { ...r, forwardedToName: null, status: 'Forwarded' } }), [
      'Your refill request for Atorvastatin 40 mg has been passed to your doctor.',
    ]);
    assert.deepEqual(texts({ refill: { ...r, status: 'Fulfilled' } }), [
      'There is a new prescription for Atorvastatin 40 mg, answering your refill request.',
    ]);
    assert.deepEqual(texts({ refill: { ...r, status: 'Declined' } }), [
      'Your refill request for Atorvastatin 40 mg was declined. The reason is in Medicines.',
    ]);
    assert.deepEqual(texts({ refill: { ...r, status: 'Cancelled' } }), []);
  });

  it("an instruction names who and when, never the instruction's words", () => {
    assert.deepEqual(
      texts({
        instruction: {
          id: 'i1',
          issuedByName: 'Dr. Priya Nair',
          issuedAt: ist('2026-09-12T12:00'),
        },
      }),
      ["Dr. Priya Nair gave you an instruction on 12 Sep. It's in My Health."],
    );
  });
});

describe('insights — all together', () => {
  const all: InsightFacts = {
    appointment: {
      id: 'a1',
      scheduledAt: ist('2026-09-29T09:00'),
      status: 'Confirmed',
      mode: 'InPerson',
      doctorName: 'Dr. Ananya Iyer',
    },
    doses: [{ at: ist('2026-09-26T21:00'), state: 'upcoming' }],
    labReport: { id: 'l1', panelName: 'Lipid profile', reportedAt: ist('2026-09-10T11:00') },
    scanReport: null,
    refill: {
      id: 'r1',
      status: 'Forwarded',
      medicine: 'Atorvastatin 40 mg',
      forwardedToName: null,
    },
    instruction: { id: 'i1', issuedByName: 'Dr. Priya Nair', issuedAt: ist('2026-09-12T12:00') },
  };

  it('come in a fixed order, one of each kind, with unique ids', () => {
    const out = buildInsights(all, NOW);
    assert.deepEqual(
      out.map((i) => i.kind),
      ['appointment', 'doses', 'report', 'refill', 'instruction'],
    );
    assert.equal(new Set(out.map((i) => i.id)).size, out.length);
  });

  it('never interpret: no judgement or comparison words', () => {
    const out = buildInsights(all, NOW)
      .map((i) => i.text)
      .join(' ');
    assert.doesNotMatch(out, /improv|better|worse|normal|progress|missed|high|low|good|bad|risk/i);
  });
});
