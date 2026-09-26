import type { BudgetDenialReason } from './budget/aiBudget';

// ─────────────────────────────────────────────────────────────────────────────
// Fixed, versioned replies — every assistant turn that is NOT the model's.
//
// Never model-composed, so the transcript can never imply the assistant said
// something clinical that it did not. Each one says what happened, that the
// question was kept, and where urgent help is.
// ─────────────────────────────────────────────────────────────────────────────

/** Shown only when no provider key is configured at all. */
export const NOT_CONNECTED_REPLY =
  'The assistant is not switched on for this hospital yet, so I cannot answer this. ' +
  'Your question has been saved. For anything urgent, contact your care team or call 108.';

export const POLICY_BLOCKED_REPLY =
  'The assistant is not enabled for real patient records on this deployment ' +
  'yet. Your question has been saved. For anything urgent, contact your care ' +
  'team or call 108.';

/** The provider could not be reached, timed out, or failed. */
export const PROVIDER_UNAVAILABLE_REPLY =
  "The assistant couldn't be reached just now. Your question has been saved — " +
  'please try again in a minute. For anything urgent, contact your care team or call 108.';

/** The provider answered, but with nothing usable even after one retry. */
export const NO_ANSWER_REPLY =
  "I couldn't put an answer together for that one. Please try asking again, " +
  'perhaps in fewer words. For anything urgent, contact your care team or call 108.';

/**
 * A budget refusal. The patient's own daily allowance resets at midnight UTC,
 * which is 05:30 in India — said as a time, not as "about 9 hours".
 */
export function budgetDeferredReply(reason: BudgetDenialReason, retryAfterSeconds: number): string {
  if (reason === 'patient_daily_messages') {
    return (
      "You've reached today's limit for questions to the assistant. It resets at 5:30 am " +
      '(India time). Your question has been saved. For anything urgent, contact your care ' +
      'team or call 108.'
    );
  }
  if (reason === 'shared_daily_requests' || reason === 'shared_daily_tokens') {
    return (
      'The assistant has reached its limit for today. It resets at 5:30 am (India time). ' +
      'Your question has been saved. For anything urgent, contact your care team or call 108.'
    );
  }
  const minutes = Math.max(1, Math.round(retryAfterSeconds / 60));
  return (
    `The assistant is busy right now. Your question has been saved — please try ` +
    `again in about ${minutes} minute${minutes === 1 ? '' : 's'}. For anything urgent, ` +
    'contact your care team or call 108.'
  );
}

export { OUTPUT_BLOCKED_REPLY } from './safety/outputGuard';
