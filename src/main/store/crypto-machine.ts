// Machine-bound symmetric encryption used as a fallback when Electron's
// safeStorage isn't available (typically: unsigned macOS builds where the
// OS keychain access fails).
//
// Threat model: someone with read access to ~/Library/Application Support
// can't grep the token out of token.machine. They CAN reverse-derive the key
// (it's machine + bundle path, both readable from the same machine), so this
// isn't a defense against a determined attacker with full local access — it's
// strictly stronger than plaintext, but weaker than a real OS keychain.
// Equivalent in spirit to what `aws-cli` / `npm` do (plaintext) but better.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

export function deriveMachineKey(seedComponents: string[]): Buffer {
  // sha256 of joined components → 32-byte key for AES-256.
  return createHash('sha256').update(seedComponents.join('::')).digest();
}

export function machineEncrypt(plaintext: string, key: Buffer): Buffer {
  if (key.length !== 32) throw new Error('machineEncrypt: key must be 32 bytes');
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: iv (12) || tag (16) || ciphertext.
  return Buffer.concat([iv, tag, enc]);
}

export function machineDecrypt(buf: Buffer, key: Buffer): string | null {
  if (key.length !== 32) return null;
  if (buf.length < IV_LEN + TAG_LEN + 1) return null;
  try {
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
