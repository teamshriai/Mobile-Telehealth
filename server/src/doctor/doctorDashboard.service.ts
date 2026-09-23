import { AppointmentStatus, EncounterType, LkwCertainty } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { doctorDashboardRepository } from './doctorDashboard.repository';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor dashboard service — the "My Day" aggregate.
//
// ⚠️ THE RULE THIS FILE EXISTS TO HOLD: every number here is COUNTED from a
// real row. Nothing is scored, predicted or averaged.
//
// The reference design for this screen (UI_ATLAS S-06-01) shows a NEWS2
// deterioration score. This product has no vitals model — there is nowhere a
// respiratory rate or a blood pressure is stored — so that score cannot be
// computed and is deliberately NOT faked. What replaces it is a deterministic
// ranking over signals that genuinely exist in the schema: an urgent stroke
// assessment, an open encounter, the recorded symptom count, and appointment
// timing. Every row returns the exact signals that produced its band, so the
// UI's "Why?" affordance shows real provenance rather than a plausible story.
//
// A patient with no assessment on record is returned with band `null` and
// `hasAssessment: false` — the atlas's AI-ABSTAIN state. Never a zero score,
// because "0" reads as "assessed and fine" when the truth is "never assessed".
// ─────────────────────────────────────────────────────────────────────────────

const TREND_MONTHS = 9;

/** Weights are deliberately small integers — this is a sort order, not a score
 *  with clinical meaning, and it must stay legible to whoever reads it next. */
const WEIGHT = {
  urgentAssessment: 3,
  openEncounter: 2,
  manySymptoms: 1,
  appointmentToday: 1,
  overdueRequest: 1,
} as const;

/**
 * Below this, a patient is not "needing attention" — they are just on the
 * list. Being in clinic today scores 1 on its own, and a panel that flags
 * every patient with an appointment is a second copy of the schedule wearing
 * an alert colour. Two means something beyond the routine is true: an open
 * encounter, an urgent assessment, an unanswered request, or a symptom
 * cluster on someone who is also due in.
 */
const ATTENTION_THRESHOLD = 2;

/** Three or more recorded symptoms is the threshold for the extra weight. It
 *  is a display cue, not a diagnostic threshold. */
const MANY_SYMPTOMS_THRESHOLD = 3;

const SYMPTOM_FIELDS = [
  'facialWeakness',
  'armWeakness',
  'legWeakness',
  'speechDifficulty',
  'suddenConfusion',
  'visionProblem',
  'severeHeadache',
  'balanceProblem',
  'lossOfConsciousness',
] as const;

const SYMPTOM_LABELS: Record<(typeof SYMPTOM_FIELDS)[number], string> = {
  facialWeakness: 'facial weakness',
  armWeakness: 'arm weakness',
  legWeakness: 'leg weakness',
  speechDifficulty: 'speech difficulty',
  suddenConfusion: 'sudden confusion',
  visionProblem: 'vision problem',
  severeHeadache: 'severe headache',
  balanceProblem: 'balance problem',
  lossOfConsciousness: 'loss of consciousness',
};

type Band = 'High' | 'Medium' | 'Low';

