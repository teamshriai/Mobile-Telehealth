import { createHash } from 'node:crypto';

/**
 * A DICOM UID under the UUID-derived root `2.25` (PS3.5 Annex B.2), made
 * deterministically from a key: the same key always gives the same UID, so
 * re-running the demo pipeline recreates identical studies instead of new ones.
 * 128 bits as a decimal integer → at most 44 characters, well under the 64 limit.
 */
export function uidFor(key: string): string {
  const digest = createHash('sha256').update(`shri-health/imaging-demo/v1/${key}`).digest();
  const n = BigInt(`0x${digest.subarray(0, 16).toString('hex')}`);
  return `2.25.${n.toString(10)}`;
}
