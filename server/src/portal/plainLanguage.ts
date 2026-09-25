/**
 * Prescriber shorthand → words a patient reads.
 *
 * ⚠️ The stored values are what the clinician chose (OD, BD, SC…) and stay
 * exactly as signed; this is presentation only. An unknown value is shown as
 * written rather than guessed at — a wrong translation of a dosing schedule
 * is worse than an unfamiliar abbreviation the patient can ask about.
 */
const FREQUENCY: Record<string, string> = {
  OD: 'Once a day',
  BD: 'Twice a day',
  TDS: 'Three times a day',
  QDS: 'Four times a day',
  HS: 'At bedtime',
  STAT: 'Once, straight away',
  SOS: 'Only when needed',
  PRN: 'Only when needed',
  WEEKLY: 'Once a week',
};

const ROUTE: Record<string, string> = {
  ORAL: 'By mouth',
  PO: 'By mouth',
  SC: 'Injection under the skin',
  IM: 'Injection into a muscle',
  IV: 'Into a vein (drip or injection)',
  TOPICAL: 'On the skin',
  INHALED: 'Inhaled',
  SL: 'Under the tongue',
};

export function frequencyInWords(raw: string): string {
  return FREQUENCY[raw.trim().toUpperCase()] ?? raw;
}

export function routeInWords(raw: string): string {
  return ROUTE[raw.trim().toUpperCase()] ?? raw;
}
