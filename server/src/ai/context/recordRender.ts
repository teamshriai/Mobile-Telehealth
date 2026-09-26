import {
  AiChunkSource,
  type AppointmentMode,
  type AppointmentStatus,
  type EncounterType,
  type LabFlag,
  type VitalSource,
  type VitalType,
} from '@prisma/client';
import type { RecordData } from './recordData';
import {
  istDate,
  istDateTime,
  istDaysBetween,
  istTime,
  istWeekdayDateTime,
  recordText,
} from './format';
import { analyteNames, tagsIn, type GuardCorpus, type LabFlagWord } from '../safety/guardCorpus';
import { rangeText } from '../../reports/labs.service';

// ─────────────────────────────────────────────────────────────────────────────
// The patient's record, as the assistant reads it — PURE, no I/O.
//
// Sectioned, in a fixed order, and every line ends with a SOURCE TAG naming
// where it came from ("[Lab report 10 Sep 2026]"). The model is told to copy
// the tag after each fact it uses; the output guard refuses any tag that is
// not here; the chat shows each tag as a link to that part of the portal.
//
// Three rules of wording carry the product's safety rules into the record
// itself, so no path can present them otherwise:
//  - the patient's own words say so: "(your own words)";
//  - symptoms at a visit are "reported at the time (not a diagnosis)";
//  - lab flags are "marked High by the lab", beside the lab's own range.
// ─────────────────────────────────────────────────────────────────────────────

export type SectionKey =
  | 'about'
  | 'allergies'
  | 'conditions'
  | 'medicines'
  | 'upcoming'
  | 'doctors'
  | 'visits'
  | 'labs'
  | 'vitals'
  | 'scans'
  | 'instructions'
  | 'pastAppointments'
  | 'pastMedicines'
  | 'listedMedicines'
  | 'healthNotes'
  | 'lifestyle';

/** Canonical order. `core` sections are always offered first when the
 *  whole record does not fit. */
export const SECTIONS: Array<{ key: SectionKey; heading: string; core: boolean }> = [
  { key: 'about', heading: 'ABOUT YOU', core: true },
  { key: 'allergies', heading: 'ALLERGIES (as you reported them)', core: true },
  { key: 'conditions', heading: 'CONDITIONS (recorded by your care team)', core: true },
  { key: 'medicines', heading: 'CURRENT MEDICINES', core: true },
  { key: 'upcoming', heading: 'UPCOMING APPOINTMENTS', core: true },
  { key: 'doctors', heading: 'MY DOCTORS', core: true },
  { key: 'visits', heading: 'VISITS (signed; newest first)', core: false },
  { key: 'labs', heading: 'LAB RESULTS — newest first', core: false },
  { key: 'vitals', heading: 'VITALS — newest first', core: false },
  { key: 'scans', heading: 'SCANS & X-RAYS — newest first', core: false },
  { key: 'instructions', heading: 'INSTRUCTIONS FROM YOUR CARE TEAM', core: false },
  { key: 'pastAppointments', heading: 'PAST APPOINTMENTS — newest first', core: false },
  { key: 'pastMedicines', heading: 'PAST MEDICINES', core: false },
  { key: 'listedMedicines', heading: 'MEDICINES YOU LISTED', core: false },
  { key: 'healthNotes', heading: 'HEALTH NOTES (your own words; newest first)', core: false },
  { key: 'lifestyle', heading: 'LIFESTYLE (as you reported it)', core: false },
];

export type ContextSection = {
  sourceType: AiChunkSource;
  sourceId: string;
  /** Distinguishes multiple chunks from the same row. */
  sourceField: string;
  sourceUpdatedAt: Date;
  text: string;
  section: SectionKey;
  /** For newest-first ordering inside a section. */
  sortAt: Date;
};

export type PatientContext = {
  /** True only for demo/fabricated records — see AI_DATA_POLICY. */
  isSyntheticData: boolean;
  patientId: string;
  /** First name and an age band only. */
  demographicsLine: string;
  sections: ContextSection[];
  /** Whole-record facts for the output guard (see guardCorpus.ts). */
  guard: Omit<GuardCorpus, 'text' | 'question'>;
};

// ── Wording ──────────────────────────────────────────────────────────────────

const tag = (kind: string, at?: Date): string =>
  at === undefined ? `[${kind}]` : `[${kind} ${istDate(at)}]`;
