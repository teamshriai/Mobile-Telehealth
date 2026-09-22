import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentStatus } from '@prisma/client';
import {
  CLINIC_TZ_OFFSET_MINUTES,
  parseWallClock,
  formatWallClock,
  clinicLocalToInstant,
  instantToClinicLocal,
  dayOfWeekForDate,
  intervalsOverlap,
  isOnLeave,
  generateSlotsForDate,
  canTransition,
  canReschedule,
  ALLOWED_TRANSITIONS,
  type AvailabilityWindow,
} from '../scheduling';

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling core.
//
// These cover the three things that would be expensive to get wrong and are
// invisible until they are: the IST conversion between wall-clock
// availability and UTC instants, the subtraction of leave and existing
// bookings from the slot grid, and the appointment status transition table.
//
// Run: npx tsx --test src/scheduling/__tests__/scheduling.test.ts
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAY_MORNING: AvailabilityWindow = {
  dayOfWeek: 1, // Monday
  startTime: '09:00',
  endTime: '11:00',
  slotDurationMins: 30,
  isActive: true,
};

describe('wall-clock parsing', () => {
  test('parses valid 24-hour times', () => {
    assert.equal(parseWallClock('00:00'), 0);
    assert.equal(parseWallClock('09:30'), 570);
    assert.equal(parseWallClock('23:59'), 1439);
  });

  test('rejects malformed and 12-hour input', () => {
    for (const bad of ['24:00', '9:30', '09:60', '', 'noon', '09:30 AM']) {
      assert.equal(parseWallClock(bad), null, `expected ${bad} to be rejected`);
    }
  });

  test('formats back to a padded 24-hour string', () => {
    assert.equal(formatWallClock(0), '00:00');
    assert.equal(formatWallClock(570), '09:30');
    assert.equal(formatWallClock(1439), '23:59');
  });

  test('round-trips', () => {
    for (const t of ['00:00', '07:05', '13:45', '23:59']) {
      assert.equal(formatWallClock(parseWallClock(t)!), t);
    }
  });
});

describe('IST conversion', () => {
  test('09:00 clinic-local is 03:30 UTC the same day', () => {
    const instant = clinicLocalToInstant('2026-09-21', 9 * 60);
    assert.equal(instant.toISOString(), '2026-09-21T03:30:00.000Z');
  });

  test('a clinic-local morning maps back to the same local day', () => {
    const instant = clinicLocalToInstant('2026-09-21', 9 * 60);
    const local = instantToClinicLocal(instant);
    assert.equal(local.isoDate, '2026-09-21');
    assert.equal(local.minutesPastMidnight, 540);
    assert.equal(local.dayOfWeek, 1); // Monday
  });

  test('early-morning local times fall on the PREVIOUS UTC day', () => {
    // 04:00 IST is 22:30 UTC the day before. Getting this backwards is how a
    // clinic list silently shows yesterday's patients.
    const instant = clinicLocalToInstant('2026-09-21', 4 * 60);
    assert.equal(instant.toISOString(), '2026-09-20T22:30:00.000Z');
    assert.equal(instantToClinicLocal(instant).isoDate, '2026-09-21');
  });

  test('a late-evening UTC instant is already tomorrow in the clinic', () => {
    const local = instantToClinicLocal(new Date('2026-09-21T20:00:00.000Z'));
    assert.equal(local.isoDate, '2026-09-22');
    assert.equal(local.minutesPastMidnight, 90); // 01:30 IST
  });

  test('the offset is the documented IST value', () => {
    assert.equal(CLINIC_TZ_OFFSET_MINUTES, 330);
  });

  test('day-of-week is computed on the clinic calendar', () => {
    assert.equal(dayOfWeekForDate('2026-09-21'), 1); // Monday
    assert.equal(dayOfWeekForDate('2026-09-20'), 0); // Sunday
    assert.equal(dayOfWeekForDate('2026-09-26'), 6); // Saturday
  });
});

describe('interval overlap', () => {
  const at = (iso: string) => new Date(iso).getTime();

  test('back-to-back appointments do not overlap', () => {
    assert.equal(
      intervalsOverlap(at('2026-09-21T09:00:00Z'), 30, at('2026-09-21T09:30:00Z'), 30),
      false,
    );
  });

  test('a partial straddle overlaps', () => {
    assert.equal(
      intervalsOverlap(at('2026-09-21T09:00:00Z'), 30, at('2026-09-21T09:15:00Z'), 30),
      true,
    );
  });

  test('identical starts overlap', () => {
    assert.equal(
      intervalsOverlap(at('2026-09-21T09:00:00Z'), 30, at('2026-09-21T09:00:00Z'), 15),
      true,
    );
  });

  test('a long appointment swallows a short one inside it', () => {
    assert.equal(
      intervalsOverlap(at('2026-09-21T09:00:00Z'), 90, at('2026-09-21T09:45:00Z'), 15),
      true,
    );
  });
});

describe('leave', () => {
  const leave = [{ startDate: new Date('2026-09-21'), endDate: new Date('2026-09-23') }];

  test('is inclusive of both end days', () => {
    assert.equal(isOnLeave('2026-09-21', leave), true);
    assert.equal(isOnLeave('2026-09-22', leave), true);
    assert.equal(isOnLeave('2026-09-23', leave), true);
  });

  test('does not bleed into adjacent days', () => {
    assert.equal(isOnLeave('2026-09-20', leave), false);
    assert.equal(isOnLeave('2026-09-24', leave), false);
  });
});

