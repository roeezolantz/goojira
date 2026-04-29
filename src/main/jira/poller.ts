import type { Snapshot } from '@shared/types';
import { fetchSnapshot } from './snapshot';
import { getSettings } from '../store/settings';
import { hasApiToken } from '../store/secrets';

type Listener = (snapshot: Snapshot) => void;
type ErrorListener = (message: string) => void;

let timer: NodeJS.Timeout | null = null;
let inFlight = false;
let lastSnapshot: Snapshot | null = null;
const listeners = new Set<Listener>();
const errorListeners = new Set<ErrorListener>();

export function getLastSnapshot(): Snapshot | null {
  return lastSnapshot;
}

export function onSnapshot(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onError(fn: ErrorListener): () => void {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
}

export async function refreshNow(): Promise<Snapshot> {
  if (inFlight && lastSnapshot) return lastSnapshot;
  if (!hasApiToken() || !getSettings().baseUrl) {
    const empty: Snapshot = {
      fetchedAt: new Date().toISOString(),
      user: null,
      activeSprints: [],
      sections: {
        inProgress: [],
        todo: [],
        awaitingReview: [],
        availableToTake: [],
        backlog: [],
        blocked: [],
        recentlyDone: [],
        mentioned: [],
      },
      errors: ['Not configured. Open Settings to add your Jira URL, email, and API token.'],
    };
    lastSnapshot = empty;
    listeners.forEach((l) => l(empty));
    return empty;
  }

  inFlight = true;
  try {
    const snap = await fetchSnapshot();
    lastSnapshot = snap;
    listeners.forEach((l) => l(snap));
    return snap;
  } catch (e) {
    const msg = (e as Error).message;
    errorListeners.forEach((l) => l(msg));
    throw e;
  } finally {
    inFlight = false;
  }
}

export function startPolling(): void {
  stopPolling();
  // Kick off immediately
  void refreshNow().catch(() => {
    /* errors already broadcast */
  });
  scheduleNext();
}

function scheduleNext(): void {
  const minutes = Math.max(1, getSettings().refreshIntervalMinutes);
  timer = setTimeout(async () => {
    try {
      await refreshNow();
    } catch {
      /* swallow */
    } finally {
      scheduleNext();
    }
  }, minutes * 60 * 1000);
}

export function stopPolling(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
