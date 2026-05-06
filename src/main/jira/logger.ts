import type { ApiLogEntry } from '@shared/types';

const MAX_ENTRIES = 100;
const buffer: ApiLogEntry[] = [];

function record(entry: ApiLogEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

export function getLogEntries(): ApiLogEntry[] {
  return [...buffer];
}

export function clearLogEntries(): void {
  buffer.length = 0;
}

export async function withLog<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
  const ts = new Date().toISOString();
  const start = Date.now();
  try {
    const res = await fn();
    record({ ts, kind: 'call', endpoint, durationMs: Date.now() - start });
    return res;
  } catch (e) {
    const err = e as { response?: { status?: number }; message?: string };
    record({
      ts,
      kind: 'error',
      endpoint,
      durationMs: Date.now() - start,
      httpStatus: err?.response?.status,
      errorMessage: err?.message ?? String(e),
    });
    throw e;
  }
}
