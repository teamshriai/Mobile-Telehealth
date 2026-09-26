import type { VitalSource, VitalType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional } from '../utils/encryption';
import { requireOwnPatientId } from '../portal/ownPatient';

// ─────────────────────────────────────────────────────────────────────────────
// Vital signs — every reading with where it came from.
//
// ⚠️ SOURCE ON EVERY READING. A blood pressure measured in clinic and one from
// the patient's home monitor are both real, and are both shown — but never as
// if they were the same thing. Nothing here calls a reading normal or not.
// ─────────────────────────────────────────────────────────────────────────────

/** The fixed order the portal shows vital signs in. */
export const VITAL_ORDER: VitalType[] = [
  'BloodPressure',
  'HeartRate',
  'SpO2',
  'Temperature',
  'RespiratoryRate',
  'BloodGlucose',
  'Weight',
  'Height',
  'Bmi',
];

export interface VitalReading {
  id: string;
  type: VitalType;
  value: number;
  value2: number | null;
  unit: string;
  qualifier: string | null;
  source: VitalSource;
  placeName: string | null;
  recordedByRole: string | null;
  deviceName: string | null;
  isDerived: boolean;
  measuredAt: Date;
  note: string | null;
}

export interface VitalLatest {
  type: VitalType;
  reading: VitalReading | null;
  /** Oldest first, at most 12 — for a sparkline. */
  trend: Array<{ at: Date; value: number; value2: number | null }>;
}

export const vitalsRepository = {
  async readingsFor(patientId: string, take = 500): Promise<VitalReading[]> {
    const rows = await prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { measuredAt: 'desc' },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      value: r.value,
      value2: r.value2,
      unit: r.unit,
      qualifier: r.qualifier,
      source: r.source,
      placeName: r.placeName,
      recordedByRole: r.recordedByRole,
      deviceName: r.deviceName,
      isDerived: r.isDerived,
      measuredAt: r.measuredAt,
      note: decryptFieldOptional(r.note) ?? null,
    }));
  },
};

export function latestByType(readings: VitalReading[]): VitalLatest[] {
  return VITAL_ORDER.map((type) => {
    const ofType = readings.filter((r) => r.type === type); // newest first
    return {
      type,
      reading: ofType[0] ?? null,
      trend: ofType
        .slice(0, 12)
        .reverse()
        .map((r) => ({ at: r.measuredAt, value: r.value, value2: r.value2 })),
    };
  });
}

export const vitalsService = {
  async list(userId: string): Promise<{ latest: VitalLatest[]; readings: VitalReading[] }> {
    const patientId = await requireOwnPatientId(userId);
    const readings = await vitalsRepository.readingsFor(patientId);
    return { latest: latestByType(readings), readings };
  },
};
