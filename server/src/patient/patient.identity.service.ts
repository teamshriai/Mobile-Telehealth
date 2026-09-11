import { Gender } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hmacBlindIndex } from '../utils/encryption';
import { normalizeMobile } from '../utils/phone';

// ─────────────────────────────────────────────────────────────────────────────
// Patient Identity Matching
//
// Answers one question, explainably: "does a patient who looks like this
// already exist?" Used by registration to surface possible duplicates before
// a new record is created — never to auto-merge. Merging two patient records
// is a destructive, irreversible clinical operation; nothing in this module
// performs one. IdentityStatus.MergedAway exists in the schema so the
// concept has a home, but no code path here (or anywhere else) sets it.
//
// Scoring is a fixed additive table, not a learned model — deliberately, so
// every score is reconstructable and explainable after the fact ("why did
// this match?" must have a one-line answer a non-engineer can read from the
// audit log). An ABHA exact match reaches `strong` on its own (100 points) —
// it is the one government-verified identifier available to this platform.
// No OTHER single signal is sufficient alone (mobile alone is 55 — only
// `moderate`); this is deliberate corroboration-required design. Verified in
// identityScoring.test.ts: it IS possible to reach `strong` (>=100) without
// ABHA if mobile + name + DOB + gender ALL match exactly (55+25+20+5=105) —
// that is intentional, not a loophole: four independent exact corroborating
// matches is itself about as certain as identity gets without a government
// ID, so treating it as strong is the correct call, not an oversight.
// ─────────────────────────────────────────────────────────────────────────────

export type MatchSignal =
  'abha_exact' | 'mobile_exact' | 'name_exact' | 'dob_exact' | 'dob_near' | 'gender_match';

export type MatchConfidence = 'strong' | 'moderate' | 'weak';

export interface MatchCandidate {
  /** Public identifier — safe to return to the caller and to log. */
  shriPatientId: string;
  /** Internal id — used to look up the full record if the caller proceeds
   *  with "use existing patient". Never logged or returned in bulk listings;
   *  only ever passed back for a single, deliberate follow-up action. */
  patientId: string;
  score: number;
  confidence: MatchConfidence;
  signals: MatchSignal[];
  display: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: Gender | null;
    district: string | null;
    lastEncounterAt: Date | null;
  };
}

export interface MatchResult {
  candidates: MatchCandidate[];
  strongest: MatchConfidence | 'none';
}

export interface IdentityInput {
  abhaId?: string | null;
  mobile?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
}

const SCORE = {
  abhaExact: 100,
  mobileExact: 55,
  nameExact: 25,
  dobExact: 20,
  dobNear: 8,
  genderMatch: 5,
} as const;

const DOB_NEAR_YEARS = 2;
const MAX_CANDIDATES = 10;

function confidenceForScore(score: number): MatchConfidence | 'none' {
  if (score >= 100) return 'strong';
  if (score >= 60) return 'moderate';
  if (score >= 35) return 'weak';
  return 'none';
}

/** Whole-year difference, tolerant of either date being missing. */
function yearsApart(a: Date, b: Date): number {
  return Math.abs(a.getFullYear() - b.getFullYear());
}

