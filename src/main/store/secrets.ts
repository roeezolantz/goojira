// Token storage with a graceful fallback chain.
//
// Preferred:    Electron safeStorage (OS keychain — Keychain / Credential Vault / libsecret)
// Fallback:     AES-256-GCM with a key derived from machine-stable identifiers
//
// safeStorage is the gold standard, but on unsigned macOS builds Apple's
// Keychain access is unreliable (each ad-hoc signature gets its own keychain
// identity, and Sequoia tightened the rules further). When safeStorage isn't
// available we fall back to encrypting with a key derived from a stable
// machine identifier + the app bundle path. This is strictly stronger than
// plaintext (the file isn't grep-able) and tied to the host machine, but a
// determined attacker with read access to the same machine can derive the
// same key from the same source. That's the cost of running an unsigned app.

import { app, safeStorage } from 'electron';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TokenStatus } from '@shared/types';
import {
  deriveMachineKey,
  machineEncrypt,
  machineDecrypt,
} from './crypto-machine';

const SAFE_FILE = 'token.bin';
const MACHINE_FILE = 'token.machine';

function safePath(): string {
  return path.join(app.getPath('userData'), SAFE_FILE);
}

function machinePath(): string {
  return path.join(app.getPath('userData'), MACHINE_FILE);
}

export function isEncryptionAvailable(): boolean {
  // True if Electron's OS-keychain backed safeStorage works on this machine.
  // We always have the machine-bound fallback, so this is informational.
  return safeStorage.isEncryptionAvailable();
}

function getMachineSeed(): string {
  // We want a stable identifier per (machine + app install). Sources by OS:
  //   macOS:   ioreg "IOPlatformUUID" (rock-stable across reboots, distinct per machine)
  //   Linux:   /etc/machine-id (systemd-managed, stable)
  //   Windows: HKLM\\SOFTWARE\\Microsoft\\Cryptography\\MachineGuid
  //   Fallback: hostname + username (less stable, but anything is > nothing)
  let identifier = '';
  try {
    if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], {
        timeout: 1500,
      }).toString();
      const m = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      identifier = m?.[1] ?? '';
    } else if (process.platform === 'linux') {
      try {
        identifier = fs.readFileSync('/etc/machine-id', 'utf8').trim();
      } catch {
        try {
          identifier = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
        } catch {
          identifier = '';
        }
      }
    } else if (process.platform === 'win32') {
      try {
        const out = execFileSync(
          'reg',
          ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
          { timeout: 1500 },
        ).toString();
        const m = out.match(/MachineGuid\s+REG_SZ\s+([A-Fa-f0-9-]+)/);
        identifier = m?.[1] ?? '';
      } catch {
        identifier = '';
      }
    }
  } catch {
    /* fall through to fallback */
  }
  if (!identifier) {
    identifier = `${os.hostname()}::${os.userInfo().username}`;
  }
  return identifier;
}

function machineKey(): Buffer {
  return deriveMachineKey([
    'goojira-machine-bound-v1',
    getMachineSeed(),
    app.getPath('exe'),
  ]);
}

export function setApiToken(token: string): void {
  fs.mkdirSync(path.dirname(safePath()), { recursive: true });
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(safePath(), safeStorage.encryptString(token));
    // Clean up any stale machine-bound token from a previous unavailable state.
    try {
      fs.unlinkSync(machinePath());
    } catch {
      /* not present */
    }
    return;
  }
  // Fallback: machine-bound encryption.
  const enc = machineEncrypt(token, machineKey());
  fs.writeFileSync(machinePath(), enc, { mode: 0o600 });
  // Clean up any stale safeStorage file (it would be undecryptable anyway).
  try {
    fs.unlinkSync(safePath());
  } catch {
    /* not present */
  }
}

export function getApiToken(): string | null {
  // Prefer safeStorage if its file exists AND encryption is available.
  if (fs.existsSync(safePath()) && safeStorage.isEncryptionAvailable()) {
    try {
      const buf = fs.readFileSync(safePath());
      return safeStorage.decryptString(buf);
    } catch {
      /* fall through to machine-bound */
    }
  }
  // Try machine-bound.
  if (fs.existsSync(machinePath())) {
    try {
      const buf = fs.readFileSync(machinePath());
      return machineDecrypt(buf, machineKey());
    } catch {
      /* fall through to null */
    }
  }
  return null;
}

export function getApiTokenStatus(): TokenStatus {
  const safeExists = fs.existsSync(safePath());
  const machineExists = fs.existsSync(machinePath());

  if (!safeExists && !machineExists) return 'missing';

  if (safeExists && safeStorage.isEncryptionAvailable()) {
    try {
      safeStorage.decryptString(fs.readFileSync(safePath()));
      return 'keychain';
    } catch {
      /* fall through */
    }
  }
  if (machineExists) {
    try {
      const dec = machineDecrypt(fs.readFileSync(machinePath()), machineKey());
      if (dec !== null) return 'machine-bound';
    } catch {
      /* fall through */
    }
  }
  return 'unreadable';
}

export function hasApiToken(): boolean {
  // Back-compat: kept so existing callers (e.g., DebugInfo.hasToken) still
  // work. "True" here means "a token file exists somewhere", not "we can
  // decrypt it" — use getApiTokenStatus() for that.
  return fs.existsSync(safePath()) || fs.existsSync(machinePath());
}

export function clearApiToken(): void {
  for (const p of [safePath(), machinePath()]) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* not present */
    }
  }
}
