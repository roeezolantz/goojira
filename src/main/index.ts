import { app, globalShortcut } from 'electron';
// `globalShortcut` is also imported above for `unregisterAll` on quit.
import started from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';
import { registerIpc, broadcast, setSettingsChangeListener, registerGlobalShortcut } from './ipc';
import {
  createPopoverWindow,
  createTray,
  togglePopover,
  hidePopover,
  openSettingsWindow,
  showPopover,
} from './windows';
import { hasApiToken } from './store/secrets';
import {
  startPolling,
  stopPolling,
  refreshNow,
  onSnapshot,
  onError,
  getLastSnapshot,
} from './jira/poller';
import { getSettings } from './store/settings';
import type { Snapshot } from '@shared/types';

if (started) {
  app.quit();
}

// Auto-update from GitHub Releases (no-op in dev).
if (app.isPackaged) {
  try {
    updateElectronApp();
  } catch {
    // ignore — update server may not be configured for forks
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  togglePopover();
});

function computeBadgeCount(snap: Snapshot): number {
  const settings = getSettings();
  return settings.badgeSections.reduce(
    (sum, key) => sum + (snap.sections[key]?.length ?? 0),
    0,
  );
}

function updateBadge(snap: Snapshot): void {
  const count = computeBadgeCount(snap);
  if (process.platform === 'darwin') {
    app.dock?.setBadge(count > 0 ? String(count) : '');
  } else {
    app.setBadgeCount?.(count);
  }
}

void app.whenReady().then(() => {
  // macOS: act like a menubar/accessory app in dev too (no Dock icon, doesn't steal focus).
  if (process.platform === 'darwin') {
    app.setActivationPolicy?.('accessory');
    app.dock?.hide();
  }

  registerIpc();

  setSettingsChangeListener(() => {
    // Re-arm the polling cadence and refresh in case projects/boards/interval changed.
    startPolling();
  });

  createPopoverWindow();
  createTray(togglePopover);

  onSnapshot((snap) => {
    broadcast('snapshot:updated', snap);
    updateBadge(snap);
  });
  onError((message) => {
    broadcast('snapshot:error', { message });
  });

  startPolling();

  // Global shortcut: actual delivery requires macOS Accessibility permission.
  // The renderer's permissions screen can prompt the user and re-register.
  registerGlobalShortcut();

  app.on('activate', () => {
    createPopoverWindow();
  });

  // First-run UX: if no token, open Settings so the user has somewhere obvious to start.
  // Otherwise just show the popover briefly so they know we're alive.
  if (!hasApiToken()) {
    openSettingsWindow();
  } else {
    showPopover();
  }
});

app.on('window-all-closed', () => {
  // Keep running in the menubar — do nothing here. The default would quit on
  // non-darwin; we override by simply not calling app.quit().
});

app.on('will-quit', () => {
  stopPolling();
  globalShortcut.unregisterAll();
});

// Useful for the renderer to fall back to the last known snapshot on first paint.
export function _bootstrapSnapshot(): Snapshot | null {
  return getLastSnapshot();
}

// Force a refresh after a short delay if first try failed.
setTimeout(() => {
  if (!getLastSnapshot()) void refreshNow().catch(() => {});
}, 5000);

process.on('uncaughtException', (e) => {
  // eslint-disable-next-line no-console
  console.error('[goojira] uncaught:', e);
});

// Avoid unused-import lint until hidePopover is consumed by IPC handlers.
void hidePopover;
