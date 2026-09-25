/**
 * Microphone availability, classified — shared by every feature that asks
 * for one (the clinician's ambient scribe, the patient's voice health note).
 *
 * ⚠️ FOUR DIFFERENT FACTS, FOUR DIFFERENT REMEDIES. The insecure-origin case
 * is the one that used to be reported as a missing microphone, and it is the
 * most likely in practice: browsers only expose `navigator.mediaDevices` on
 * HTTPS or localhost, so every device opening the app over the LAN
 * (`http://192.168.x.x`) sees the whole API disappear. Telling someone their
 * microphone is missing when the page address is the problem sends them to
 * look for a hardware fault that does not exist.
 */
export type MicStatus = 'denied' | 'no-device' | 'insecure-origin' | 'unsupported'

/** Before asking: can this page ask at all? `null` means "go ahead and ask". */
export function micPreflight(): MicStatus | null {
  if (typeof navigator === 'undefined' || navigator.mediaDevices === undefined) {
    return typeof window !== 'undefined' && window.isSecureContext ? 'unsupported' : 'insecure-origin'
  }
  return null
}

/** After `getUserMedia` rejected: name the cause from the error. */
export function classifyMicError(err: unknown): MicStatus {
  const name = (err as { name?: string } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device'
  return 'unsupported'
}
