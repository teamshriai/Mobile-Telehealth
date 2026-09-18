import { AiChunkSource } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { encryptField, decryptField, hmacBlindIndex } from '../../utils/encryption';
import { embedText, EMBEDDING_DIMENSIONS } from '../embeddings/embedder';
import type { PatientContext, ContextSection } from '../context/patientContext';

// ─────────────────────────────────────────────────────────────────────────────
// Chunk sync — keeps AiMemoryChunk rows matching the patient's current record.
//
// The candidate set comes from buildPatientContext, which has already
// decrypted every field this turn regardless (it is also what the bypass-rule
// full-context path consumes) — so syncing here costs no EXTRA decryption
// beyond what the request was already paying. What it does avoid is
// unnecessary EMBEDDING calls: each candidate's rendered text is hashed with
// the same keyed HMAC used elsewhere in this codebase for blind indexes, and
// only a hash mismatch (new content, or no prior chunk at all) triggers an
// embed. A patient asking three questions in a row about an unchanged record
// re-hashes 20 short strings three times and re-embeds nothing.
//
// After upserting the current candidates, a tombstone pass deletes any chunk
// whose (sourceType, sourceId, sourceField) is no longer present — the fix
// for "stale retrieval after a clinical-data delete": a removed appointment's
// chunk must stop being retrievable, not just stop being updated.
// ─────────────────────────────────────────────────────────────────────────────

function chunkKey(s: Pick<ContextSection, 'sourceType' | 'sourceId' | 'sourceField'>): string {
  return `${s.sourceType}:${s.sourceId}:${s.sourceField}`;
}

/** Rough token estimate for a chunk — same 3.6 chars/token convention used by
 *  the budget module, so chunk token counts and prompt budget stay comparable. */
function estimateChunkTokens(text: string): number {
  return Math.ceil(text.length / 3.6);
}

export async function syncPatientChunks(
  ownerUserId: string,
  patientContext: PatientContext,
): Promise<void> {
  const existing = await prisma.aiMemoryChunk.findMany({
    where: { ownerUserId, patientId: patientContext.patientId },
    select: { id: true, sourceType: true, sourceId: true, sourceField: true, contentHash: true },
  });
  const existingByKey = new Map(existing.map((c) => [chunkKey(c), c]));
  const candidateKeys = new Set(patientContext.sections.map((s) => chunkKey(s)));

  for (const section of patientContext.sections) {
    const key = chunkKey(section);
    const contentHash = hmacBlindIndex(section.text);
    const prior = existingByKey.get(key);

    // Unchanged: skip both the write and the embed. This is the common case
    // on every turn after the first for a patient whose record has not moved.
    if (prior !== undefined && prior.contentHash === contentHash) continue;

    let embedding: number[] | null = null;
    try {
      embedding = await embedText(section.text);
    } catch (err) {
      // A chunk with no embedding is still useful under the bypass rule
      // (full-context path never queries `embedding`), just not retrievable
      // by similarity search until the embedder recovers. Logged, not thrown
      // — one broken embed must not break the whole sync pass or the turn.
      console.error(
        '[ai/chunkSync] embed failed, storing chunk without a vector:',
        err instanceof Error ? err.message : err,
      );
    }

    const tokenCount = estimateChunkTokens(section.text);
    const encryptedContent = encryptField(section.text);

    if (prior === undefined) {
      const created = await prisma.aiMemoryChunk.create({
        data: {
          ownerUserId,
          patientId: patientContext.patientId,
          sourceType: section.sourceType,
          sourceId: section.sourceId,
          sourceField: section.sourceField,
          content: encryptedContent,
          contentHash,
          tokenCount,
          sourceUpdatedAt: section.sourceUpdatedAt,
          embeddingModel: embedding !== null ? 'Xenova/all-MiniLM-L6-v2' : null,
        },
        select: { id: true },
      });
      if (embedding !== null) await writeEmbedding(created.id, embedding);
    } else {
      await prisma.aiMemoryChunk.update({
        where: { id: prior.id },
        data: {
          content: encryptedContent,
          contentHash,
          tokenCount,
          sourceUpdatedAt: section.sourceUpdatedAt,
          embeddingModel: embedding !== null ? 'Xenova/all-MiniLM-L6-v2' : null,
        },
      });
      if (embedding !== null) await writeEmbedding(prior.id, embedding);
    }
  }

  // Tombstone: a source row that no longer renders a chunk (deleted
  // appointment, cleared medication field) must stop being retrievable.
  const staleIds = existing.filter((c) => !candidateKeys.has(chunkKey(c))).map((c) => c.id);
  if (staleIds.length > 0) {
    await prisma.aiMemoryChunk.deleteMany({ where: { id: { in: staleIds } } });
  }
}

/**
 * `embedding` is `Unsupported("vector(384)")` in Prisma's type system — it
 * cannot be written through the generated client and needs raw SQL. Kept as
 * its own statement (not folded into the create/update above) for exactly
 * that reason.
 */
async function writeEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected a ${EMBEDDING_DIMENSIONS}-dim embedding, got ${embedding.length}.`);
  }
  const vectorLiteral = `[${embedding.join(',')}]`;
  await prisma.$executeRaw`
    UPDATE ai_memory_chunks SET embedding = ${vectorLiteral}::vector WHERE id = ${chunkId}::uuid
  `;
}

export type RetrievedChunk = { sourceType: AiChunkSource; text: string; tokenCount: number };

/** All currently-synced chunks for a patient, decrypted, in no particular
 *  order — the caller decides whether to use all of them (bypass rule) or
 *  run a similarity query instead. */
export async function listSyncedChunks(
  ownerUserId: string,
  patientId: string,
): Promise<RetrievedChunk[]> {
  const rows = await prisma.aiMemoryChunk.findMany({
    where: { ownerUserId, patientId },
    select: { sourceType: true, content: true, tokenCount: true },
  });
  return rows.map((r) => ({
    sourceType: r.sourceType,
    text: safeDecryptChunk(r.content),
    tokenCount: r.tokenCount,
  }));
}

/** Top-k by cosine distance, scoped to one owner. Only reached once a
 *  patient's synced chunks exceed the bypass threshold — see
 *  ai/memory/retrieval.ts. Chunks with no embedding yet are excluded from
 *  the ORDER BY (they would sort arbitrarily against a real distance) but
 *  the query still runs — a handful of not-yet-embedded chunks must not
 *  block retrieval of the rest. */
export async function topKChunksByCosine(
  ownerUserId: string,
  patientId: string,
  queryEmbedding: number[],
  k: number,
): Promise<RetrievedChunk[]> {
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;
  const rows = await prisma.$queryRaw<
    { source_type: AiChunkSource; content: string; token_count: number }[]
  >`
    SELECT source_type, content, token_count
    FROM ai_memory_chunks
    WHERE owner_user_id = ${ownerUserId}::uuid
      AND patient_id = ${patientId}::uuid
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${k}
  `;
  return rows.map((r) => ({
    sourceType: r.source_type,
    text: safeDecryptChunk(r.content),
    tokenCount: r.token_count,
  }));
}

function safeDecryptChunk(value: string): string {
  try {
    return decryptField(value);
  } catch {
    return '[This record could not be read.]';
  }
}
