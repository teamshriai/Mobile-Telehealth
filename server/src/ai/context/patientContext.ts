import { AiChunkSource } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { decryptProfile } from '../../profile/profile.repository';
import { decryptAppointment } from '../../appointment/appointment.repository';
import { decryptEncounter, decryptAssessment } from '../../encounter/encounter.repository';

// ─────────────────────────────────────────────────────────────────────────────
// Patient clinical context for the assistant.
//
// This is the SINGLE place that knows how to render a profile field, an
// appointment, an encounter, or a care team into text for the model — both
// the direct full-context path AND the chunk sync in ai/memory/chunkSync.ts
// consume this same output, so there is exactly one rendering of "what a
// stroke assessment looks like as a sentence" to keep correct.
//
// Each section carries its own source identity (sourceType/sourceId/
// sourceUpdatedAt) precisely so chunkSync can upsert/tombstone AiMemoryChunk
// rows keyed on that identity without a second, separate query pass.
//
// Reuses the repository decryptors rather than reimplementing them, per this
// codebase's own standing rule for encrypted fields.
// ─────────────────────────────────────────────────────────────────────────────

export type ContextSection = {
  sourceType: AiChunkSource;
  sourceId: string;
  /** Distinguishes multiple chunks from the same row — e.g. the five separate
   *  PatientProfile medical fields all share sourceId but not sourceField. */
  sourceField: string;
  sourceUpdatedAt: Date;
  text: string;
};

export type PatientContext = {
  /** True only for demo/fabricated records — see AI_DATA_POLICY. */
  isSyntheticData: boolean;
  patientId: string;
  /** First name and an age band only — see the demographics budget line. No
   *  phone, address, Aadhaar, ABHA or exact date of birth ever appears here. */
  demographicsLine: string;
  sections: ContextSection[];
};

function ageBand(dateOfBirth: Date | null): string {
  if (dateOfBirth === null) return 'age unknown';
  const ageYears = Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 86_400_000));
  const bandStart = Math.floor(ageYears / 10) * 10;
  return `${bandStart}s`;
}

