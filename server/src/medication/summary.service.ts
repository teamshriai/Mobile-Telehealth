import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { aiEnabled, env } from '../config/env.config';
import { auditService, AuditAction, AuditSeverity } from '../services/audit.service';
import { decryptFieldOptional, encryptField, decryptField } from '../utils/encryption';
import { requireOwnPatientId } from '../portal/ownPatient';
import { loadSignedPrescriptions, toMedications } from '../portal/portal.service';
import { assemblePrompt } from '../ai/prompt/assemblePrompt';
import { PROMPT_VERSION } from '../ai/prompt/systemPrompt';
import { estimateTokens, reserveBudget } from '../ai/budget/aiBudget';
import { callModel } from '../ai/provider/groqClient';
import { checkOutput } from '../ai/safety/outputGuard';

// ─────────────────────────────────────────────────────────────────────────────
// AI medicine summary — a plain-language explanation of what the patient has
// been PRESCRIBED, grounded in nothing else.
//
// ⚠️ SAME SAFETY PATH AS THE ASSISTANT, NONE OF ITS SHORTCUTS. AI must be
// enabled; the data policy gates non-synthetic patients; the patient's daily
// budget is reserved before the model is called; the reply goes through the
// same output guard (no diagnosis, no dose change, no number or drug name the
// record did not contain). The internal memory summariser skips budget and
// guard, which is fine for text no patient reads — this one is read, so it
// does not copy that.
//
// ⚠️ CACHED BY THE FACTS IT WAS WRITTEN FROM. The hash covers the exact
// context and the prompt versions, so an unchanged medicine list is served
// from cache and costs nothing; a new or changed prescription regenerates.
// ─────────────────────────────────────────────────────────────────────────────

export const SUMMARY_PROMPT_VERSION = 'med-summary-2026-09-25b';

const INSTRUCTION = [
  'Write a short plain-language summary of my current medicines for me to read.',
  'For each current prescribed medicine, in one or two sentences: what it is (its name and form),',
  'what it was prescribed for if that is recorded, and when and how it is taken exactly as the',
  'prescription says, and which doctor prescribed it.',
  'If my own list of medicines mentions anything that is not in my prescriptions, say so neutrally',
  'in one sentence and suggest I mention it to my doctor.',
  'Do not give advice. Never suggest changing anything. Never use the words stop, start, increase,',
  'reduce, skip, double or halve. Do not mention side effects or interactions.',
  'Use short sentences, no headings, no lists, under 150 words.',
].join(' ');

export type SummaryResult =
  | { state: 'ok'; text: string; generatedAt: Date; cached: boolean }
  | { state: 'none' }
  | { state: 'empty' | 'off' | 'policy' | 'busy' | 'blocked'; message: string };

function day(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/** Exactly the facts the summary may use — and the text the guard checks against. */
interface SummaryContext {
  contextText: string;
  hash: string;
  currentCount: number;
  isSynthetic: boolean;
  demographicsLine: string;
}

async function buildContext(patientId: string): Promise<SummaryContext> {
  const [rx, profile, problems] = await Promise.all([
    loadSignedPrescriptions(patientId),
    prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: {
        firstName: true,
        isSyntheticData: true,
        currentMedications: true,
        knownAllergies: true,
      },
    }),
    prisma.problem.findMany({
      where: { patientId, status: 'Active' },
      select: { code: true, codeTitle: true },
    }),
  ]);
  const titleByCode = new Map(problems.map((p) => [p.code, p.codeTitle]));
  const indicationByItem = new Map(
    rx.flatMap((p) => p.items.map((i) => [i.id, i.indicationCode] as const)),
  );
  const meds = toMedications(rx);
  const current = meds.filter((m) => m.status === 'current');

  const lines: string[] = [];
  for (const m of current) {
    const code = indicationByItem.get(m.id) ?? null;
    const forWhat = code !== null ? titleByCode.get(code) : undefined;
    lines.push(
      `Current prescribed medicine: ${m.name} ${m.dose} ${m.doseUnit} (${m.form.toLowerCase()}), ` +
        `${m.frequencyInWords.toLowerCase()}, ${m.routeInWords.toLowerCase()}, prescribed by ` +
        `${m.prescribedBy ?? 'a doctor'} on ${day(m.startedAt)}` +
        (m.endsAt !== null ? `, until ${day(m.endsAt)}` : '') +
        '.' +
        (forWhat !== undefined ? ` Prescribed for: ${forWhat}.` : '') +
        (m.instructions ? ` Directions: ${m.instructions}` : ''),
    );
  }
  const own = decryptFieldOptional(profile?.currentMedications)?.trim();
  if (own)
    lines.push(
      `Patient-reported list of medicines (the patient's own words, not a prescription): ${own}.`,
    );
  const allergy = decryptFieldOptional(profile?.knownAllergies)?.trim();
  if (allergy && !/^(none|nil|no known)/i.test(allergy)) {
    lines.push(`Patient-reported allergies (the patient's own words): ${allergy}.`);
  }
  const contextText = lines.join('\n');
  const hash = createHash('sha256')
    .update(`${PROMPT_VERSION}|${SUMMARY_PROMPT_VERSION}|${contextText}`)
    .digest('hex');
  return {
    contextText,
    hash,
    currentCount: current.length,
    isSynthetic: profile?.isSyntheticData === true,
    demographicsLine: `Patient: ${profile?.firstName ?? 'the patient'}.`,
  };
}

