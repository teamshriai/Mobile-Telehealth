import { env } from '../../config/env.config';
import {
  SECTIONS,
  type ContextSection,
  type PatientContext,
  type SectionKey,
} from '../context/patientContext';
import { syncPatientChunks, topKChunksByCosine, chunkKey } from './chunkSync';
import { embedText } from '../embeddings/embedder';
import { routeQuestion, questionTerms, type Route } from './questionRouter';
import { medicineNamesIn } from '../safety/drugLexicon';

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval v2 — what part of the record goes in front of the model.
//
// ONE budget (AI_CONTEXT_TOKENS). v1 had two that disagreed (a 900-token
// bypass and a 600-token prompt slot), so a record between them was cut in
// half mid-sentence. Now:
//
//  1. The whole record fits → all of it, in section order.
//  2. It does not → build it up, whole lines only, never cut:
//       a. core sections (about you, allergies, conditions, current
//          medicines, upcoming appointments, doctors) — at most half;
//       b. the sections the question is about (questionRouter), lines that
//          mention the question's words first, then newest first;
//       c. for a "summarise everything" question, the newest two of every
//          other section;
//       d. the 24 lines most similar to the question (pgvector), if the
//          embedder is up;
//       e. anything else that still fits, section order, newest first.
//     Each section notes "(N older entries not included)" so the model
//     knows the record goes further and says so rather than guessing.
//
// The chunk table is synced first (awaited), so a record edited a moment ago
// is what this turn sees. A sync or embedding failure degrades to keyword
// selection; it never fails the turn.
// ─────────────────────────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 3.6;
const tokensOf = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);
const CORE_SHARE = 0.5;
const SIMILAR_K = 24;
const HEADING_TOKENS = 8;

export interface Selection {
  /** Rendered, sectioned text for inside <patient_record>. */
  text: string;
  included: ContextSection[];
  /** Lines left out, per section. */
  omitted: Partial<Record<SectionKey, number>>;
  usedAll: boolean;
}

function newestFirst(a: ContextSection, b: ContextSection): number {
  return b.sortAt.getTime() - a.sortAt.getTime();
}

function render(
  included: ContextSection[],
  all: ContextSection[],
): Pick<Selection, 'text' | 'omitted'> {
  const omitted: Partial<Record<SectionKey, number>> = {};
  const blocks: string[] = [];
  for (const s of SECTIONS) {
    const mine = included.filter((c) => c.section === s.key).sort(newestFirst);
    const total = all.filter((c) => c.section === s.key).length;
    if (mine.length === 0) {
      if (total > 0) omitted[s.key] = total;
      continue;
    }
    const left = total - mine.length;
    if (left > 0) omitted[s.key] = left;
    blocks.push(
      [
        `## ${s.heading}`,
        ...mine.map((c) => c.text),
        ...(left > 0 ? [`(${left} older entr${left === 1 ? 'y' : 'ies'} not included)`] : []),
      ].join('\n'),
    );
  }
  const notShown = SECTIONS.filter(
    (s) => (omitted[s.key] ?? 0) > 0 && !included.some((c) => c.section === s.key),
  );
  if (notShown.length > 0) {
    blocks.push(
      `(Also on record but not included here: ${notShown.map((s) => s.heading.toLowerCase().replace(/ \(.*\)$/, '')).join(', ')}.)`,
    );
  }
  return { text: blocks.join('\n\n'), omitted };
}

/**
 * Pure selection — exported for tests. `similar` is chunk keys ranked by
 * similarity to the question (may be empty).
 */
