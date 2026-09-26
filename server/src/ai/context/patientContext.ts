import { loadRecordData } from './recordData';
import { renderRecord, type PatientContext } from './recordRender';

// ─────────────────────────────────────────────────────────────────────────────
// Patient clinical context for the assistant.
//
// The SINGLE place that turns a patient's record into text for the model —
// both the prompt (via retrieval) and the chunk sync in ai/memory/chunkSync.ts
// consume this same output, so there is exactly one rendering of "what a lab
// report looks like as a sentence" to keep correct.
//
//   recordData.ts   — loads and decrypts (I/O; portal parity is enforced here)
//   recordRender.ts — turns it into sectioned, source-tagged lines (pure)
//
// Each section carries its own source identity (sourceType/sourceId/
// sourceField/sourceUpdatedAt) so chunkSync can upsert/tombstone chunk rows
// without a second query pass.
// ─────────────────────────────────────────────────────────────────────────────

export type { ContextSection, PatientContext, SectionKey } from './recordRender';
export { contextCharCount, SECTIONS } from './recordRender';

/**
 * Returns null when the user has no clinical record to ground answers on
 * (a staff/doctor account, or a patient not yet fully registered) — callers
 * must treat that as "no context available", not as an error.
 */
export async function buildPatientContext(
  userId: string,
  now: Date = new Date(),
): Promise<PatientContext | null> {
  const data = await loadRecordData(userId, now);
  return data === null ? null : renderRecord(data);
}