const quote = (t: string): string => `"${t.replace(/"/g, "'")}"`;
const lc = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1);

const VISIT_TYPE: Record<EncounterType, string> = {
  ClinicVisit: 'Clinic visit',
  AmbulanceIntake: 'Ambulance arrival',
  Emergency: 'Emergency visit',
  Telehealth: 'Video consultation',
  FollowUp: 'Follow-up visit',
  Screening: 'Screening visit',
  FieldRegistration: 'Field registration',
};
const MODE: Record<AppointmentMode, string> = {
  InPerson: 'in-person',
  Video: 'video',
  Phone: 'phone',
};
const APPT_STATUS: Record<AppointmentStatus, string> = {
  Requested: 'requested, waiting for the hospital to confirm',
  Confirmed: 'confirmed',
  Completed: 'completed',
  Cancelled: 'cancelled',
  NoShow: 'missed',
};
const FLAG: Record<LabFlag, string> = {
  High: 'High',
  Low: 'Low',
  CriticalHigh: 'Critically high',
  CriticalLow: 'Critically low',
  Abnormal: 'Abnormal',
};
const FLAG_WORDS: Record<LabFlag, LabFlagWord[]> = {
  High: ['high'],
  Low: ['low'],
  CriticalHigh: ['critical', 'high'],
  CriticalLow: ['critical', 'low'],
  Abnormal: ['abnormal'],
};
const VITAL_NAME: Record<VitalType, string> = {
  BloodPressure: 'blood pressure',
  HeartRate: 'pulse',
  SpO2: 'oxygen saturation (SpO2)',
  Temperature: 'temperature',
  RespiratoryRate: 'breathing rate',
  BloodGlucose: 'blood glucose',
  Weight: 'weight',
  Height: 'height',
  Bmi: 'BMI',
};
const VITAL_SOURCE: Record<VitalSource, string> = {
  Facility: 'measured by the hospital',
  HomeDevice: 'your home monitor',
  PatientReported: 'as you reported it',
};
const LIFESTYLE_WORD: Record<string, string> = {
  Never: 'never',
  Former: 'used to, stopped',
  Current: 'currently',
  Occasional: 'occasionally',
  Moderate: 'moderate',
  Heavy: 'heavy',
  Sedentary: 'mostly sitting',
  Light: 'light',
  Active: 'active',
  VeryActive: 'very active',
};

function ageBand(dob: Date | null, now: Date): string {
  if (dob === null) return 'age not recorded';
  const years = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 86_400_000));
  return `${Math.floor(years / 10) * 10}s`;
}

function bloodGroup(bg: string | null): string | null {
  if (bg === null || bg === 'Unknown') return null;
  return bg.replace('_Positive', '+').replace('_Negative', '−');
}

const isNone = (t: string): boolean => /^(none|nil|no known|nkda|no allergies)/i.test(t.trim());

// ── Renderer ─────────────────────────────────────────────────────────────────