export function selectContext(
  sections: ContextSection[],
  question: string,
  route: Route,
  similar: string[],
  budgetTokens: number = env.AI_CONTEXT_TOKENS,
): Selection {
  const total =
    sections.reduce((n, s) => n + tokensOf(s.text), 0) + SECTIONS.length * HEADING_TOKENS;
  if (total <= budgetTokens) {
    return { ...render(sections, sections), included: sections, usedAll: true };
  }

  const picked = new Set<ContextSection>();
  const sectionsUsed = new Set<SectionKey>();
  let used = 0;
  const tryAdd = (c: ContextSection, cap: number): boolean => {
    if (picked.has(c)) return false;
    const cost = tokensOf(c.text) + (sectionsUsed.has(c.section) ? 0 : HEADING_TOKENS);
    if (used + cost > cap) return false;
    picked.add(c);
    sectionsUsed.add(c.section);
    used += cost;
    return true;
  };
  const of = (key: SectionKey): ContextSection[] => sections.filter((c) => c.section === key);

  // a. Core, at most half the budget.
  const coreCap = Math.floor(budgetTokens * CORE_SHARE);
  for (const s of SECTIONS.filter((x) => x.core))
    for (const c of of(s.key).sort(newestFirst)) tryAdd(c, coreCap);

  // b. The routed sections, best-matching lines first.
  const terms = questionTerms(question);
  const hits = (c: ContextSection): number => {
    const t = c.text.toLowerCase();
    return terms.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  };
  for (const s of SECTIONS.filter((x) => route.sections.has(x.key))) {
    const ranked = of(s.key).sort((a, b) => hits(b) - hits(a) || newestFirst(a, b));
    for (const c of ranked) tryAdd(c, budgetTokens);
  }

  // c. Broad questions: the newest two of everything else.
  if (route.broad) {
    for (const s of SECTIONS)
      for (const c of of(s.key).sort(newestFirst).slice(0, 2)) tryAdd(c, budgetTokens);
  }

  // d. Similar lines.
  const byKey = new Map(sections.map((c) => [chunkKey(c), c]));
  for (const key of similar) {
    const c = byKey.get(key);
    if (c !== undefined) tryAdd(c, budgetTokens);
  }

  // e. Whatever else fits.
  for (const s of SECTIONS) for (const c of of(s.key).sort(newestFirst)) tryAdd(c, budgetTokens);

  const included = [...picked];
  return { ...render(included, sections), included, usedAll: false };
}

export type RetrievalResult = Selection & {
  usedSimilaritySearch: boolean;
  chunkCount: number;
};

/**
 * Syncs the chunk table to the patient's current record, then selects what
 * this question needs.
 */
export async function retrievePatientContext(
  ownerUserId: string,
  patientContext: PatientContext,
  question: string,
  /** The previous question in this conversation: "and in June?" is about
   *  whatever the last question was about. */
  previousQuestion: string | null = null,
): Promise<RetrievalResult> {
  try {
    await syncPatientChunks(ownerUserId, patientContext);
  } catch (err) {
    console.error(
      '[ai/retrieval] chunk sync failed (continuing without it):',
      err instanceof Error ? err.message : err,
    );
  }

  const routingText = previousQuestion === null ? question : `${question}\n${previousQuestion}`;
  const route = routeQuestion(
    routingText,
    medicineNamesIn(patientContext.sections.map((s) => s.text).join(' ')),
  );
  const total = patientContext.sections.reduce((n, s) => n + tokensOf(s.text), 0);
  let similar: string[] = [];
  let usedSimilaritySearch = false;
  if (total > env.AI_CONTEXT_TOKENS) {
    try {
      const nearest = await topKChunksByCosine(
        ownerUserId,
        patientContext.patientId,
        await embedText(routingText),
        SIMILAR_K,
      );
      similar = nearest.map((c) => chunkKey(c));
      usedSimilaritySearch = true;
    } catch (err) {
      console.error(
        '[ai/retrieval] similarity search unavailable (keyword selection only):',
        err instanceof Error ? err.message : err,
      );
    }
  }

  const selection = selectContext(patientContext.sections, routingText, route, similar);
  return { ...selection, usedSimilaritySearch, chunkCount: selection.included.length };
}
