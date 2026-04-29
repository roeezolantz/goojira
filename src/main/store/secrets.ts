import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

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
