import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adherence,
  canLogSlot,
  courseEnd,
  doseSlots,
  isDoseSlot,
  istDayBounds,
  istDayNumber,
  partOfDay,
  scheduleKind,
  slotState,
} from '../medicationSchedule';

// IST is UTC+05:30 with no daylight saving, so these instants are exact.
const ist = (iso: string): Date => new Date(`${iso}+05:30`);
const HOUR = 3_600_000;

describe('doseSlots — the default times for each frequency (India time)', () => {
  const day = { from: ist('2026-09-25T00:00:00'), to: ist('2026-09-26T00:00:00') };
  const signedLongAgo = ist('2026-09-01T09:00:00');
  const times = (frequency: string): string[] =>
    doseSlots({ frequency, startedAt: signedLongAgo, durationDays: 90 }, day.from, day.to).map(
      (d) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(11, 16),
    );

  it('OD is 08:00', () => assert.deepEqual(times('OD'), ['08:00']));
  it('BD is 08:00 and 20:00', () => assert.deepEqual(times('BD'), ['08:00', '20:00']));
  it('TDS is three doses', () => assert.deepEqual(times('TDS'), ['08:00', '14:00', '20:00']));
  it('QDS is four doses', () =>
    assert.deepEqual(times('QDS'), ['08:00', '12:00', '16:00', '20:00']));
  it('HS is bedtime', () => assert.deepEqual(times('HS'), ['22:00']));
  it('frequency codes are case-insensitive', () =>
    assert.deepEqual(times('bd'), ['08:00', '20:00']));
  it('as-needed medicines are never scheduled', () => {
    assert.deepEqual(times('SOS'), []);
    assert.deepEqual(times('PRN'), []);
    assert.equal(scheduleKind('PRN'), 'as_needed');
  });
  it('an unknown code is not guessed at', () => {
    assert.deepEqual(times('Every 36 hours'), []);
    assert.equal(scheduleKind('Every 36 hours'), 'unknown');
  });
  it('WEEKLY falls on the weekday it was signed', () => {
    // 2026-09-01 is a Tuesday.
    const week = doseSlots(
      { frequency: 'WEEKLY', startedAt: signedLongAgo, durationDays: 90 },
      ist('2026-09-21T00:00:00'),
      ist('2026-09-28T00:00:00'),
    );
    assert.equal(week.length, 1);
    assert.equal(week[0].toISOString(), ist('2026-09-22T08:00:00').toISOString());
  });
});

describe('doseSlots — the course boundaries', () => {
  it('a course signed at 10:30 starts with the evening dose, not a missed morning one', () => {
    const slots = doseSlots(
      { frequency: 'BD', startedAt: ist('2026-09-25T10:30:00'), durationDays: 5 },
      ist('2026-09-25T00:00:00'),
      ist('2026-09-26T00:00:00'),
    );
    assert.deepEqual(
      slots.map((s) => s.toISOString()),
      [ist('2026-09-25T20:00:00').toISOString()],
    );
  });

  it('a 5-day BD course has exactly 10 doses', () => {
    const course = { frequency: 'BD', startedAt: ist('2026-09-01T07:00:00'), durationDays: 5 };
    assert.equal(
      doseSlots(course, ist('2026-08-01T00:00:00'), ist('2026-10-01T00:00:00')).length,
      10,
    );
    assert.equal(courseEnd(course)?.toISOString(), ist('2026-09-06T07:00:00').toISOString());
  });

  it('isDoseSlot accepts real slots and nothing else', () => {
    const course = { frequency: 'OD', startedAt: ist('2026-09-01T07:00:00'), durationDays: 30 };
    assert.equal(isDoseSlot(course, ist('2026-09-10T08:00:00')), true);
    assert.equal(isDoseSlot(course, ist('2026-09-10T08:01:00')), false);
    assert.equal(isDoseSlot(course, ist('2026-10-10T08:00:00')), false, 'after the course ended');
  });

  it('istDayBounds is midnight to midnight in India', () => {
    const { start, end } = istDayBounds(ist('2026-09-25T23:59:00'));
    assert.equal(start.toISOString(), ist('2026-09-25T00:00:00').toISOString());
    assert.equal(end.getTime() - start.getTime(), 24 * HOUR);
  });
});

