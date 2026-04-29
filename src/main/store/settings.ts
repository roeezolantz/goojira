import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, type Settings } from '@shared/types';

let cached: Settings | null = null;

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readFromDisk(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed, filters: { ...DEFAULT_SETTINGS.filters, ...parsed.filters } };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function getSettings(): Settings {
  if (!cached) cached = readFromDisk();
  return cached;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next: Settings = {
    ...getSettings(),
    ...patch,
    filters: { ...getSettings().filters, ...patch.filters },
  };
  cached = next;
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}
