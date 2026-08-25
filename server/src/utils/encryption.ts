import crypto from 'crypto';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// Field-Level Encryption
//
// Encrypts individual PatientProfile columns (phone, address, emergency
// contact, aadhaarLast4, medical free-text) before they reach Postgres.
// AES-256-GCM with a random 12-byte IV per value — the same plaintext never
// produces the same ciphertext twice, which is exactly why `abhaId`'s
// uniqueness check can't use the ciphertext directly (see hmacBlindIndex).
//
// Never encrypted: firstName/lastName (preserves the clinical name-search
// index), dateOfBirth/gender/bloodGroup/maritalStatus (structured types),
// country, occupation, lifestyle enums.
// ─────────────────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const encryptionKey = Buffer.from(env.ENCRYPTION_KEY, 'base64');
const blindIndexKey = Buffer.from(env.BLIND_INDEX_KEY, 'base64');

/** Encrypts a plaintext string. Returns `"iv.authTag.ciphertext"` (each base64). */
export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    '.',
  );
}

/** Decrypts a value produced by encryptField. Throws if tampered/corrupted. */
export function decryptField(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split('.');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Invalid encrypted field payload format.');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

/** Convenience wrappers for optional fields — pass through null/undefined unchanged. */
export function encryptFieldOptional(plaintext?: string | null): string | null | undefined {
  if (plaintext === null || plaintext === undefined) return plaintext;
  return encryptField(plaintext);
}

export function decryptFieldOptional(payload?: string | null): string | null | undefined {
  if (payload === null || payload === undefined) return payload;
  return decryptField(payload);
}

/**
 * Deterministic HMAC-SHA256 of a plaintext value — used ONLY as a blind index
 * for exact-match uniqueness lookups (currently: abhaId). Same plaintext
 * always produces the same hash, which is exactly the property AES-GCM
 * deliberately avoids — never use this for anything the encrypted column
 * itself could serve.
 */
export function hmacBlindIndex(plaintext: string): string {
  return crypto.createHmac('sha256', blindIndexKey).update(plaintext, 'utf8').digest('hex');
}
