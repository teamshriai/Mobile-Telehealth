import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAB_REPORTS,
  VITALS,
  egfrCkdEpi2021,
  impliedFlag,
  type DemoLabReport,
} from '../reportsDemoData';
import { rangeText } from '../../../src/reports/labs.service';

// The demo lab data must survive a doctor's glance: the arithmetic between
// results holds, and every flag is the one its printed range implies.

const val = (r: DemoLabReport, name: string): number => {
  const hit = r.results.find((x) => x.name === name);
  assert.ok(hit, `${r.key}: missing ${name}`);
  return Number(hit.value);
};
const near = (a: number, b: number, tol: number, what: string): void =>
  assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b} (±${tol})`);

describe('demo lab reports — internally consistent', () => {
  it('every flag is exactly what its printed range implies', () => {
    for (const r of LAB_REPORTS)
      for (const x of r.results)
        assert.equal(x.flag, impliedFlag(x), `${r.key} ${x.name} = ${x.value}`);
  });

  it('red-cell indices follow from Hb, RBC and PCV; the differential totals 100', () => {
    for (const r of LAB_REPORTS.filter((x) => x.panelName.startsWith('Complete blood count'))) {
      const hb = val(r, 'Haemoglobin');
      const rbc = val(r, 'RBC count');
      const hct = val(r, 'Haematocrit (PCV)');
      near(val(r, 'MCV'), (hct / rbc) * 10, 0.1, `${r.key} MCV`);
      near(val(r, 'MCH'), (hb / rbc) * 10, 0.1, `${r.key} MCH`);
      near(val(r, 'MCHC'), (hb / hct) * 100, 0.1, `${r.key} MCHC`);
      const diff = ['Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils'].reduce(
        (n, k) => n + val(r, k),
        0,
      );
      assert.equal(diff, 100, `${r.key} differential`);
    }
  });

  it('lipid profile: Friedewald LDL and VLDL, non-HDL and the ratio', () => {
    for (const r of LAB_REPORTS.filter((x) => x.panelName === 'Lipid profile')) {
      const tc = val(r, 'Total cholesterol');
      const tg = val(r, 'Triglycerides');
      const hdl = val(r, 'HDL cholesterol');
      near(val(r, 'LDL cholesterol (calculated)'), tc - hdl - tg / 5, 0.5, `${r.key} LDL`);
      near(val(r, 'VLDL cholesterol (calculated)'), tg / 5, 0.5, `${r.key} VLDL`);
      near(val(r, 'Non-HDL cholesterol'), tc - hdl, 0, `${r.key} non-HDL`);
      near(val(r, 'Total cholesterol / HDL ratio'), tc / hdl, 0.05, `${r.key} ratio`);
    }
  });

  it('eGFR is CKD-EPI 2021 for a 56-year-old woman', () => {
    for (const r of LAB_REPORTS.filter((x) => x.results.some((y) => y.name.startsWith('eGFR')))) {
      near(
        val(r, 'eGFR (CKD-EPI 2021)'),
        egfrCkdEpi2021(val(r, 'Creatinine'), 56, true),
        1,
        `${r.key} eGFR`,
      );
    }
  });

  it('estimated average glucose = 28.7 × HbA1c − 46.7', () => {
    for (const r of LAB_REPORTS.filter((x) => x.results.some((y) => y.name === 'HbA1c'))) {
      near(val(r, 'Estimated average glucose'), 28.7 * val(r, 'HbA1c') - 46.7, 1, `${r.key} eAG`);
    }
  });

  it('LFT: indirect = total − direct bilirubin; globulin and A/G from protein and albumin', () => {
    for (const r of LAB_REPORTS.filter((x) => x.panelName.startsWith('Liver function'))) {
      near(
        val(r, 'Bilirubin, indirect'),
        val(r, 'Bilirubin, total') - val(r, 'Bilirubin, direct'),
        0.01,
        `${r.key} bilirubin`,
      );
      near(
        val(r, 'Globulin'),
        val(r, 'Total protein') - val(r, 'Albumin'),
        0.01,
        `${r.key} globulin`,
      );
      near(
        val(r, 'Albumin / globulin ratio'),
        val(r, 'Albumin') / val(r, 'Globulin'),
        0.01,
        `${r.key} A/G`,
      );
    }
  });

  it('every report is reported after it was collected (same day)', () => {
    for (const r of LAB_REPORTS)
      assert.ok(r.reported > r.collected, `${r.key}: ${r.collected} → ${r.reported}`);
  });

  it('the admission note values are used as written (glucose 6.1 mmol/L = 110 mg/dL)', () => {
    const bio = LAB_REPORTS.find((r) => r.key === 'admit-biochem')!;
    near(val(bio, 'Plasma glucose, random') / 18.016, 6.1, 0.05, 'glucose mmol/L');
  });
});

describe('demo vital signs — every type present and BMI consistent', () => {
  it('each of the nine types has at least one reading', () => {
    const types = new Set(VITALS.map((v) => v.type));
    for (const t of [
      'BloodPressure',
      'HeartRate',
      'SpO2',
      'Temperature',
      'RespiratoryRate',
      'BloodGlucose',
      'Weight',
      'Height',
      'Bmi',
    ])
      assert.ok(types.has(t as never), t);
  });
  it('blood pressure always has a diastolic value, nothing else does', () => {
    for (const v of VITALS)
      assert.equal(v.type === 'BloodPressure', v.value2 !== undefined, `${v.day} ${v.type}`);
  });
  it('BMI = weight / height² on the same visit', () => {
    for (const day of ['admit', 'followup'] as const) {
      const w = VITALS.find((v) => v.day === day && v.type === 'Weight')!.value;
      const h = VITALS.find((v) => v.day === day && v.type === 'Height')!.value / 100;
      near(
        VITALS.find((v) => v.day === day && v.type === 'Bmi')!.value,
        w / (h * h),
        0.05,
        `${day} BMI`,
      );
    }
  });
  it('the admission and follow-up notes are matched (176/92, 134/82 and pulse 76)', () => {
    const bp = (day: string, time: string) =>
      VITALS.find((v) => v.day === day && v.time === time && v.type === 'BloodPressure');
    assert.deepEqual([bp('admit', '07:44')?.value, bp('admit', '07:44')?.value2], [176, 92]);
    assert.deepEqual([bp('followup', '10:40')?.value, bp('followup', '10:40')?.value2], [134, 82]);
    assert.equal(
      VITALS.find((v) => v.day === 'followup' && v.time === '10:40' && v.type === 'HeartRate')
        ?.value,
      76,
    );
  });
});

describe('rangeText — the printed range when the lab gave none as text', () => {
  it('formats low–high, upper-only and lower-only ranges', () => {
    assert.equal(
      rangeText({ referenceRangeText: null, referenceLow: 12, referenceHigh: 15 }),
      '12–15',
    );
    assert.equal(
      rangeText({ referenceRangeText: null, referenceLow: null, referenceHigh: 32 }),
      '< 32',
    );
    assert.equal(
      rangeText({ referenceRangeText: null, referenceLow: 50, referenceHigh: null }),
      '> 50',
    );
    assert.equal(
      rangeText({ referenceRangeText: 'Desirable < 200', referenceLow: null, referenceHigh: 200 }),
      'Desirable < 200',
    );
  });
});