describe('slot generation', () => {
  test('fills a window at the slot duration', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [WEEKDAY_MORNING],
      leaves: [],
      booked: [],
    });
    assert.deepEqual(slots.map((s) => s.label), ['09:00', '09:30', '10:00', '10:30']);
  });

  test('never emits a slot that would run past the window', () => {
    // 09:00–10:15 at 30 minutes fits two slots, not two and a half.
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [{ ...WEEKDAY_MORNING, endTime: '10:15' }],
      leaves: [],
      booked: [],
    });
    assert.deepEqual(slots.map((s) => s.label), ['09:00', '09:30']);
  });

  test('skips windows for other days of the week', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-22', // Tuesday
      availability: [WEEKDAY_MORNING], // Monday
      leaves: [],
      booked: [],
    });
    assert.deepEqual(slots, []);
  });

  test('skips inactive windows', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [{ ...WEEKDAY_MORNING, isActive: false }],
      leaves: [],
      booked: [],
    });
    assert.deepEqual(slots, []);
  });

  test('a leave day clears the whole grid', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [WEEKDAY_MORNING],
      leaves: [{ startDate: new Date('2026-09-20'), endDate: new Date('2026-09-22') }],
      booked: [],
    });
    assert.deepEqual(slots, []);
  });

  test('an existing booking removes exactly its own slot', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [WEEKDAY_MORNING],
      leaves: [],
      // 09:30 IST === 04:00 UTC
      booked: [{ scheduledAt: new Date('2026-09-21T04:00:00Z'), durationMins: 30 }],
    });
    assert.deepEqual(slots.map((s) => s.label), ['09:00', '10:00', '10:30']);
  });

  test('a long booking removes every slot it covers', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [WEEKDAY_MORNING],
      leaves: [],
      // 09:30–10:30 IST
      booked: [{ scheduledAt: new Date('2026-09-21T04:00:00Z'), durationMins: 60 }],
    });
    assert.deepEqual(slots.map((s) => s.label), ['09:00', '10:30']);
  });

  test('slots already started are excluded when `now` is supplied', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [WEEKDAY_MORNING],
      leaves: [],
      booked: [],
      // 09:45 IST
      now: new Date('2026-09-21T04:15:00Z'),
    });
    assert.deepEqual(slots.map((s) => s.label), ['10:00', '10:30']);
  });

  test('two windows on one day are merged and ordered', () => {
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [
        { ...WEEKDAY_MORNING, startTime: '14:00', endTime: '15:00' },
        WEEKDAY_MORNING,
      ],
      leaves: [],
      booked: [],
    });
    assert.deepEqual(slots.map((s) => s.label), ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30']);
  });

  test('a malformed or inverted window is skipped, not looped over', () => {
    // An end before the start would spin forever on a naive loop.
    const slots = generateSlotsForDate({
      isoDate: '2026-09-21',
      availability: [
        { ...WEEKDAY_MORNING, startTime: '11:00', endTime: '09:00' },
        { ...WEEKDAY_MORNING, startTime: 'garbage', endTime: '11:00' },
        { ...WEEKDAY_MORNING, slotDurationMins: 0 },
      ],
      leaves: [],
      booked: [],
    });
    assert.deepEqual(slots, []);
  });
});

describe('status transitions', () => {
  test('a requested appointment may be confirmed or cancelled', () => {
    assert.equal(canTransition(AppointmentStatus.Requested, AppointmentStatus.Confirmed), true);
    assert.equal(canTransition(AppointmentStatus.Requested, AppointmentStatus.Cancelled), true);
  });

  test('a requested appointment may not jump straight to completed', () => {
    assert.equal(canTransition(AppointmentStatus.Requested, AppointmentStatus.Completed), false);
    assert.equal(canTransition(AppointmentStatus.Requested, AppointmentStatus.NoShow), false);
  });

  test('a confirmed appointment may complete, no-show or cancel', () => {
    assert.equal(canTransition(AppointmentStatus.Confirmed, AppointmentStatus.Completed), true);
    assert.equal(canTransition(AppointmentStatus.Confirmed, AppointmentStatus.NoShow), true);
    assert.equal(canTransition(AppointmentStatus.Confirmed, AppointmentStatus.Cancelled), true);
  });

  test('every terminal status is genuinely terminal', () => {
    for (const terminal of [
      AppointmentStatus.Completed,
      AppointmentStatus.Cancelled,
      AppointmentStatus.NoShow,
    ]) {
      assert.deepEqual(ALLOWED_TRANSITIONS[terminal], [], `${terminal} should be terminal`);
      for (const to of Object.values(AppointmentStatus)) {
        assert.equal(canTransition(terminal, to), false, `${terminal} → ${to} must be refused`);
      }
    }
  });

  test('a cancelled appointment can never be completed', () => {
    assert.equal(canTransition(AppointmentStatus.Cancelled, AppointmentStatus.Completed), false);
  });

  test('only live appointments can be rescheduled', () => {
    assert.equal(canReschedule(AppointmentStatus.Requested), true);
    assert.equal(canReschedule(AppointmentStatus.Confirmed), true);
    assert.equal(canReschedule(AppointmentStatus.Completed), false);
    assert.equal(canReschedule(AppointmentStatus.Cancelled), false);
    assert.equal(canReschedule(AppointmentStatus.NoShow), false);
  });
});
