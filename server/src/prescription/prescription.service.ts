import { verify } from '@node-rs/argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { careRelationshipService } from '../services/careRelationship.service';
import { roleHasPermission, Permission } from '../config/permissions';
import { prescriptionRepository, type PrescriptionWithItems } from './prescription.repository';
import {
  normaliseAllergens,
  checkAllergy,
  checkDose,
  canSign,
  type AllergyHit,
  type DoseVerdict,
} from './drugSafety';
import type { AddItemDto, OverrideDto } from './prescription.validator';
import type { RoleName } from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Service — S-06-07
//
// ⚠️ THE ONE RULE THIS FILE EXISTS TO ENFORCE. A prescription cannot be signed
// while a documented-allergy hard stop stands against any line in it, and the
// check is re-run FROM THE DATABASE at sign time. The client's opinion about
// whether it is safe is never trusted — a hard stop evaluated only in the
// browser is decoration.
//
// The check itself lives in drugSafety.ts, which imports nothing. See that
// file's header for why.
// ─────────────────────────────────────────────────────────────────────────────

type Actor = { id: string; roleName: string };
type Meta = { ipAddress?: string; userAgent?: string };

export interface DoseWarning {
  itemId: string;
  drugName: string;
  verdict: DoseVerdict;
}

export interface AlternativeDrug {
  id: string;
  genericName: string;
  strength: string;
  form: string;
  route: string;
  isNlem: boolean;
}

export interface SafetyEvaluation {
  /** Blocking. Sign is disabled while any of these stand. */
  hardStops: Array<AllergyHit & { itemId: string; alternatives: AlternativeDrug[] }>;
  /** Advisory. Shown, but never blocks — see drugSafety.canSign's comment. */
  doseWarnings: DoseWarning[];
  canSign: boolean;
  /** Which allergens the check ran against — so an empty result is legible. */
  documentedAllergens: string[];
}

/** Indian financial year, for the RX/{fy}/{seq} identifier (M-06.8). */
function financialYear(at: Date): string {
  const y = at.getFullYear();
  const startYear = at.getMonth() >= 3 ? y : y - 1; // FY starts in April
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}

/**
 * Allocate the next RX number and create the basket, retrying on collision.
 *
 * ⚠️ The allocation is read-then-write, so two clinicians opening a basket in
 * the same moment can read the same maximum. The unique index on `rxNumber` is
 * what actually guarantees the identifier, and this loop is how a loser of that
 * race recovers instead of showing "a record with this value already exists" on
 * the prescription screen. Bounded, because a failure that survives five
 * attempts is not contention — it is a bug, and it should surface as one.
 *
 * The number is never reused: allocation reads the maximum issued, not the
 * count, so a gap left by a deleted draft stays a gap. A prescription number is
 * a dispensing-facing identifier and reissuing one would point a pharmacist at
 * the wrong record.
 */
async function createWithNextRxNumber(
  patientId: string,
  encounterId: string,
  authorUserId: string,
): Promise<PrescriptionWithItems> {
  const prefix = `RX/${financialYear(new Date())}/`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = (await prescriptionRepository.maxSequenceForFinancialYear(prefix)) + 1 + attempt;
    try {
      return await prescriptionRepository.create({
        patientId,
        encounterId,
        rxNumber: `${prefix}${String(seq).padStart(6, '0')}`,
        authorUserId,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }

  throw new AppError('Could not allocate a prescription number. Please try again.', 503);
}

async function attestationFor(userId: string): Promise<{
  signerName: string;
  signerRegistrationNumber: string | null;
  signerHprId: string | null;
}> {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true, registrationNumber: true, hprId: true },
  });
  if (doctor === null) {
    throw new AppError('Only a clinician with a doctor profile can sign a prescription.', 403);
  }
  return {
    signerName: `Dr. ${doctor.firstName} ${doctor.lastName}`.trim(),
    signerRegistrationNumber: doctor.registrationNumber,
    signerHprId: doctor.hprId,
  };
}

