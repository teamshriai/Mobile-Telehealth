import type { AppointmentMode, AppointmentStatus, RefillStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { todaysDoseTimes } from '../medication/medication.service';
import type { SlotState } from '../portal/medicationSchedule';
import { istDaysBetween } from './context/format';

// ─────────────────────────────────────────────────────────────────────────────
// The short "insights" shown beside the patient's AI chat button.
//
// ⚠️ TEMPLATES, NOT A MODEL. Every line is filled in from the patient's own
// record by the functions below. No model is called, so nothing leaves the
// server, nothing is spent from the AI budget, and nothing can come out
// phrased as advice.
//
// ⚠️ LOGISTICS AND AVAILABILITY ONLY: the next visit, today's dose times, a
// report that is ready, how a refill request stands, a new instruction. Never
// a health value, a comparison, or a judgement ("improved", "missed") — the
// portal does not interpret results, and a bubble is no exception. Tapping one
// asks the assistant about it, and the assistant's own guard applies there.
// ─────────────────────────────────────────────────────────────────────────────

export type InsightKind = 'appointment' | 'doses' | 'report' | 'refill' | 'instruction';

export interface Insight {
  /** The same while the fact is the same, new when it changes, so the client
   *  can show each one once. Holds no health information. */
  id: string;
  kind: InsightKind;
  text: string;
  /** Put in the chat box (not sent) when the patient taps the insight. */
  question: string;
}

export interface InsightsView {
  /** False when the patient has turned "Assistant insights" off in Settings. */
  enabled: boolean;
  insights: Insight[];
}

export interface InsightFacts {
  appointment: {
    id: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    mode: AppointmentMode;
    doctorName: string | null;
  } | null;
  doses: Array<{ at: Date; state: SlotState }>;
  labReport: { id: string; panelName: string; reportedAt: Date } | null;
  scanReport: { id: string; title: string; reportedAt: Date } | null;
  refill: {
    id: string;
    status: RefillStatus;
    medicine: string;
    forwardedToName: string | null;
  } | null;
  instruction: { id: string; issuedByName: string; issuedAt: Date } | null;
}

const DAY = 86_400_000;
/** How far back a report or an instruction still counts as news. */
const RECENT_DAYS = 30;
/** How long a refill's latest change is worth mentioning. */
const REFILL_DAYS = 14;
const RELEASED = ['Final', 'Amended'] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const IST_OFFSET_MS = 330 * 60_000;

function ist(d: Date): { y: number; m: number; day: number; wd: number; h: number; min: number } {
  const s = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth(),
    day: s.getUTCDate(),
    wd: s.getUTCDay(),
    h: s.getUTCHours(),
    min: s.getUTCMinutes(),
  };
}