describe('slotState and logging windows', () => {
  const at = ist('2026-09-25T08:00:00');
  it('upcoming → due → missed as time passes', () => {
    assert.equal(slotState(at, null, ist('2026-09-25T06:00:00')), 'upcoming');
    assert.equal(slotState(at, null, ist('2026-09-25T07:30:00')), 'due');
    assert.equal(slotState(at, null, ist('2026-09-25T10:59:00')), 'due');
    assert.equal(slotState(at, null, ist('2026-09-25T11:01:00')), 'missed');
  });
  it('a logged dose is what the patient said, whatever the time', () => {
    assert.equal(slotState(at, 'Taken', ist('2026-09-28T00:00:00')), 'taken');
    assert.equal(slotState(at, 'Skipped', ist('2026-09-25T08:05:00')), 'skipped');
  });
  it('cannot log a dose hours ahead, or days late', () => {
    assert.equal(canLogSlot(at, ist('2026-09-25T05:00:00')), false);
    assert.equal(canLogSlot(at, ist('2026-09-25T07:30:00')), true);
    assert.equal(canLogSlot(at, ist('2026-09-26T21:00:00')), true);
    assert.equal(canLogSlot(at, ist('2026-09-27T09:00:00')), false);
  });
});

describe('adherence — taken ÷ doses that were due', () => {
  const slots = [0, 1, 2, 3, 4, 5, 6].map((d) => ist(`2026-09-1${d}T08:00:00`));
  it('counts taken, skipped and missed; ignores doses not yet due', () => {
    const logs = new Map<number, 'Taken' | 'Skipped'>([
      [slots[0].getTime(), 'Taken'],
      [slots[1].getTime(), 'Taken'],
      [slots[2].getTime(), 'Skipped'],
      [slots[4].getTime(), 'Taken'],
    ]);
    // "now" is the morning of the 6th slot's day, inside its window.
    const r = adherence(slots, logs, ist('2026-09-15T09:00:00'));
    assert.deepEqual(r, { taken: 3, skipped: 1, missed: 1, due: 5, percent: 60 });
  });
  it('nothing due yet is "no figure", never 0%', () => {
    assert.equal(adherence(slots, new Map(), ist('2026-09-01T00:00:00')).percent, null);
  });
});

describe('partOfDay', () => {
  it('groups by the India clock', () => {
    assert.equal(partOfDay(ist('2026-09-25T08:00:00')), 'Morning');
    assert.equal(partOfDay(ist('2026-09-25T14:00:00')), 'Afternoon');
    assert.equal(partOfDay(ist('2026-09-25T20:00:00')), 'Evening');
    assert.equal(partOfDay(ist('2026-09-25T22:00:00')), 'Night');
  });
});

describe('courseEnd — a renewal ends the old course at the moment it was signed', () => {
  it('replacement earlier than the natural end wins', () => {
    const startedAt = ist('2026-06-01T09:00:00');
    const replacedAt = ist('2026-06-10T11:00:00');
    assert.equal(
      courseEnd({ frequency: 'OD', startedAt, durationDays: 90, replacedAt })?.toISOString(),
      replacedAt.toISOString(),
    );
  });
  it('an ongoing course (no duration) ends only when replaced', () => {
    const startedAt = ist('2026-06-01T09:00:00');
    assert.equal(courseEnd({ frequency: 'OD', startedAt, durationDays: null }), null);
    const replacedAt = ist('2026-07-01T09:00:00');
    assert.equal(
      courseEnd({ frequency: 'OD', startedAt, durationDays: null, replacedAt })?.toISOString(),
      replacedAt.toISOString(),
    );
  });
  it('no doses of the old course are scheduled after the renewal', () => {
    const startedAt = ist('2026-09-01T07:00:00');
    const replacedAt = ist('2026-09-03T10:00:00');
    const slots = doseSlots(
      { frequency: 'OD', startedAt, durationDays: 90, replacedAt },
      ist('2026-09-01T00:00:00'),
      ist('2026-09-10T00:00:00'),
    );
    assert.equal(slots.length, 3); // 1st, 2nd, 3rd at 08:00 — the 3rd is before 10:00
  });
});

describe('istDayNumber — whole days change at midnight India time', () => {
  it('23:59 and 00:01 IST are different days; 00:01 and 23:59 the same day', () => {
    const late = istDayNumber(ist('2026-09-25T23:59:00'));
    const early = istDayNumber(ist('2026-09-26T00:01:00'));
    assert.equal(early - late, 1);
    assert.equal(istDayNumber(ist('2026-09-26T23:59:00')), early);
  });
  it('is not UTC: 02:00 IST is still the IST date, though UTC is the day before', () => {
    assert.equal(
      istDayNumber(ist('2026-09-26T02:00:00')),
      istDayNumber(ist('2026-09-26T12:00:00')),
    );
  });
});
