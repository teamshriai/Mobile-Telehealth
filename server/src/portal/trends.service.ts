import type { LabFlag, VitalSource } from '@prisma/client';
import { requireOwnPatientId } from './ownPatient';
import { vitalsRepository, type VitalReading } from '../reports/vitals.service';
import { labsRepository } from '../reports/labs.service';
import { medicationService, type DayDoses } from '../medication/medication.service';

// ─────────────────────────────────────────────────────────────────────────────
// GET /me/trends — the few series Home's "Your readings over time" draws, in
// one request (Home already makes several).
//
// ⚠️ NOTHING HERE INTERPRETS A VALUE. Readings keep their source (clinic, home
// device, or you); lab results keep the lab's own range text and flag, as
// issued. Doses are "as you marked them". The chart draws these; it never
// calls one good, bad, better or worse.
// ─────────────────────────────────────────────────────────────────────────────

export interface VitalPoint {
  at: Date;
  value: number;
  /** Diastolic, for blood pressure. */
  value2: number | null;
  unit: string;
  source: VitalSource;
  /** Where it was measured, or the home device. */
  place: string | null;
}

export interface LabPoint {
  at: Date;
  value: number;
  /** As printed on the report ("5.8"). */
  display: string;
  unit: string | null;
  /** The lab's own range, verbatim. */
  range: string | null;
  /** The lab's own flag, as issued — never derived here. */
  flag: LabFlag | null;
  reportNumber: string;
}

export interface Trends {
  bloodPressure: VitalPoint[];
  pulse: VitalPoint[];
  weight: VitalPoint[];
  ldl: LabPoint[];
  hba1c: LabPoint[];
  doses: DayDoses[];
}

/** LOINC codes of the repeated tests Home offers. */
const LAB_CODES = { ldl: '13457-7', hba1c: '4548-4' } as const;

function vitalSeries(readings: VitalReading[], type: VitalReading['type']): VitalPoint[] {
  return readings
    .filter((r) => r.type === type && !r.isDerived)
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
    .map((r) => ({
      at: r.measuredAt,
      value: r.value,
      value2: r.value2,
      unit: r.unit,
      source: r.source,
      place: r.placeName ?? r.deviceName,
    }));
}

async function labSeries(patientId: string): Promise<Pick<Trends, 'ldl' | 'hba1c'>> {
  const reports = await labsRepository.reportsFor(patientId);
  const pick = (code: string): LabPoint[] => {
    const points = reports
      .flatMap((rep) =>
        rep.results
          .filter((r) => r.analyteCode === code && r.valueNumeric !== null)
          .map((r) => ({
            at: rep.collectedAt,
            value: r.valueNumeric as number,
            display: r.value,
            unit: r.unit,
            range: r.referenceRange,
            flag: r.flag,
            reportNumber: rep.reportNumber,
          })),
      )
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    // One axis, one unit: a result in another unit is left out, never converted.
    const unit = points.at(-1)?.unit ?? null;
    return points.filter((p) => p.unit === unit);
  };
  return { ldl: pick(LAB_CODES.ldl), hba1c: pick(LAB_CODES.hba1c) };
}

export const trendsService = {
  async forUser(userId: string, now = new Date()): Promise<Trends> {
    const patientId = await requireOwnPatientId(userId);
    const [readings, labs, doses] = await Promise.all([
      vitalsRepository.readingsFor(patientId),
      labSeries(patientId),
      medicationService.dosesByDay(userId, now, 30),
    ]);
    return {
      bloodPressure: vitalSeries(readings, 'BloodPressure'),
      pulse: vitalSeries(readings, 'HeartRate'),
      weight: vitalSeries(readings, 'Weight'),
      ...labs,
      doses,
    };
  },
};
