import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { TokenStatus } from '@shared/types';

const TOKEN_FILE = 'token.bin';

function tokenPath(): string {
  return path.join(app.getPath('userData'), TOKEN_FILE);
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function setApiToken(token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-level encryption is not available on this system.');
  }
  fs.mkdirSync(path.dirname(tokenPath()), { recursive: true });
  const buf = safeStorage.encryptString(token);
  fs.writeFileSync(tokenPath(), buf);
}

export function getApiToken(): string | null {
  try {
    const buf = fs.readFileSync(tokenPath());
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}

// Distinguishes the three states a token file can be in. The 'unreadable'
// case happens commonly when an unsigned macOS build is upgraded (e.g. via
// brew upgrade): each ad-hoc signature gets its own keychain-derived
// encryption key, so the old token.bin can't be decrypted under the new
// signature. The fix is to clear and re-enter the token.
export function getApiTokenStatus(): TokenStatus {
  const p = tokenPath();
  if (!fs.existsSync(p)) return 'missing';
  try {
    const buf = fs.readFileSync(p);
    if (!safeStorage.isEncryptionAvailable()) return 'unreadable';
    safeStorage.decryptString(buf);
    return 'present';
  } catch {
    return 'unreadable';
  }
}

export function hasApiToken(): boolean {
  return fs.existsSync(tokenPath());
}

export function clearApiToken(): void {
  try {
    fs.unlinkSync(tokenPath());
  } catch {
    /* not present */
  }
}
