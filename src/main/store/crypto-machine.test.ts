import { describe, it, expect } from 'vitest';
import { deriveMachineKey, machineEncrypt, machineDecrypt } from './crypto-machine';

describe('deriveMachineKey', () => {
  it('produces a 32-byte key (AES-256)', () => {
    expect(deriveMachineKey(['a']).length).toBe(32);
    expect(deriveMachineKey(['a', 'b', 'c']).length).toBe(32);
  });

  it('is deterministic for the same inputs', () => {
    const a = deriveMachineKey(['machine-uuid', '/Applications/goojira.app']);
    const b = deriveMachineKey(['machine-uuid', '/Applications/goojira.app']);
    expect(a.equals(b)).toBe(true);
  });

  it('produces different keys for different inputs', () => {
    const a = deriveMachineKey(['machine-A']);
    const b = deriveMachineKey(['machine-B']);
    expect(a.equals(b)).toBe(false);
  });

  it('treats component order as significant', () => {
    const a = deriveMachineKey(['x', 'y']);
    const b = deriveMachineKey(['y', 'x']);
    expect(a.equals(b)).toBe(false);
  });
});

describe('machineEncrypt / machineDecrypt', () => {
  const key = deriveMachineKey(['test-machine', '/test/app']);

  it('roundtrips a typical Jira API token', () => {
    const token = 'ATATT3xFfGF0' + 'a'.repeat(180);
    const enc = machineEncrypt(token, key);
    expect(machineDecrypt(enc, key)).toBe(token);
  });

  it('roundtrips short and unicode strings', () => {
    expect(machineDecrypt(machineEncrypt('a', key), key)).toBe('a');
    expect(machineDecrypt(machineEncrypt('שלום 🪶', key), key)).toBe('שלום 🪶');
  });

  it('produces different ciphertext for the same input (random IV)', () => {
    const a = machineEncrypt('same input', key);
    const b = machineEncrypt('same input', key);
    expect(a.equals(b)).toBe(false);
  });

  it('rejects decryption with a different key', () => {
    const enc = machineEncrypt('secret', key);
    const otherKey = deriveMachineKey(['different-machine']);
    expect(machineDecrypt(enc, otherKey)).toBeNull();
  });

  it('rejects tampered ciphertext (GCM auth tag check)', () => {
    const enc = machineEncrypt('secret', key);
    enc.writeUInt8(enc.readUInt8(enc.length - 1) ^ 0x01, enc.length - 1);
    expect(machineDecrypt(enc, key)).toBeNull();
  });

  it('rejects tampered auth tag', () => {
    const enc = machineEncrypt('secret', key);
    enc.writeUInt8(enc.readUInt8(12) ^ 0x01, 12); // tag starts at byte 12
    expect(machineDecrypt(enc, key)).toBeNull();
  });

  it('returns null on a too-short buffer', () => {
    expect(machineDecrypt(Buffer.alloc(10), key)).toBeNull();
  });

  it('throws on a wrong-size key during encrypt', () => {
    const badKey = Buffer.alloc(16);
    expect(() => machineEncrypt('x', badKey)).toThrow();
  });
});