/** "9:00 am" — India time, as the portal writes times. */
export function clock(d: Date): string {
  const p = ist(d);
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${h12}:${String(p.min).padStart(2, '0')} ${p.h < 12 ? 'am' : 'pm'}`;
}

/** "12 Sep", with the year only when it is not this year. */
function dayMonth(d: Date, now: Date): string {
  const p = ist(d);
  return `${p.day} ${MONTHS[p.m]}${p.y === ist(now).y ? '' : ` ${p.y}`}`;
}

/** "today", "tomorrow" or "on Tue 29 Sep". */
function onDay(d: Date, now: Date): string {
  const days = istDaysBetween(now, d);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `on ${DAYS[ist(d).wd]} ${dayMonth(d, now)}`;
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

function appointmentInsight(a: InsightFacts['appointment'], now: Date): Insight | null {
  if (a === null) return null;
  const when = `${onDay(a.scheduledAt, now)} at ${clock(a.scheduledAt)}`;
  const how = a.mode === 'Video' ? ' by video' : a.mode === 'Phone' ? ' by phone' : '';
  const text =
    a.status === 'Confirmed'
      ? `Your next visit${a.doctorName === null ? '' : ` with ${a.doctorName}`} is ${when}${how}.`
      : `Your request to see ${a.doctorName ?? 'a doctor'} ${when} is waiting for the hospital to confirm.`;
  return {
    id: `appointment:${a.id}:${a.status}`,
    kind: 'appointment',
    text,
    question: 'When is my next appointment?',
  };
}

function dosesInsight(doses: InsightFacts['doses'], now: Date): Insight | null {
  const question = 'Which doses do I have left today?';
  const ahead = doses.filter((d) => d.state === 'due' || d.state === 'upcoming');
  if (ahead.length > 0) {
    const next = ahead[0];
    const atNext = ahead.filter((d) => d.at.getTime() === next.at.getTime()).length;
    const later = ahead.length - atNext;
    const doseWord = plural(atNext, 'dose', 'doses');
    let text: string;
    if (next.state === 'due') {
      text = `It's time for your ${clock(next.at)} ${doseWord}. You can mark ${plural(atNext, 'it', 'them')} in Medicines.`;
    } else if (later === 0) {
      text = `Your last ${doseWord} for today ${plural(atNext, 'is', 'are')} at ${clock(next.at)}.`;
    } else {
      text = `Your next ${doseWord} today ${plural(atNext, 'is', 'are')} at ${clock(next.at)}, and ${later} more later on.`;
    }
    return { id: `doses:${next.at.toISOString()}:${next.state}`, kind: 'doses', text, question };
  }
  // Only past, unmarked doses are left. "Not marked" — never "missed": the
  // dose may well have been taken, and it can still be marked for two days.
  const notMarked = doses.filter((d) => d.state === 'missed').length;
  if (notMarked === 0) return null;
  const p = ist(now);
  return {
    id: `doses:${p.y}-${p.m + 1}-${p.day}:not-marked:${notMarked}`,
    kind: 'doses',
    text:
      notMarked === 1
        ? "One of today's doses isn't marked yet. You can still mark it in Medicines."
        : `${notMarked} of today's doses aren't marked yet. You can still mark them in Medicines.`,
    question,
  };
}

function reportInsight(
  lab: InsightFacts['labReport'],
  scan: InsightFacts['scanReport'],
  now: Date,
): Insight | null {
  if (lab === null && scan === null) return null;
  if (scan === null || (lab !== null && lab.reportedAt >= scan.reportedAt)) {
    const l = lab!;
    return {
      id: `report:lab:${l.id}`,
      kind: 'report',
      text: `Your ${l.panelName} report from ${dayMonth(l.reportedAt, now)} is ready in Reports.`,
      question: 'What did my last lab report show?',
    };
  }
  return {
    id: `report:scan:${scan.id}`,
    kind: 'report',
    text: `Your ${scan.title} report from ${dayMonth(scan.reportedAt, now)} is ready in Reports.`,
    question: 'What did my last scan report say?',
  };
}

function refillInsight(r: InsightFacts['refill']): Insight | null {
  if (r === null) return null;
  let text: string;
  switch (r.status) {
    case 'Requested':
      text = `Your refill request for ${r.medicine} is with the hospital.`;
      break;
    case 'Forwarded':
      text = `Your refill request for ${r.medicine} has been passed to ${r.forwardedToName ?? 'your doctor'}.`;
      break;
    case 'Fulfilled':
      text = `There is a new prescription for ${r.medicine}, answering your refill request.`;
      break;
    case 'Declined':
      text = `Your refill request for ${r.medicine} was declined. The reason is in Medicines.`;
      break;
    default:
      return null;
  }
  return {
    id: `refill:${r.id}:${r.status}`,
    kind: 'refill',
    text,
    question: 'What is happening with my refill request?',
  };
}

function instructionInsight(i: InsightFacts['instruction'], now: Date): Insight | null {
  if (i === null) return null;
  // The instruction's own words stay in My Health: a bubble names who and when.
  return {
    id: `instruction:${i.id}`,
    kind: 'instruction',
    text: `${i.issuedByName} gave you an instruction on ${dayMonth(i.issuedAt, now)}. It's in My Health.`,
    question: 'What did my doctor ask me to do?',
  };
}