function bandFor(score: number): Band | null {
  if (score >= WEIGHT.urgentAssessment) return 'High';
  if (score >= WEIGHT.openEncounter) return 'Medium';
  if (score >= 1) return 'Low';
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Human wording for EncounterType.
 *
 * ⚠️ These strings are read by a clinician on the worklist, so they cannot be
 * the enum member names — "Open ClinicVisit encounter" is a database identifier
 * that leaked into the product. Every member is listed explicitly rather than
 * derived by splitting camel case, so adding a member to the enum without
 * deciding how to say it fails to compile.
 */
const ENCOUNTER_TYPE_LABELS: Record<EncounterType, string> = {
  [EncounterType.ClinicVisit]: 'clinic visit',
  [EncounterType.AmbulanceIntake]: 'ambulance intake',
  [EncounterType.Emergency]: 'emergency',
  [EncounterType.Telehealth]: 'teleconsultation',
  [EncounterType.FollowUp]: 'follow-up',
  [EncounterType.Screening]: 'screening',
  [EncounterType.FieldRegistration]: 'field registration',
};

export const doctorDashboardService = {
  async getMyDay(userId: string, now: Date = new Date()) {
    const doctorId = await doctorDashboardRepository.findDoctorProfileIdByUserId(userId);
    if (doctorId === null) {
      throw new AppError('Doctor profile not found.', 404);
    }

    const dayStart = startOfDay(now);
    const dayEnd = addDays(dayStart, 1);
    const trendFrom = new Date(dayStart.getFullYear(), dayStart.getMonth() - (TREND_MONTHS - 1), 1);

    /**
     * The calendar/chart window: four weeks back, two forward.
     *
     * Back far enough for the weekly chart to show a trend rather than a
     * single bar, forward far enough that the calendar shows the clinic a
     * consultant is about to walk into — which is the question they actually
     * ask it.
     */
    const loadFrom = new Date(dayStart.getTime() - 28 * 86_400_000);
    const loadTo = new Date(dayStart.getTime() + 15 * 86_400_000);

    const [panel, todays, upcomingCount, trendRows, loadRows] = await Promise.all([
      doctorDashboardRepository.listPanel(doctorId),
      doctorDashboardRepository.listAppointmentsBetween(doctorId, dayStart, dayEnd),
      doctorDashboardRepository.countUpcoming(doctorId, now),
      doctorDashboardRepository.listForTrend(doctorId, trendFrom),
      doctorDashboardRepository.listDailyLoad(doctorId, loadFrom, loadTo),
    ]);

    const patientIds = panel.map((row) => row.patient.id);
    const [openEncounters, assessments] = await Promise.all([
      doctorDashboardRepository.listOpenEncounters(patientIds),
      doctorDashboardRepository.listLatestAssessments(patientIds),
    ]);

    // ── Today's clinic ──────────────────────────────────────────────────────
    const clinic = todays
      .filter((a) => a.status !== AppointmentStatus.Cancelled)
      .map((a) => ({
        id: a.id,
        scheduledAt: a.scheduledAt,
        durationMins: a.durationMins,
        mode: a.mode,
        status: a.status,
        reason: a.reason,
        locationName: a.locationName,
        patientId: a.patient.id,
        // The UHID as well as the internal id: the worklist links each row to
        // that patient's chart, and clinician routes are keyed on the UHID.
        shriPatientId: a.patient.shriPatientId,
        patientName: `${a.patient.firstName} ${a.patient.lastName}`.trim(),
      }));

    const seen = clinic.filter((a) => a.status === AppointmentStatus.Completed).length;
    const next =
      clinic.find(
        (a) =>
          a.scheduledAt >= now &&
          (a.status === AppointmentStatus.Confirmed || a.status === AppointmentStatus.Requested),
      ) ?? null;

    // ── Needs attention ─────────────────────────────────────────────────────
    // Newest assessment wins: the repository returns them createdAt-desc, so
    // the first row seen for a patient is their latest.
    const latestByPatient = new Map<string, (typeof assessments)[number]>();
    for (const row of assessments) {
      const pid = row.encounter.patientId;
      if (!latestByPatient.has(pid)) latestByPatient.set(pid, row);
    }

    const openByPatient = new Map<string, (typeof openEncounters)[number]>();
    for (const row of openEncounters) {
      if (!openByPatient.has(row.patientId)) openByPatient.set(row.patientId, row);
    }

    const todayByPatient = new Set(clinic.map((a) => a.patientId));
    const overdueByPatient = new Set(
      todays
        .filter((a) => a.status === AppointmentStatus.Requested && a.scheduledAt < now)
        .map((a) => a.patient.id),
    );

    const needsAttention = panel
      .map((row) => {
        const patientId = row.patient.id;
        const assessment = latestByPatient.get(patientId) ?? null;
        const openEncounter = openByPatient.get(patientId) ?? null;

        const symptoms = assessment
          ? SYMPTOM_FIELDS.filter((f) => assessment[f]).map((f) => SYMPTOM_LABELS[f])
          : [];

        const signals: string[] = [];
        let score = 0;

        if (assessment?.urgentFlag === true) {
          signals.push('Stroke assessment flagged urgent');
          score += WEIGHT.urgentAssessment;
        }
        if (openEncounter !== null) {
          signals.push(`Open ${ENCOUNTER_TYPE_LABELS[openEncounter.type]} encounter`);
          score += WEIGHT.openEncounter;
        }
        if (symptoms.length >= MANY_SYMPTOMS_THRESHOLD) {
          signals.push(`${symptoms.length} symptoms recorded: ${symptoms.join(', ')}`);
          score += WEIGHT.manySymptoms;
        } else if (symptoms.length > 0) {
          signals.push(`Symptoms recorded: ${symptoms.join(', ')}`);
        }
        if (assessment?.lkwCertainty === LkwCertainty.Unknown && assessment.lkwAt === null) {
          signals.push('Last-known-well time not established');
        }
        if (todayByPatient.has(patientId)) {
          signals.push('In clinic today');
          score += WEIGHT.appointmentToday;
        }
        if (overdueByPatient.has(patientId)) {
          signals.push('Requested appointment past its slot, not yet confirmed');
          score += WEIGHT.overdueRequest;
        }

        return {
          patientId,
          shriPatientId: row.patient.shriPatientId,
          name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
          careRole: row.careRole,
          isPrimary: row.isPrimary,
          band: bandFor(score),
          score,
          signals,
          hasAssessment: assessment !== null,
          assessedAt: assessment?.createdAt ?? null,
        };
      })
      .filter((row) => row.score >= ATTENTION_THRESHOLD)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    // ── Trend ───────────────────────────────────────────────────────────────
    const trend: Array<{ month: string; label: string; total: number; completed: number }> = [];
    for (let i = 0; i < TREND_MONTHS; i++) {
      const monthDate = new Date(trendFrom.getFullYear(), trendFrom.getMonth() + i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const inMonth = trendRows.filter(
        (r) =>
          r.scheduledAt.getFullYear() === monthDate.getFullYear() &&
          r.scheduledAt.getMonth() === monthDate.getMonth(),
      );
      trend.push({
        month: key,
        label: monthDate.toLocaleString('en-IN', { month: 'short' }),
        total: inMonth.length,
        completed: inMonth.filter((r) => r.status === AppointmentStatus.Completed).length,
      });
    }

    /**
     * Per-day counts, bucketed by LOCAL date.
     *
     * ⚠️ `toISOString()` would bucket by UTC and shift an early-morning IST
     * clinic onto the previous day, so the key is built from local parts.
     * Cancelled appointments are excluded — they did not occupy a slot, and a
     * calendar that shades a day busy because of cancellations is lying about
     * the workload.
     */
    const dayKey = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const loadByDay = new Map<string, { total: number; completed: number }>();
    for (const row of loadRows) {
      if (row.status === AppointmentStatus.Cancelled) continue;
      const key = dayKey(row.scheduledAt);
      const bucket = loadByDay.get(key) ?? { total: 0, completed: 0 };
      bucket.total += 1;
      if (row.status === AppointmentStatus.Completed) bucket.completed += 1;
      loadByDay.set(key, bucket);
    }

    const dailyLoad: Array<{ date: string; total: number; completed: number }> = [];
    for (let i = 0; i < 43; i++) {
      const d = new Date(loadFrom.getTime() + i * 86_400_000);
      const key = dayKey(d);
      const bucket = loadByDay.get(key) ?? { total: 0, completed: 0 };
      dailyLoad.push({ date: key, total: bucket.total, completed: bucket.completed });
    }

    return {
      asOf: now,
      dailyLoad,
      today: {
        date: dayStart,
        total: clinic.length,
        seen,
        remaining: clinic.length - seen,
        next,
        clinic,
      },
      counts: {
        panelPatients: panel.length,
        upcoming: upcomingCount,
        urgentAssessments: [...latestByPatient.values()].filter((a) => a.urgentFlag).length,
        openEncounters: openEncounters.length,
      },
      needsAttention,
      trend,
    };
  },

  /**
   * The doctor's own appointment list. Same own-scope guarantee as getMyDay —
   * doctorId comes from the session, never the query string, so `range` can
   * only ever widen the window, never cross to another doctor's diary.
   */
  async listAppointments(
    userId: string,
    range: 'today' | 'upcoming' | 'past',
    now: Date = new Date(),
  ) {
    const doctorId = await doctorDashboardRepository.findDoctorProfileIdByUserId(userId);
    if (doctorId === null) {
      throw new AppError('Doctor profile not found.', 404);
    }

    const dayStart = startOfDay(now);
    const window =
      range === 'today'
        ? { from: dayStart, to: addDays(dayStart, 1) }
        : range === 'upcoming'
          ? { from: now, to: addDays(dayStart, 90) }
          : { from: addDays(dayStart, -180), to: now };

    const rows = await doctorDashboardRepository.listAppointmentsBetween(
      doctorId,
      window.from,
      window.to,
    );

    return rows.map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt,
      durationMins: a.durationMins,
      mode: a.mode,
      status: a.status,
      reason: a.reason,
      locationName: a.locationName,
      patientId: a.patient.id,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`.trim(),
    }));
  },
};