function splitList(value: string | null, separators: RegExp): string[] {
  if (value === null) return [];
  return value
    .split(separators)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Returns null when the user has no clinical record to ground answers on
 * (a staff/doctor account, or a patient not yet fully registered) — callers
 * must treat that as "no context available", not as an error.
 */
export async function buildPatientContext(userId: string): Promise<PatientContext | null> {
  const profile = await prisma.patientProfile.findFirst({
    where: { userId, deletedAt: null },
  });
  if (profile === null) return null;

  const decrypted = decryptProfile(profile);
  const sections: ContextSection[] = [];

  const profileField = (field: string, label: string, value: string | null): void => {
    if (value === null || value.trim() === '') return;
    sections.push({
      sourceType: AiChunkSource.ProfileMedical,
      sourceId: profile.id,
      sourceField: field,
      sourceUpdatedAt: profile.updatedAt,
      text: `${label}: ${value}.`,
    });
  };

  const medications = splitList(decrypted.currentMedications, /[;\n]/);
  if (medications.length > 0) {
    profileField('currentMedications', 'Current medicines', medications.join('; '));
  }

  const allergiesRaw = decrypted.knownAllergies;
  const isNoneRecorded = allergiesRaw === null || /^(none|nil|no known)/i.test(allergiesRaw.trim());
  if (allergiesRaw !== null && !isNoneRecorded) {
    profileField('knownAllergies', 'Known allergies', allergiesRaw);
  }

  profileField('existingDiseases', 'Existing conditions', decrypted.existingDiseases);
  profileField('familyHistory', 'Family history', decrypted.familyHistory);
  profileField('previousSurgeries', 'Previous surgeries', decrypted.previousSurgeries);

  const appointments = await prisma.appointment.findMany({
    where: { patientId: profile.id },
    orderBy: { scheduledAt: 'desc' },
    take: 12,
    include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
  });
  for (const raw of appointments) {
    const appt = decryptAppointment(raw);
    const when = appt.scheduledAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const doctorName = appt.doctor
      ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`
      : 'a clinician';
    const reasonPart = appt.reason !== null ? ` — reason: ${appt.reason}` : '';
    sections.push({
      sourceType: AiChunkSource.Appointment,
      sourceId: appt.id,
      sourceField: '',
      sourceUpdatedAt: appt.updatedAt,
      text: `${appt.status} ${appt.mode} appointment on ${when} with ${doctorName}${reasonPart}.`,
    });
  }

  const encounters = await prisma.encounter.findMany({
    where: { patientId: profile.id },
    orderBy: { startedAt: 'desc' },
    take: 5,
    include: { strokeAssessment: true },
  });
  for (const rawEncounter of encounters) {
    const encounter = decryptEncounter(rawEncounter);
    const when = encounter.startedAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const complaintPart =
      encounter.chiefComplaint !== null ? ` — presented with: ${encounter.chiefComplaint}` : '';
    let text = `${encounter.type} visit on ${when} (${encounter.status})${complaintPart}.`;
    let latestUpdatedAt = encounter.updatedAt;

    if (encounter.strokeAssessment !== null) {
      const assessment = decryptAssessment(encounter.strokeAssessment);
      if (assessment.updatedAt > latestUpdatedAt) latestUpdatedAt = assessment.updatedAt;
      const positiveSymptoms = (
        [
          ['facial weakness', assessment.facialWeakness],
          ['arm weakness', assessment.armWeakness],
          ['leg weakness', assessment.legWeakness],
          ['speech difficulty', assessment.speechDifficulty],
          ['sudden confusion', assessment.suddenConfusion],
          ['vision problems', assessment.visionProblem],
          ['severe headache', assessment.severeHeadache],
          ['balance problems', assessment.balanceProblem],
          ['loss of consciousness', assessment.lossOfConsciousness],
        ] as const
      )
        .filter(([, present]) => present)
        .map(([label]) => label);
      // The schema's own rule: a checklist of REPORTED symptoms, never framed
      // as a diagnosis. That framing is preserved into the model's context so
      // it cannot be "explained away" by whatever wrote the surrounding text.
      if (positiveSymptoms.length > 0) {
        text += ` Symptoms reported at the time (not a diagnosis): ${positiveSymptoms.join(', ')}.`;
      }
      if (assessment.lkwAt !== null) {
        const lkw = assessment.lkwAt.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        text += ` Last known well: ${lkw} (${assessment.lkwCertainty}).`;
      }
    }
    sections.push({
      sourceType: AiChunkSource.Encounter,
      sourceId: encounter.id,
      sourceField: '',
      sourceUpdatedAt: latestUpdatedAt,
      text,
    });
  }

  const careTeam = await prisma.careTeamMember.findMany({
    where: { patientId: profile.id, activeTo: null },
    include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
  });
  if (careTeam.length > 0) {
    // One chunk for the whole team, not one per member — four names are not
    // four independently retrievable facts.
    const names = careTeam.map(
      (m) =>
        `Dr. ${m.doctor.firstName} ${m.doctor.lastName} (${m.careRole}${m.isPrimary ? ', primary' : ''})`,
    );
    const latestUpdatedAt = careTeam.reduce(
      (max, m) => (m.updatedAt > max ? m.updatedAt : max),
      careTeam[0].updatedAt,
    );
    sections.push({
      sourceType: AiChunkSource.CareTeam,
      // No single row identifies "the whole team" — the patient id is the
      // stable identity, disambiguated from the profile-field chunks (which
      // share the same id) by sourceType and sourceField.
      sourceId: profile.id,
      sourceField: 'careTeam',
      sourceUpdatedAt: latestUpdatedAt,
      text: `Care team: ${names.join('; ')}.`,
    });
  }

  const firstName = decrypted.firstName ?? 'the patient';
  const demographicsLine =
    `Patient: ${firstName}, ${ageBand(decrypted.dateOfBirth)}` +
    (decrypted.gender !== null ? `, ${decrypted.gender}` : '') +
    (decrypted.bloodGroup !== null ? `, blood group ${decrypted.bloodGroup}` : '') +
    '.';

  return {
    isSyntheticData: profile.isSyntheticData,
    patientId: profile.id,
    demographicsLine,
    sections,
  };
}

/** Total rendered character count — used to decide whether the 900-token
 *  bypass threshold is still valid, and as an early warning if it stops
 *  being one. */
export function contextCharCount(context: PatientContext): number {
  return context.sections.reduce((sum, s) => sum + s.text.length, 0);
}
