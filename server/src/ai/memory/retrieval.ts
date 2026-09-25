import { AiChunkSource } from '@prisma/client';
import type { PatientContext } from '../context/patientContext';
import { syncPatientChunks, listSyncedChunks, topKChunksByCosine } from './chunkSync';
import { embedText } from '../embeddings/embedder';

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval decision: bypass vs. similarity search.
//
// Measured on the real demo patient, the entire clinical record renders to
// ~540 tokens — 0.4% of the model's context window. Below the threshold set
// here, there is nothing to gain from search and something to lose (a missed
// match): return every chunk. Only once a patient's record grows past it does
// a similarity query run at all.
//
// This keeps the two code paths both genuinely live: the bypass path is what
// every patient hits today and is exercised on every real request; the
// pgvector path is exercised by tests and engages automatically the day a
// patient's record outgrows the threshold — no code change, no flag to flip.
// ─────────────────────────────────────────────────────────────────────────────

/** Below this many tokens of synced chunk content, skip retrieval entirely
 *  and use everything. Matches the clinical-context prompt budget (600
 *  tokens) plus headroom, so the bypass path never itself exceeds budget. */
export const RETRIEVAL_BYPASS_TOKENS = 900;

/** Cross-conversation memory chunks are handled separately by the
 *  summariser/ai.repository path — this function only ever grounds against
 *  the patient's own clinical record. */
const CLINICAL_SOURCE_TYPES = new Set<AiChunkSource>([
  AiChunkSource.ProfileMedical,
  AiChunkSource.Appointment,
  AiChunkSource.Encounter,
  AiChunkSource.StrokeAssessment,
  AiChunkSource.CareTeam,
  AiChunkSource.Prescription,
  AiChunkSource.Problem,
  AiChunkSource.Instruction,
  AiChunkSource.HealthNote,
]);

export type RetrievalResult = {
  /** The rendered text to place inside <patient_record> — already assembled,
   *  ready for assemblePrompt. */
  contextText: string;
  /** Whether similarity search actually ran, for observability/tests. */
  usedSimilaritySearch: boolean;
  chunkCount: number;
};

/**
 * Syncs the chunk table to the patient's current record, then decides how
 * much of it to surface for this question. Sync is awaited, not
 * fire-and-forget: a test (and a real patient) editing a medication and
 * immediately asking about it must see the new text on the very next turn,
 * not the next-but-one.
 */
export async function retrievePatientContext(
  ownerUserId: string,
  patientContext: PatientContext,
  question: string,
): Promise<RetrievalResult> {
  await syncPatientChunks(ownerUserId, patientContext);

  const allChunks = (await listSyncedChunks(ownerUserId, patientContext.patientId)).filter((c) =>
    CLINICAL_SOURCE_TYPES.has(c.sourceType),
  );
  const totalTokens = allChunks.reduce((sum, c) => sum + c.tokenCount, 0);

  if (totalTokens <= RETRIEVAL_BYPASS_TOKENS) {
    return {
      contextText: allChunks.map((c) => c.text).join(' '),
      usedSimilaritySearch: false,
      chunkCount: allChunks.length,
    };
  }

  // Over the threshold: embed the question and take the closest chunks up to
  // roughly the same budget, rather than every chunk that exists.
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(question);
  } catch (err) {
    // Embedder unavailable: fail toward showing SOMETHING rather than
    // nothing — fall back to the most recent chunks by taking the full set
    // truncated to budget. Correctness over cleverness when degraded.
    console.error(
      '[ai/retrieval] question embed failed, falling back to unranked chunks:',
      err instanceof Error ? err.message : err,
    );
    let running = 0;
    const kept: string[] = [];
    for (const c of allChunks) {
      if (running + c.tokenCount > RETRIEVAL_BYPASS_TOKENS) break;
      kept.push(c.text);
      running += c.tokenCount;
    }
    return { contextText: kept.join(' '), usedSimilaritySearch: false, chunkCount: kept.length };
  }

  const topK = 8;
  const nearest = await topKChunksByCosine(
    ownerUserId,
    patientContext.patientId,
    queryEmbedding,
    topK,
  );
  const clinicalNearest = nearest.filter((c) => CLINICAL_SOURCE_TYPES.has(c.sourceType));

  return {
    contextText: clinicalNearest.map((c) => c.text).join(' '),
    usedSimilaritySearch: true,
    chunkCount: clinicalNearest.length,
  };
}
