import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.INE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'INE_ENCRYPTION_KEY no está configurada (requerida para cifrar INE en reposo)',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'INE_ENCRYPTION_KEY debe decodificar a 32 bytes en base64 (AES-256)',
    );
  }
  return key;
}

/** Cifra un buffer (INE) para almacenamiento en reposo. Formato: iv(12) + authTag(16) + ciphertext. */
export function encryptIne(plain: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

/** Descifra un buffer producido por encryptIne. */
export function decryptIne(sealed: Buffer): Buffer {
  const iv = sealed.subarray(0, IV_LENGTH);
  const authTag = sealed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = sealed.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