export function renderRecord(data: RecordData): PatientContext {
  const { now, profile } = data;
  const out: ContextSection[] = [];
  const push = (
    section: SectionKey,
    sourceType: AiChunkSource,
    sourceId: string,
    sourceField: string,
    sourceUpdatedAt: Date,
    sortAt: Date,
    text: string,
  ): void => {
    out.push({ section, sourceType, sourceId, sourceField, sourceUpdatedAt, sortAt, text });
  };

  // ── ABOUT YOU ─────────────────────────────────────────────────────────────
  const first = profile.firstName ?? 'the patient';
  const bg = bloodGroup(profile.bloodGroup);
  const sex = profile.gender === 'Male' || profile.gender === 'Female' ? lc(profile.gender) : null;
  const demographicsLine =
    `Patient: ${first}, ${ageBand(profile.dateOfBirth, now)}` +
    (sex ? `, ${sex}` : '') +
    (bg ? `, blood group ${bg}` : '') +
    '.';
  push(
    'about',
    AiChunkSource.ProfileMedical,
    profile.id,
    'about',
    profile.updatedAt,
    profile.updatedAt,
    `${demographicsLine} ${tag('Your profile')}`,
  );
  for (const [field, label, value] of [
    ['existingDiseases', 'Conditions you listed when you registered', profile.existingDiseases],
    ['familyHistory', 'Family history you listed', profile.familyHistory],
    ['previousSurgeries', 'Past operations you listed', profile.previousSurgeries],
  ] as const) {
    const t = recordText(value, 300);
    if (t !== null && !isNone(t)) {
      push(
        'about',
        AiChunkSource.ProfileMedical,
        profile.id,
        field,
        profile.updatedAt,
        profile.updatedAt,
        `${label} (your own words): ${quote(t)} ${tag('Your profile')}`,
      );
    }
  }

  // ── ALLERGIES ─────────────────────────────────────────────────────────────
  const allergies = recordText(profile.allergies, 300);
  push(
    'allergies',
    AiChunkSource.ProfileMedical,
    profile.id,
    'knownAllergies',
    profile.updatedAt,
    profile.updatedAt,
    allergies === null
      ? `No allergies are recorded. ${tag('Your profile')}`
      : isNone(allergies)
        ? `You reported no known allergies. ${tag('Your profile')}`
        : `Allergies you reported (your own words; not confirmed by the care team): ${quote(allergies)} ${tag('Your profile')}`,
  );

  // ── CONDITIONS ────────────────────────────────────────────────────────────
  for (const c of data.conditions) {
    const status =
      c.status === 'Active'
        ? 'active'
        : `resolved${c.resolvedAt ? ` on ${istDate(c.resolvedAt)}` : ''}`;
    push(
      'conditions',
      AiChunkSource.Problem,
      c.id,
      'problem',
      c.recordedAt,
      c.recordedAt,
      `${c.title} (${c.code}) — ${status}; recorded by the care team on ${istDate(c.recordedAt)}` +
        (c.onsetDate ? `, onset ${istDate(c.onsetDate)}` : '') +
        `. ${tag('Diagnosis', c.recordedAt)}`,
    );
  }
  if (data.conditions.length === 0) {
    push(
      'conditions',
      AiChunkSource.Problem,
      profile.id,
      'none',
      profile.updatedAt,
      profile.updatedAt,
      `No diagnoses have been recorded by the care team. ${tag('Your profile')}`,
    );
  }

  // ── MEDICINES ─────────────────────────────────────────────────────────────
  const meds = data.medicines;
  if (meds !== null) {
    // Each medicine's own doses today, so a summary cannot spread the
    // all-medicines total across every line.
    const SLOT: Record<string, string> = {
      taken: 'marked taken',
      skipped: 'marked skipped',
      missed: 'not marked yet',
      due: 'due now',
      upcoming: 'still to come',
    };
    const timesById = new Map<string, string[]>();
    const todayById = new Map<string, string[]>();
    for (const d of meds.today) {
      timesById.set(d.itemId, [...(timesById.get(d.itemId) ?? []), istTime(d.at)]);
      todayById.set(d.itemId, [
        ...(todayById.get(d.itemId) ?? []),
        `${istTime(d.at)} ${SLOT[d.state] ?? d.state}`,
      ]);
    }
    for (const m of meds.current) {
      const times = timesById.get(m.id);
      const course =
        m.endsAt === null
          ? 'no end date set'
          : `until ${istDate(m.endsAt)}` +
            (m.supplyDaysLeft !== null
              ? ` (${m.supplyDaysLeft === 0 ? 'last day today' : `${m.supplyDaysLeft} more day${m.supplyDaysLeft === 1 ? '' : 's'}`})`
              : '');
      const d7 = meds.last7.get(m.id);
      const log =
        m.adherence30 === null
          ? 'Taken as needed, so there is no dose schedule to log.'
          : `Your dose log: last 7 days ${d7?.taken ?? 0} of ${d7?.due ?? 0} taken` +
            (d7 && d7.skipped > 0 ? `, ${d7.skipped} skipped` : '') +
            (d7 && d7.missed > 0 ? `, ${d7.missed} not marked` : '') +
            `; last 30 days ${m.adherence30.taken} of ${m.adherence30.due} taken` +
            (m.adherence30.skipped > 0 ? `, ${m.adherence30.skipped} skipped` : '') +
            (m.adherence30.missed > 0 ? `, ${m.adherence30.missed} not marked` : '') +
            ' (today not counted).';
      const refill =
        m.refill === null
          ? ''
          : ` Refill: ${lc(m.refill.status)} (asked for on ${istDate(m.refill.requestedAt)})` +
            (m.refill.forwardedToName ? `, sent to ${m.refill.forwardedToName}` : '') +
            (m.refill.declineReason
              ? `, declined: ${quote(recordText(m.refill.declineReason, 160) ?? '')}`
              : '') +
            '.';
      const directions = recordText(m.instructions, 200);
      const prescriber = [m.prescriber.name ?? 'a clinician', m.prescriber.specialty]
        .filter(Boolean)
        .join(', ');
      push(
        'medicines',
        AiChunkSource.Prescription,
        m.id,
        'item',
        m.startedAt,
        m.startedAt,
        `${m.name} ${m.dose} ${m.doseUnit} (${lc(m.form)}), ${lc(m.frequencyInWords)}, ${lc(m.routeInWords)}.` +
          (times ? ` Scheduled times each day: ${times.join(', ')}.` : '') +
          (todayById.has(m.id) ? ` Today: ${todayById.get(m.id)!.join('; ')}.` : '') +
          (m.drugClass ? ` Group: ${m.drugClass}.` : '') +
          (m.indication ? ` Prescribed for: ${m.indication.title}.` : '') +
          ` Prescribed by ${prescriber} on ${istDate(m.startedAt)}; ${course}.` +
          (directions ? ` Directions: ${quote(directions)}` : '') +
          ` ${log}${refill} ${tag('Prescription', m.startedAt)}`,
      );
    }
    if (meds.current.length === 0) {
      push(
        'medicines',
        AiChunkSource.Prescription,
        profile.id,
        'none',
        profile.updatedAt,
        profile.updatedAt,
        `No current prescribed medicines. ${tag('Your dose log')}`,
      );
    }
    const s = meds.summary;
    push(
      'medicines',
      AiChunkSource.Prescription,
      profile.id,
      'doseLog',
      now,
      now,
      `All medicines together today (${istDate(now)}): ${s.today.taken} of ${s.today.total} scheduled doses marked taken` +
        (s.today.skipped > 0 ? `, ${s.today.skipped} skipped` : '') +
        (s.today.remaining > 0 ? `, ${s.today.remaining} still to come` : '') +
        (s.today.notMarked > 0 ? `, ${s.today.notMarked} past their time and not marked yet` : '') +
        '.' +
        (s.nextDose ? ` Next dose: ${s.nextDose.name} at ${istTime(s.nextDose.at)}.` : '') +
        (s.adherence30.due > 0
          ? ` In the 30 days before today you marked ${s.adherence30.taken} of ${s.adherence30.due} scheduled doses as taken` +
            (s.adherence30.percent !== null ? ` (${s.adherence30.percent}%)` : '') +
            `, ${s.adherence30.skipped} skipped and ${s.adherence30.missed} not marked.`
          : '') +
        ` These counts come from your own dose log, not from the care team. ${tag('Your dose log')}`,
    );

    for (const m of meds.past.slice(0, 10)) {
      const ended =
        m.replacedAt !== null
          ? `replaced by a newer prescription on ${istDate(m.replacedAt)}`
          : m.endsAt !== null
            ? `course ended ${istDate(m.endsAt)}`
            : 'course finished';
      push(
        'pastMedicines',
        AiChunkSource.Prescription,
        m.id,
        'item',
        m.startedAt,
        m.startedAt,
        `${m.name} ${m.dose} ${m.doseUnit}, ${lc(m.frequencyInWords)} — prescribed by ${m.prescribedBy ?? 'a clinician'} on ${istDate(m.startedAt)}; ${ended}. ${tag('Prescription', m.startedAt)}`,
      );
    }
  }
  const listed = recordText(profile.selfListedMedicines, 300);
  if (listed !== null && !isNone(listed)) {
    push(
      'listedMedicines',
      AiChunkSource.ProfileMedical,
      profile.id,
      'currentMedications',
      profile.updatedAt,
      profile.updatedAt,
      `Medicines you listed yourself (your own words, not a prescription): ${quote(listed)} ${tag('Your profile')}`,
    );
  }

  // ── APPOINTMENTS ──────────────────────────────────────────────────────────
  const describeAppt = (a: RecordData['appointments'][number]): string => {
    const who = a.doctor
      ? `${a.doctor.name}${a.doctor.specialty ? ` (${a.doctor.specialty})` : ''}`
      : 'a doctor the hospital will assign';
    const where = a.mode === 'InPerson' ? (a.locationName ?? a.doctor?.hospital ?? null) : null;
    const reason = recordText(a.reason, 160);
    return (
      `${istWeekdayDateTime(a.scheduledAt)} — ${MODE[a.mode]} appointment with ${who}` +
      (where ? ` at ${where}` : '') +
      ` — ${APPT_STATUS[a.status]}.` +
      (reason ? ` Reason: ${quote(reason)}` : '')
    );
  };
  const upcoming = data.appointments
    .filter((a) => a.scheduledAt >= now && (a.status === 'Requested' || a.status === 'Confirmed'))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  for (const a of upcoming) {
    const days = istDaysBetween(now, a.scheduledAt);
    const when = days === 0 ? ' (today)' : days === 1 ? ' (tomorrow)' : ` (in ${days} days)`;
    // sortAt inverted: "newest first" must put the SOONEST appointment first.
    push(
      'upcoming',
      AiChunkSource.Appointment,
      a.id,
      '',
      a.updatedAt,
      new Date(8.64e15 - a.scheduledAt.getTime()),
      `${describeAppt(a)}${when}. ${tag('Appointment', a.scheduledAt)}`,
    );
  }
  if (upcoming.length === 0) {
    push(
      'upcoming',
      AiChunkSource.Appointment,
      profile.id,
      'none',
      now,
      now,
      `No upcoming appointments are booked. ${tag('Appointments')}`,
    );
  }
  const past = data.appointments.filter((a) => !upcoming.includes(a)).slice(0, 10);
  for (const a of past) {
    push(
      'pastAppointments',
      AiChunkSource.Appointment,
      a.id,
      '',
      a.updatedAt,
      a.scheduledAt,
      `${describeAppt(a)} ${tag('Appointment', a.scheduledAt)}`,
    );
  }

  // ── MY DOCTORS ────────────────────────────────────────────────────────────
  for (const m of data.careTeam) {
    push(
      'doctors',
      AiChunkSource.CareTeam,
      m.id,
      'member',
      m.updatedAt,
      m.updatedAt,
      `${m.name} — ${m.careRole} on your care team${m.isPrimary ? ' (primary)' : ''}` +
        [m.specialty, m.hospital]
          .filter(Boolean)
          .map((x) => `, ${x}`)
          .join('') +
        `. ${tag('Care team')}`,
    );
  }

  // ── VISITS ────────────────────────────────────────────────────────────────
  for (const v of data.visits) {
    const reason = recordText(v.reason, 200);
    const a = recordText(v.assessment, 500);
    const p = recordText(v.plan, 500);
    const ago = istDaysBetween(v.startedAt, now);
    push(
      'visits',
      AiChunkSource.Encounter,
      v.id,
      '',
      v.updatedAt,
      v.startedAt,
      `${VISIT_TYPE[v.type]} on ${istDateTime(v.startedAt)}` +
        (ago > 0 ? ` (${ago} day${ago === 1 ? '' : 's'} ago)` : ' (today)') +
        (v.location ? ` at ${v.location}` : '') +
        '.' +
        (v.seenBy.length > 0 ? ` Seen by ${v.seenBy.join(', ')}.` : '') +
        (reason ? ` Reason for the visit: ${quote(reason)}` : '') +
        (v.symptomsReported.length > 0
          ? ` Symptoms reported at the time (not a diagnosis): ${v.symptomsReported.join(', ')}.`
          : '') +
        (v.lastKnownWell
          ? ` Last known well: ${istDateTime(v.lastKnownWell.at)} (${lc(v.lastKnownWell.certainty)}).`
          : '') +
        (v.diagnoses.length > 0 ? ` Diagnoses recorded: ${v.diagnoses.join('; ')}.` : '') +
        (v.medicines.length > 0 ? ` Medicines prescribed: ${v.medicines.join('; ')}.` : '') +
        (v.instructions.length > 0
          ? ` Instructions issued: ${v.instructions.map(quote).join('; ')}.`
          : '') +
        (a ? ` Assessment (from the signed visit note): ${quote(a)}` : '') +
        (p ? ` Plan (from the signed visit note): ${quote(p)}` : '') +
        (v.amended
          ? ' This visit record was later amended; the portal shows the full record.'
          : '') +
        ` ${tag('Visit', v.startedAt)}`,
    );
  }

  // ── LAB RESULTS ───────────────────────────────────────────────────────────
  // Oldest first, to find each result's previous value.
  const history = new Map<string, Array<{ at: Date; value: number }>>();
  for (const rep of [...data.labs].sort(
    (x, y) => x.collectedAt.getTime() - y.collectedAt.getTime(),
  )) {
    for (const r of rep.results) {
      if (r.valueNumeric === null) continue;
      history.set(r.analyteCode, [
        ...(history.get(r.analyteCode) ?? []),
        { at: rep.collectedAt, value: r.valueNumeric },
      ]);
    }
  }
  const labGuard = new Map<string, { names: string[]; flags: Set<LabFlagWord> }>();
  for (const rep of data.labs) {
    const results = rep.results.map((r) => {
      const entry = labGuard.get(r.analyteCode) ?? {
        names: analyteNames(r.name),
        flags: new Set<LabFlagWord>(),
      };
      for (const f of r.flag === null ? (['none'] as LabFlagWord[]) : FLAG_WORDS[r.flag])
        entry.flags.add(f);
      labGuard.set(r.analyteCode, entry);
      const range =
        r.referenceRange ??
        rangeText({
          referenceRangeText: null,
          referenceLow: r.referenceLow,
          referenceHigh: r.referenceHigh,
        });
      const prev = (history.get(r.analyteCode) ?? []).filter((h) => h.at < rep.collectedAt).pop();
      const compare =
        prev === undefined || r.valueNumeric === null
          ? ''
          : ` (was ${prev.value} on ${istDate(prev.at)}; now ${r.valueNumeric > prev.value ? 'higher' : r.valueNumeric < prev.value ? 'lower' : 'the same'})`;
      return (
        `${r.name} ${r.value}${r.unit ? ` ${r.unit}` : ''}` +
        (range ? ` (lab range ${range})` : '') +
        (r.flag !== null ? `, marked ${FLAG[r.flag]} by the lab` : '') +
        compare
      );
    });
    const comment = recordText(rep.comment, 240);
    const reported =
      istDate(rep.reportedAt) === istDate(rep.collectedAt)
        ? ''
        : `, reported ${istDate(rep.reportedAt)}`;
    push(
      'labs',
      AiChunkSource.LabReport,
      rep.id,
      'report',
      rep.reportedAt,
      rep.collectedAt,
      `${rep.panelName}${rep.fasting ? ', fasting' : ''} — collected ${istDateTime(rep.collectedAt)}${reported}, ` +
        `${rep.labName}${rep.status === 'Amended' ? ' (amended report)' : ''}: ` +
        `${results.join('; ')}.` +
        (comment ? ` Lab comment: ${quote(comment)}` : '') +
        (rep.orderedBy ? ` Ordered by ${rep.orderedBy}.` : '') +
        ` ${tag('Lab report', rep.collectedAt)}`,
    );
  }

  // ── VITALS ────────────────────────────────────────────────────────────────
  // One line per (India day, source, place), newest first.
  const groups = new Map<string, RecordData['vitals']>();
  for (const r of data.vitals) {
    const key = `${istDate(r.measuredAt)}|${r.source}|${r.placeName ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const list of groups.values()) {
    const firstAt = list.reduce(
      (m, r) => (r.measuredAt < m ? r.measuredAt : m),
      list[0].measuredAt,
    );
    const readings = [...list]
      .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
      .map((r) => {
        const value =
          r.type === 'BloodPressure' && r.value2 !== null ? `${r.value}/${r.value2}` : `${r.value}`;
        return (
          `${VITAL_NAME[r.type]} ${value} ${r.unit}` +
          (list.filter((x) => x.type === r.type).length > 1 ? ` at ${istTime(r.measuredAt)}` : '') +
          (r.qualifier ? ` (${r.qualifier})` : '') +
          (r.isDerived ? ' (calculated)' : '')
        );
      });
    push(
      'vitals',
      AiChunkSource.VitalSign,
      list[0].id,
      'group',
      firstAt,
      firstAt,
      `${istDateTime(firstAt)}` +
        (list[0].placeName ? ` at ${list[0].placeName}` : '') +
        ` (${VITAL_SOURCE[list[0].source]}): ` +
        `${readings.join('; ')}. ${tag('Vitals', firstAt)}`,
    );
  }

  // ── SCANS & X-RAYS ────────────────────────────────────────────────────────
  for (const s of data.imaging) {
    const reason = recordText(s.clinicalIndication, 140);
    const findings = recordText(s.findings, 420);
    push(
      'scans',
      AiChunkSource.ImagingStudy,
      s.id,
      'report',
      s.report.reportedAt,
      s.performedAt,
      `${s.title}, ${istDateTime(s.performedAt)} at ${s.performingFacility}.` +
        (s.orderedBy ? ` Ordered by ${s.orderedBy}.` : '') +
        ` Reported by ${[s.report.reportedBy.name, s.report.reportedBy.role].filter(Boolean).join(', ')} on ${istDate(s.report.reportedAt)}` +
        (s.report.status === 'Amended' ? ' (amended)' : '') +
        '.' +
        (reason ? ` Reason: ${quote(reason)}` : '') +
        ` Impression: ${quote(recordText(s.impression, 400) ?? '')}` +
        (findings ? ` Findings: ${quote(findings)}` : '') +
        (s.isIllustrative
          ? ' (The images in the portal are sample images, not your own scan; the report is your record.)'
          : '') +
        ` ${tag('Scan report', s.performedAt)}`,
    );
  }

  // ── INSTRUCTIONS ──────────────────────────────────────────────────────────
  for (const ins of data.instructions) {
    // The English counterpart when there is one: the guardrails are English.
    const title = recordText(ins.titleEnglish ?? ins.title, 120) ?? 'Instructions';
    const body = recordText(ins.bodyEnglish ?? ins.body, 400);
    push(
      'instructions',
      AiChunkSource.Instruction,
      ins.id,
      'instruction',
      ins.issuedAt,
      ins.issuedAt,
      `${quote(title)}, issued by ${ins.issuedByName} on ${istDate(ins.issuedAt)}` +
        (body ? `: ${quote(body)}` : '') +
        ` ${tag('Instructions', ins.issuedAt)}`,
    );
  }

  // ── HEALTH NOTES ──────────────────────────────────────────────────────────
  // ⚠️ PATIENT-REPORTED, AND SAID SO IN THE TEXT ITSELF.
  for (const n of data.healthNotes) {
    const t = recordText(n.text, 300);
    if (t === null) continue;
    push(
      'healthNotes',
      AiChunkSource.HealthNote,
      n.id,
      'body',
      n.updatedAt,
      n.recordedAt,
      `${istDateTime(n.recordedAt)}, ${n.source === 'Voice' ? 'voice' : 'typed'} note (your own words, not reviewed by a clinician): ${quote(t)} ${tag('Your health note', n.recordedAt)}`,
    );
  }

  // ── LIFESTYLE ─────────────────────────────────────────────────────────────
  const life = (
    [
      ['smoking', profile.smoking],
      ['alcohol', profile.alcohol],
      ['tobacco', profile.tobacco],
      ['physical activity', profile.activity],
    ] as const
  ).filter(([, v]) => v !== null);
  if (life.length > 0) {
    push(
      'lifestyle',
      AiChunkSource.Lifestyle,
      profile.id,
      'lifestyle',
      profile.updatedAt,
      profile.updatedAt,
      `You told us — ${life.map(([k, v]) => `${k}: ${LIFESTYLE_WORD[v as string] ?? lc(String(v))}`).join('; ')}. ${tag('Your profile')}`,
    );
  }

  // ── Guard facts from the whole record ─────────────────────────────────────
  const allText = out.map((s) => s.text).join('\n');
  const prescribed = [...(meds?.current ?? []), ...(meds?.past ?? [])].map((m) => ({
    name: m.name.toLowerCase(),
    dose: m.dose,
    unit: m.doseUnit,
  }));
  return {
    isSyntheticData: data.isSyntheticData,
    patientId: data.patientId,
    demographicsLine,
    sections: out,
    guard: {
      conditions: data.conditions.map((c) => ({ code: c.code, title: c.title })),
      prescribed,
      labs: [...labGuard.values()],
      sourceTags: tagsIn(allText),
    },
  };
}

/** Total rendered characters — an early warning if the record outgrows the budget. */
export function contextCharCount(context: PatientContext): number {
  return context.sections.reduce((sum, s) => sum + s.text.length, 0);
}