export const medicationSummaryService = {
  /** The cached summary, only if it still matches today's facts. Never calls the model. */
  async get(userId: string): Promise<SummaryResult> {
    const patientId = await requireOwnPatientId(userId);
    const ctx = await buildContext(patientId);
    const cached = await prisma.medicationSummaryCache.findUnique({ where: { patientId } });
    if (cached !== null && cached.contextHash === ctx.hash) {
      return {
        state: 'ok',
        text: decryptField(cached.text),
        generatedAt: cached.createdAt,
        cached: true,
      };
    }
    return { state: 'none' };
  },

  async generate(userId: string): Promise<SummaryResult> {
    const patientId = await requireOwnPatientId(userId);
    const ctx = await buildContext(patientId);
    if (ctx.currentCount === 0) {
      return { state: 'empty', message: 'There are no current prescriptions to summarise.' };
    }
    const cached = await prisma.medicationSummaryCache.findUnique({ where: { patientId } });
    if (cached !== null && cached.contextHash === ctx.hash) {
      return {
        state: 'ok',
        text: decryptField(cached.text),
        generatedAt: cached.createdAt,
        cached: true,
      };
    }
    if (!aiEnabled) {
      return {
        state: 'off',
        message:
          'AI summaries are not available on this server. Your medicine list above is complete without it.',
      };
    }
    if (env.AI_DATA_POLICY === 'synthetic-only' && !ctx.isSynthetic) {
      auditService.log({
        action: AuditAction.AiPolicyBlocked,
        userId,
        resource: 'medication_summary',
        severity: AuditSeverity.Warning,
        metadata: { policy: env.AI_DATA_POLICY },
      });
      return {
        state: 'policy',
        message: 'AI summaries are not enabled for real patient records on this deployment yet.',
      };
    }

    const prompt = assemblePrompt({
      patientContext: { demographicsLine: ctx.demographicsLine, contextText: ctx.contextText },
      longTermMemorySummaries: [],
      conversationSummary: null,
      recentTurns: [],
      question: INSTRUCTION,
      citeSources: false,
    });
    const chars = prompt.messages.reduce((n, m) => n + m.content.length, 0);
    const reservation = await reserveBudget({
      userId,
      estimatedTokens: estimateTokens(chars, prompt.messages.length) + env.AI_MAX_COMPLETION_TOKENS,
    });
    if (!reservation.ok) {
      auditService.log({
        action: AuditAction.AiBudgetExceeded,
        userId,
        resource: 'medication_summary',
        severity: AuditSeverity.Warning,
        metadata: { reason: reservation.reason },
      });
      return {
        state: 'busy',
        message: `The AI summary is busy right now. Try again in about ${Math.max(1, Math.ceil(reservation.retryAfterSeconds / 60))} minute(s).`,
      };
    }

    const outcome = await callModel(prompt.messages);
    if (
      outcome.kind === 'ok' &&
      (outcome.content.trim() === '' || outcome.finishReason === 'length')
    ) {
      // Empty or cut off: nothing safe to show. Same answer as a provider failure.
      await reservation.commit({
        promptTokens: outcome.promptTokens,
        completionTokens: outcome.completionTokens,
      });
      return {
        state: 'busy',
        message: 'The AI summary could not be written just now. Please try again in a minute.',
      };
    }
    if (outcome.kind !== 'ok') {
      reservation.release();
      auditService.log({
        action: AuditAction.AiProviderError,
        userId,
        resource: 'medication_summary',
        severity: AuditSeverity.Warning,
        metadata: {
          outcome: outcome.kind,
          statusCode: 'statusCode' in outcome ? outcome.statusCode : undefined,
        },
      });
      return {
        state: 'busy',
        message: 'The AI summary could not be written just now. Please try again in a minute.',
      };
    }
    await reservation.commit({
      promptTokens: outcome.promptTokens,
      completionTokens: outcome.completionTokens,
    });

    const check = checkOutput(outcome.content, ctx.contextText);
    if (!check.ok) {
      auditService.log({
        action: AuditAction.AiOutputBlocked,
        userId,
        resource: 'medication_summary',
        severity: AuditSeverity.Warning,
        metadata: { failure: check.failure, promptVersion: SUMMARY_PROMPT_VERSION },
      });
      return {
        state: 'blocked',
        message:
          'The AI summary did not pass our safety checks, so it is not shown. Your medicine list above is unaffected.',
      };
    }

    const text = outcome.content.trim();
    const saved = await prisma.medicationSummaryCache.upsert({
      where: { patientId },
      create: { patientId, contextHash: ctx.hash, text: encryptField(text), model: env.AI_MODEL },
      update: {
        contextHash: ctx.hash,
        text: encryptField(text),
        model: env.AI_MODEL,
        createdAt: new Date(),
      },
    });
    auditService.log({
      action: AuditAction.MedicationSummaryGenerated,
      userId,
      severity: AuditSeverity.Info,
      resource: 'medication_summary',
      metadata: {
        promptVersion: SUMMARY_PROMPT_VERSION,
        completionTokens: outcome.completionTokens,
      },
    });
    return { state: 'ok', text, generatedAt: saved.createdAt, cached: false };
  },
};