export const patientIdentityService = {
  /**
   * Finds patients that plausibly match the given (plaintext) identity
   * signals. Hashes/normalizes internally — callers never compute a blind
   * index themselves, so the normalization rule can never drift between the
   * write path and this read path.
   */
  async findCandidates(input: IdentityInput): Promise<MatchResult> {
    // Collect candidate patient ids from each independent signal, then score
    // the union. Each signal is queried separately (rather than one giant
    // OR) so the result set stays small and each query can use its own index.
    const candidateIds = new Set<string>();
    const abhaMatches = new Map<string, MatchSignal[]>();
    const mobileMatches = new Map<string, MatchSignal[]>();
    const nameMatches = new Map<string, MatchSignal[]>();

    const addSignal = (map: Map<string, MatchSignal[]>, id: string, signal: MatchSignal): void => {
      const existing = map.get(id) ?? [];
      existing.push(signal);
      map.set(id, existing);
      candidateIds.add(id);
    };

    if (input.abhaId) {
      const abhaHash = hmacBlindIndex(input.abhaId);
      const rows = await prisma.patientProfile.findMany({
        where: { abhaIdHash: abhaHash },
        select: { id: true },
      });
      rows.forEach((r) => addSignal(abhaMatches, r.id, 'abha_exact'));
    }

    if (input.mobile) {
      const normalized = normalizeMobile(input.mobile);
      if (normalized) {
        const mobileHash = hmacBlindIndex(normalized);
        const rows = await prisma.patientProfile.findMany({
          where: { phoneNumberHash: mobileHash },
          select: { id: true },
        });
        rows.forEach((r) => addSignal(mobileMatches, r.id, 'mobile_exact'));
      }
    }

    if (input.firstName && input.lastName) {
      const rows = await prisma.patientProfile.findMany({
        where: {
          firstName: { equals: input.firstName, mode: 'insensitive' },
          lastName: { equals: input.lastName, mode: 'insensitive' },
        },
        select: { id: true },
      });
      rows.forEach((r) => addSignal(nameMatches, r.id, 'name_exact'));
    }

    if (candidateIds.size === 0) {
      return { candidates: [], strongest: 'none' };
    }

    const rows = await prisma.patientProfile.findMany({
      where: { id: { in: Array.from(candidateIds) } },
      select: {
        id: true,
        shriPatientId: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        district: true, // encrypted — display only, never matched on
        encounters: {
          select: { startedAt: true },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Score every row first, computing the honest `MatchConfidence | 'none'`
    // type at the point it is actually decided. Below-threshold rows are
    // dropped by the `!== 'none'` filter BEFORE anything is shaped into the
    // public MatchCandidate type (whose `confidence` field is deliberately
    // typed to exclude 'none' — a caller should never see an unreportable
    // match). This ordering means there is no point in the code where a
    // 'none'-confidence value needs to be coerced into a false 'weak' label
    // just to satisfy the type — it is filtered out while it is still
    // honestly typed as 'none'.
    const scored = rows.map((row) => {
      const signals = new Set<MatchSignal>([
        ...(abhaMatches.get(row.id) ?? []),
        ...(mobileMatches.get(row.id) ?? []),
        ...(nameMatches.get(row.id) ?? []),
      ]);

      let score = 0;
      if (signals.has('abha_exact')) score += SCORE.abhaExact;
      if (signals.has('mobile_exact')) score += SCORE.mobileExact;
      if (signals.has('name_exact')) score += SCORE.nameExact;

      if (input.dateOfBirth && row.dateOfBirth) {
        if (input.dateOfBirth.getTime() === row.dateOfBirth.getTime()) {
          signals.add('dob_exact');
          score += SCORE.dobExact;
        } else if (yearsApart(input.dateOfBirth, row.dateOfBirth) <= DOB_NEAR_YEARS) {
          signals.add('dob_near');
          score += SCORE.dobNear;
        }
      }

      if (input.gender && row.gender && input.gender === row.gender) {
        signals.add('gender_match');
        score += SCORE.genderMatch;
      }

      return { row, signals, score, confidence: confidenceForScore(score) };
    });

    // Only keep candidates that clear the lowest reporting threshold, then
    // rank strongest-first and cap the list — a long tail of weak matches
    // is noise, not information.
    const filtered: MatchCandidate[] = scored
      .filter((s): s is typeof s & { confidence: MatchConfidence } => s.confidence !== 'none')
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES)
      .map(({ row, signals, score, confidence }) => ({
        shriPatientId: row.shriPatientId,
        patientId: row.id,
        score,
        confidence,
        signals: Array.from(signals),
        display: {
          firstName: row.firstName,
          lastName: row.lastName,
          dateOfBirth: row.dateOfBirth,
          gender: row.gender,
          district: null, // encrypted field — decrypting for a candidate
          // PREVIEW is more exposure than the workflow needs; the full
          // record is available via the normal read path once selected.
          lastEncounterAt: row.encounters[0]?.startedAt ?? null,
        },
      }));

    // filtered is sorted score-descending, so the first entry (if any) is
    // simply the strongest confidence present.
    const strongest: MatchConfidence | 'none' = filtered[0]?.confidence ?? 'none';

    return { candidates: filtered, strongest };
  },
};
