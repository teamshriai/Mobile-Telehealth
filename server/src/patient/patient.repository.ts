import type { PatientProfile, Prisma } from '@prisma/client';
import { RegistrationSource, IdentityStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptFieldOptional, encryptFieldOptional, hmacBlindIndex } from '../utils/encryption';
import { computePhoneNumberHash } from '../services/patientIdentity.service';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Repository
//
// The only layer in this module that touches prisma, and the only layer that
// knows about field-level encryption — the service and controller both work
// in plaintext. Follows profile.repository.ts's encryption convention exactly
// (this module's PatientProfile rows are the SAME table, so drift between the
// two repositories' encrypted-field handling would be a real bug, not a
// stylistic inconsistency).
// ─────────────────────────────────────────────────────────────────────────────

/** Must match profile.repository.ts's ENCRYPTED_FIELDS exactly — same table. */
const ENCRYPTED_FIELDS = [
  'phoneNumber',
  'village',
  'district',
  'state',
  'emergencyContactName',
  'emergencyContactPhone',
] as const;

function decryptPatient<T extends Partial<PatientProfile>>(row: T): T {
  const out = { ...row };
  for (const field of ENCRYPTED_FIELDS) {
    if (field in row) {
      out[field] = decryptFieldOptional(row[field]);
    }
  }
  if ('abhaId' in row && row.abhaId) {
    out.abhaId = decryptFieldOptional(row.abhaId);
  }
  return out;
}

/** Narrow projection for search results — never the internal id, never a
 *  phone number or medical summary. Same discipline as doctor.repository.ts's
 *  PUBLIC_SELECT: an explicit column list, not a filter applied after the
 *  query, so a future column added to the model cannot silently start
 *  leaking through search. */
const SEARCH_RESULT_SELECT = {
  shriPatientId: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  district: true,
  identityStatus: true,
  encounters: {
    select: { startedAt: true },
    orderBy: { startedAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.PatientProfileSelect;

export type PatientSearchResult = Prisma.PatientProfileGetPayload<{
  select: typeof SEARCH_RESULT_SELECT;
}>;

export interface CreatePatientInput {
  shriPatientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  dobIsEstimated: boolean;
  gender?: Prisma.PatientProfileCreateInput['gender'];
  mobile?: string | null;
  abhaId?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  registrationSource: RegistrationSource;
  registeredByUserId?: string | null;
  identityStatus: IdentityStatus;
}

export const patientRepository = {
  /**
   * Creates a PatientProfile with no User row — the defining capability this
   * module adds. userId is omitted entirely (not set to null explicitly;
   * Prisma leaves an unset optional relation field absent), matching the
   * schema's nullable userId.
   */
  async create(data: CreatePatientInput): Promise<PatientProfile> {
    const row = await prisma.patientProfile.create({
      data: {
        shriPatientId: data.shriPatientId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        dobIsEstimated: data.dobIsEstimated,
        gender: data.gender,
        phoneNumber: encryptFieldOptional(data.mobile),
        phoneNumberHash: computePhoneNumberHash(data.mobile),
        abhaId: encryptFieldOptional(data.abhaId),
        abhaIdHash: data.abhaId ? hmacBlindIndex(data.abhaId) : null,
        village: encryptFieldOptional(data.village),
        district: encryptFieldOptional(data.district),
        state: encryptFieldOptional(data.state),
        emergencyContactName: encryptFieldOptional(data.emergencyContactName),
        emergencyContactPhone: encryptFieldOptional(data.emergencyContactPhone),
        registrationSource: data.registrationSource,
        registeredByUserId: data.registeredByUserId,
        identityStatus: data.identityStatus,
      },
    });
    return decryptPatient(row);
  },

  async findById(id: string): Promise<PatientProfile | null> {
    const row = await prisma.patientProfile.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? decryptPatient(row) : null;
  },

  async findByShriPatientId(shriPatientId: string): Promise<PatientProfile | null> {
    const row = await prisma.patientProfile.findFirst({
      where: { shriPatientId, deletedAt: null },
    });
    return row ? decryptPatient(row) : null;
  },

  /** Exact-match search by ABHA blind index. */
  async searchByAbha(abhaId: string, page: number, pageSize: number) {
    const abhaHash = hmacBlindIndex(abhaId);
    return this.paginatedSearch({ abhaIdHash: abhaHash, deletedAt: null }, page, pageSize);
  },

  /** Exact-match search by mobile blind index. Deliberately NOT unique —
   *  may legitimately return more than one patient (a shared handset). */
  async searchByMobile(normalizedMobile: string, page: number, pageSize: number) {
    const mobileHash = hmacBlindIndex(normalizedMobile);
    return this.paginatedSearch({ phoneNumberHash: mobileHash, deletedAt: null }, page, pageSize);
  },

  async searchByShriPatientId(shriPatientId: string, page: number, pageSize: number) {
    return this.paginatedSearch({ shriPatientId, deletedAt: null }, page, pageSize);
  },

  /** Prefix-insensitive name match, using the existing [lastName, firstName]
   *  index. Caller (the validator) guarantees at least a surname plus one
   *  more signal before this is ever called. */
  async searchByName(
    lastName: string,
    firstName: string | undefined,
    dateOfBirth: Date | undefined,
    page: number,
    pageSize: number,
  ) {
    const where: Prisma.PatientProfileWhereInput = {
      deletedAt: null,
      lastName: { startsWith: lastName, mode: 'insensitive' },
      ...(firstName ? { firstName: { startsWith: firstName, mode: 'insensitive' } } : {}),
      ...(dateOfBirth ? { dateOfBirth } : {}),
    };
    return this.paginatedSearch(where, page, pageSize);
  },

  async paginatedSearch(
    where: Prisma.PatientProfileWhereInput,
    page: number,
    pageSize: number,
  ): Promise<{ results: PatientSearchResult[]; total: number }> {
    const [results, total] = await prisma.$transaction([
      prisma.patientProfile.findMany({
        where,
        select: SEARCH_RESULT_SELECT,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.patientProfile.count({ where }),
    ]);
    return { results, total };
  },

  /** Attaches a User to a previously login-less patient. Fails (returns
   *  false) rather than overwriting if the patient already has one — a
   *  patient should never be silently re-parented to a different account. */
  async linkAccount(patientId: string, userId: string): Promise<boolean> {
    const { count } = await prisma.patientProfile.updateMany({
      where: { id: patientId, userId: null },
      data: { userId },
    });
    return count > 0;
  },

  async setIdentityStatus(patientId: string, status: IdentityStatus): Promise<void> {
    await prisma.patientProfile.update({
      where: { id: patientId },
      data: { identityStatus: status },
    });
  },
};
