import type { EncounterType } from '../../types/domain'

/**
 * Human wording for EncounterType.
 *
 * ⚠️ These are read by a clinician, so they cannot be the enum member names —
 * "ClinicVisit" is a database identifier and showing it is a leak, not a
 * label. Every member is listed explicitly rather than derived by splitting
 * camel case, so adding a type without deciding how to say it fails to
 * compile. The server has the same map for the strings it composes itself
 * (doctorDashboard.service.ts); the duplication is deliberate — these are two
 * different presentation layers, and sharing a translation table across the
 * API boundary would be worse than restating seven words.
 */
const LABELS: Record<EncounterType, string> = {
  ClinicVisit: 'Clinic visit',
  AmbulanceIntake: 'Ambulance intake',
  Emergency: 'Emergency',
  Telehealth: 'Teleconsultation',
  FollowUp: 'Follow-up',
  Screening: 'Screening',
  FieldRegistration: 'Field registration',
}

/** Falls back to the raw value rather than throwing: an unrecognised type is
 *  a deployment mismatch, and hiding the encounter would be worse than
 *  showing an ugly word for it. */
export function encounterTypeLabel(type: string): string {
  return LABELS[type as EncounterType] ?? type
}