export const prescriptionService = {
  async searchDrugs(query: string) {
    return prescriptionRepository.searchDrugs(query);
  },

  /**
   * The basket for this encounter. One open draft per clinician per
   * encounter — reopening the screen resumes rather than starting again,
   * which is what stops half-written prescriptions accumulating.
   */
  async getOrCreateDraft(
    actor: Actor,
    encounterId: string,
    meta: Meta,
  ): Promise<PrescriptionWithItems> {
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { id: true, patientId: true },
    });
    if (encounter === null) throw new AppError('Encounter not found.', 404);

    await careRelationshipService.requirePatientAccess(actor, encounter.patientId, meta);

    const existing = await prescriptionRepository.findDraftForEncounter(encounterId, actor.id);
    if (existing !== null) return existing;

    const created = await createWithNextRxNumber(encounter.patientId, encounterId, actor.id);

    auditService.log({
      action: AuditAction.PrescriptionCreated,
      userId: actor.id,
      resource: 'prescription',
      resourceId: created.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { encounterId },
    });

    return created;
  },

  async listForPatient(actor: Actor, patientId: string, meta: Meta) {
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);
    return prescriptionRepository.listForPatient(patientId);
  },

  async getById(actor: Actor, id: string, meta: Meta): Promise<PrescriptionWithItems> {
    const patientId = await prescriptionRepository.findOwnerPatientId(id);
    // Resolve the owner FIRST so an unknown id reveals nothing more than an
    // unauthorised one — same discipline as clinicalNote.service.
    if (patientId === null) throw new AppError('Prescription not found.', 404);
    await careRelationshipService.requirePatientAccess(actor, patientId, meta);

    const rx = await prescriptionRepository.findById(id);
    if (rx === null) throw new AppError('Prescription not found.', 404);
    return rx;
  },

  async addItem(actor: Actor, id: string, dto: AddItemDto, meta: Meta): Promise<void> {
    const rx = await this.getById(actor, id, meta);
    if (rx.status !== 'Draft') {
      throw new AppError('This prescription has been signed and can no longer be changed.', 409);
    }

    const drug = await prescriptionRepository.findDrug(dto.drugId);
    if (drug === null) throw new AppError('That medicine is not in the formulary.', 400);

    await prescriptionRepository.addItem(id, {
      drugId: dto.drugId,
      dose: dto.dose,
      doseUnit: dto.doseUnit,
      route: dto.route,
      frequency: dto.frequency,
      durationDays: dto.durationDays,
      indicationCode: dto.indicationCode ?? null,
      substitutionAllowed: dto.substitutionAllowed,
      instructions: dto.instructions ?? null,
    });
  },

  async removeItem(actor: Actor, id: string, itemId: string, meta: Meta): Promise<void> {
    await this.getById(actor, id, meta);
    const removed = await prescriptionRepository.removeItem(id, itemId);
    if (!removed) {
      throw new AppError('That line could not be removed. The prescription may be signed.', 409);
    }
  },

  /**
   * Run every deterministic check against the current basket.
   *
   * ⚠️ Called on every basket change AND again inside sign(). The UI uses it
   * to render the gate; sign() uses it to decide. They must be the same code
   * path or they will drift, and a drifted safety check is worse than none —
   * it looks like protection.
   */
  async evaluate(actor: Actor, id: string, meta: Meta): Promise<SafetyEvaluation> {
    const rx = await this.getById(actor, id, meta);

    const patient = await prisma.patientProfile.findUnique({
      where: { id: rx.patientId },
      select: { knownAllergies: true, dateOfBirth: true },
    });

    // ⚠️ knownAllergies is ENCRYPTED on this table. Reading it through a
    // bare Prisma select returns ciphertext, so it must be decrypted here.
    const { decryptFieldOptional } = await import('../utils/encryption');
    const allergyText = decryptFieldOptional(patient?.knownAllergies ?? null) ?? null;
    const documentedAllergens = normaliseAllergens(allergyText);

    const rules = await prescriptionRepository.listActiveRules();
    const overridden = new Set(
      (await prescriptionRepository.listOverrides(id)).map((o) => o.drugName.toLowerCase()),
    );

    const isPaediatric = (() => {
      if (!patient?.dateOfBirth) return false;
      const years = (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 3_600_000);
      return years < 18;
    })();

    const hardStops: SafetyEvaluation['hardStops'] = [];
    const doseWarnings: DoseWarning[] = [];

    for (const item of rx.items) {
      const hit = checkAllergy(documentedAllergens, item.drug, rules);
      // A recorded G4 override clears the stop for that drug on THIS
      // prescription only — never globally, and never for another patient.
      if (hit !== null && !overridden.has(item.drug.genericName.toLowerCase())) {
        const alternatives = await prescriptionRepository.findAlternatives(
          hit.blocksClass,
          item.drug.therapeuticClass,
          item.drug.route,
        );
        hardStops.push({
          ...hit,
          itemId: item.id,
          alternatives: alternatives.map((a) => ({
            id: a.id,
            genericName: a.genericName,
            strength: a.strength,
            form: a.form,
            route: a.route,
            isNlem: a.isNlem,
          })),
        });
      }

      const band = await prescriptionRepository.doseBandFor(
        item.drugId,
        isPaediatric ? 'Paediatric' : 'Adult',
      );
      const verdict = checkDose(
        Number(item.dose),
        item.doseUnit,
        band === null
          ? null
          : {
              cohort: band.cohort,
              minDose: Number(band.minDose),
              maxDose: Number(band.maxDose),
              unit: band.unit,
              perKg: band.perKg,
              maxPerDay: band.maxPerDay === null ? null : Number(band.maxPerDay),
            },
        // No weight is passed. `vital_signs` may hold one, but there is no
        // agreed rule yet for how recent, or from which source (clinic scale
        // vs home), a weight must be to dose by. checkDose reports 'unknown'
        // rather than 'ok' for per-kg bands — see its comment. Guessing a
        // weight here would be fabrication.
        null,
      );
      if (verdict.status !== 'ok') {
        doseWarnings.push({ itemId: item.id, drugName: item.drug.genericName, verdict });
      }
    }

    if (hardStops.length > 0) {
      auditService.log({
        action: AuditAction.HardStopTriggered,
        userId: actor.id,
        resource: 'prescription',
        resourceId: id,
        severity: AuditSeverity.Warning,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          count: hardStops.length,
          drugs: hardStops.map((h) => h.drugName),
          allergens: hardStops.map((h) => h.allergenKey),
        },
      });
    }

    return {
      hardStops,
      doseWarnings,
      canSign: canSign(hardStops) && rx.items.length > 0,
      documentedAllergens,
    };
  },

  /**
   * Sign. ⚠️ Re-evaluates from the database first — the basket may have
   * changed, the patient's allergies may have been updated, or the caller may
   * simply be lying about having cleared the gate.
   */
  async sign(actor: Actor, id: string, meta: Meta): Promise<PrescriptionWithItems> {
    const rx = await this.getById(actor, id, meta);
    if (rx.status !== 'Draft') throw new AppError('This prescription is already signed.', 409);
    if (rx.authorUserId !== actor.id) {
      throw new AppError('Only the author can sign this prescription.', 403);
    }
    if (!roleHasPermission(actor.roleName as RoleName, Permission.RxSignOwn)) {
      throw new AppError('You may draft a prescription but not sign it.', 403);
    }

    const evaluation = await this.evaluate(actor, id, meta);
    if (evaluation.hardStops.length > 0) {
      throw new AppError(
        'This prescription is blocked by a documented allergy and cannot be signed.',
        409,
      );
    }
    if (rx.items.length === 0) {
      throw new AppError('Add at least one medicine before signing.', 400);
    }

    const attestation = await attestationFor(actor.id);
    const signed = await prescriptionRepository.sign(id, {
      signedByUserId: actor.id,
      ...attestation,
    });
    if (!signed) throw new AppError('This prescription is already signed.', 409);

    auditService.log({
      action: AuditAction.PrescriptionSigned,
      userId: actor.id,
      resource: 'prescription',
      resourceId: id,
      severity: AuditSeverity.Info,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { itemCount: rx.items.length, rxNumber: rx.rxNumber },
    });

    const fresh = await prescriptionRepository.findById(id);
    return fresh!;
  },

  /**
   * G4 override of a hard stop.
   *
   * ⚠️ Requires a reason AND a second consultant's live authentication. Both
   * identities are recorded. UI_ATLAS §4.4 defines G4 as "a second qualified
   * user must co-sign", and §4.9 makes this the one audit event that must
   * ALERT rather than merely record.
   *
   * The second consultant is authenticated by password here rather than
   * trusted from the client, because an override that anyone can claim a
   * colleague approved is not a dual gate — it is a checkbox.
   */
  async overrideHardStop(
    actor: Actor,
    id: string,
    dto: OverrideDto,
    meta: Meta,
  ): Promise<{ overrideId: string; audited: boolean }> {
    if (!roleHasPermission(actor.roleName as RoleName, Permission.RxOverrideHardStop)) {
      throw new AppError('You are not authorised to override a safety hard stop.', 403);
    }

    const rx = await this.getById(actor, id, meta);
    if (rx.status !== 'Draft') throw new AppError('This prescription is already signed.', 409);

    // ── Authenticate the second consultant ──────────────────────────────
    const second = await prisma.user.findFirst({
      where: { email: dto.secondConsultantEmail.toLowerCase(), deletedAt: null, isActive: true },
      select: {
        id: true,
        passwordHash: true,
        role: { select: { name: true } },
        doctorProfile: { select: { firstName: true, lastName: true, registrationNumber: true } },
      },
    });

    // ⚠️ One message for every failure mode below — a distinct "no such user"
    // would turn this into a staff-directory oracle.
    const REFUSED = 'Second consultant could not be authenticated.';
    if (second === null || second.doctorProfile === null) throw new AppError(REFUSED, 403);

    // ⚠️ A NULL passwordHash takes the SAME refusal path, and that is a
    // deliberate safety choice, not an oversight.
    //
    // This is the G4 gate: a clinician is about to prescribe past a documented
    // allergy, and the whole control rests on a SECOND named human proving who
    // they are. An account provisioned for mobile + OTP has no password, so
    // there is nothing here to prove it with — and the two wrong answers are
    // both worse than refusing. Waving it through would let anyone who knows a
    // passwordless consultant's email countersign an anaphylaxis override.
    // Naming the cause would tell an attacker which colleague to target.
    //
    // ⚠️ So this FAILS CLOSED and says nothing extra. The operational fix is
    // to give consultants who hold `rx:override:hard-stop` a password, or to
    // build OTP counter-signature — either is a deliberate piece of work, not
    // something to improvise inside an override handler.
    const passwordOk =
      second.passwordHash !== null
      && (await verify(second.passwordHash, dto.secondConsultantPassword));
    if (!passwordOk) throw new AppError(REFUSED, 403);

    if (second.id === actor.id) {
      throw new AppError('The second consultant must be a different clinician.', 400);
    }
    if (!roleHasPermission(second.role.name, Permission.RxOverrideHardStop)) {
      throw new AppError('That clinician is not authorised to countersign an override.', 403);
    }

    const evaluation = await this.evaluate(actor, id, meta);
    const stop = evaluation.hardStops.find((h) => h.itemId === dto.itemId);
    if (stop === undefined) {
      throw new AppError('There is no outstanding hard stop on that line.', 409);
    }

    const overriddenByName = (await attestationFor(actor.id)).signerName;

    const overrideId = await prescriptionRepository.recordOverride({
      prescriptionId: id,
      drugName: stop.drugName,
      allergenKey: stop.allergenKey,
      ruleText: stop.rationale,
      reason: dto.reason,
      overriddenByUserId: actor.id,
      overriddenByName,
      secondConsultantUserId: second.id,
      secondConsultantName:
        `Dr. ${second.doctorProfile.firstName} ${second.doctorProfile.lastName}`.trim(),
      secondConsultantRegistrationNumber: second.doctorProfile.registrationNumber,
    });

    // ⚠️ logCritical, not log. This is the one event UI_ATLAS says must alert
    // and be reviewed within 24 hours — it is not acceptable for it to be
    // lost to a fire-and-forget write.
    const audited = await auditService.logCritical({
      action: AuditAction.HardStopOverridden,
      userId: actor.id,
      resource: 'prescription_override',
      resourceId: overrideId,
      severity: AuditSeverity.Critical,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        prescriptionId: id,
        drug: stop.drugName,
        allergen: stop.allergenKey,
        secondConsultantUserId: second.id,
        // The reason text is NOT duplicated here — it is stored encrypted on
        // the override row. See breakGlass.service for the same reasoning.
      },
    });

    return { overrideId, audited };
  },
};