/** Pure: the facts in, the lines out, in a fixed order. */
export function buildInsights(facts: InsightFacts, now: Date): Insight[] {
  return [
    appointmentInsight(facts.appointment, now),
    dosesInsight(facts.doses, now),
    reportInsight(facts.labReport, facts.scanReport, now),
    refillInsight(facts.refill),
    instructionInsight(facts.instruction, now),
  ].filter((i): i is Insight => i !== null);
}

async function loadFacts(patientId: string, now: Date): Promise<InsightFacts> {
  const recent = new Date(now.getTime() - RECENT_DAYS * DAY);
  const refillSince = new Date(now.getTime() - REFILL_DAYS * DAY);
  const [appointment, doses, lab, scan, refill, instruction] = await Promise.all([
    prisma.appointment.findFirst({
      where: { patientId, scheduledAt: { gte: now }, status: { in: ['Requested', 'Confirmed'] } },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        mode: true,
        doctor: { select: { firstName: true, lastName: true } },
      },
    }),
    // A schedule that cannot be worked out is simply not mentioned.
    todaysDoseTimes(patientId, now).catch(() => []),
    prisma.labReport.findFirst({
      where: {
        patientId,
        deletedAt: null,
        status: { in: [...RELEASED] },
        reportedAt: { gte: recent, lte: now },
      },
      orderBy: { reportedAt: 'desc' },
      select: { id: true, panelName: true, reportedAt: true },
    }),
    prisma.imagingReport.findFirst({
      where: {
        patientId,
        status: { in: [...RELEASED] },
        reportedAt: { gte: recent, lte: now },
        study: { deletedAt: null },
      },
      orderBy: { reportedAt: 'desc' },
      select: { id: true, reportedAt: true, study: { select: { title: true } } },
    }),
    prisma.refillRequest.findFirst({
      where: { patientId, status: { not: 'Cancelled' }, updatedAt: { gte: refillSince } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        forwardedToName: true,
        item: { select: { dose: true, doseUnit: true, drug: { select: { genericName: true } } } },
      },
    }),
    prisma.patientInstruction.findFirst({
      where: { patientId, issuedAt: { gte: recent, lte: now } },
      orderBy: { issuedAt: 'desc' },
      select: { id: true, issuedByName: true, issuedAt: true },
    }),
  ]);
  return {
    appointment:
      appointment === null
        ? null
        : {
            id: appointment.id,
            scheduledAt: appointment.scheduledAt,
            status: appointment.status,
            mode: appointment.mode,
            doctorName:
              appointment.doctor === null
                ? null
                : `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`.trim(),
          },
    doses,
    labReport: lab,
    scanReport:
      scan === null ? null : { id: scan.id, title: scan.study.title, reportedAt: scan.reportedAt },
    refill:
      refill === null
        ? null
        : {
            id: refill.id,
            status: refill.status,
            medicine: `${refill.item.drug.genericName} ${refill.item.dose.toString()} ${refill.item.doseUnit}`,
            forwardedToName: refill.forwardedToName,
          },
    instruction,
  };
}

export const insightsService = {
  /**
   * The patient's own insights, resolved from the session. Always answers:
   * no patient record, or insights turned off, is an empty list, not an error.
   */
  async forUser(userId: string, now: Date = new Date()): Promise<InsightsView> {
    const profile = await prisma.patientProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, preferences: true },
    });
    if (profile === null) return { enabled: true, insights: [] };
    const prefs = profile.preferences as { notifications?: { aiInsights?: unknown } } | null;
    if (prefs?.notifications?.aiInsights === false) return { enabled: false, insights: [] };
    return { enabled: true, insights: buildInsights(await loadFacts(profile.id, now), now) };
  },
};
