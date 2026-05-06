import {
  ipcMain,
  BrowserWindow,
  shell,
  app,
  systemPreferences,
  globalShortcut,
  Menu,
  clipboard,
} from 'electron';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import type {
  DebugInfo,
  IpcChannel,
  IpcContract,
  IpcEvent,
  IpcEventPayload,
  PermissionsStatus,
  Settings,
} from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';
import { getSettings, updateSettings } from './store/settings';
import {
  setApiToken,
  hasApiToken,
  clearApiToken,
} from './store/secrets';
import { queries } from './jira/queries';
import { invalidateClients } from './jira/client';
import { getLogEntries } from './jira/logger';
import {
  testConnection,
  listProjects,
  listBoards,
  getTransitions,
  transition,
  assignToMe,
  addComment,
  logWork,
  createIssue,
  listIssueTypes,
} from './jira/snapshot';
import type { TransitionInfo } from '@shared/types';
import { refreshNow } from './jira/poller';
import {
  showPopover,
  hidePopover,
  openSettingsWindow,
  togglePopover,
  setPopoverMode,
  getPopoverWindow,
} from './windows';

const SHORTCUT = 'CommandOrControl+Shift+J';

function checkAccessibility(): boolean {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.isTrustedAccessibilityClient(false);
}

function getShortcutRegistered(): boolean {
  return globalShortcut.isRegistered(SHORTCUT);
}

export function registerGlobalShortcut(): { ok: boolean; error?: string } {
  try {
    if (globalShortcut.isRegistered(SHORTCUT)) return { ok: true };
    const ok = globalShortcut.register(SHORTCUT, () => togglePopover());
    return ok ? { ok: true } : { ok: false, error: 'register returned false' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function permissionsStatus(): PermissionsStatus {
  return {
    platform: process.platform,
    accessibility: checkAccessibility(),
    shortcutRegistered: getShortcutRegistered(),
  };
}

type Handler<C extends IpcChannel> = (
  req: IpcContract[C]['req'],
) => Promise<IpcContract[C]['res']> | IpcContract[C]['res'];

type HandlerMap = { [C in IpcChannel]: Handler<C> };

let onSettingsChanged: ((s: Settings) => void) | null = null;

export function setSettingsChangeListener(fn: (s: Settings) => void): void {
  onSettingsChanged = fn;
}

export function broadcast<E extends IpcEvent>(event: E, payload: IpcEventPayload<E>): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(event, payload);
  }
}

const handlers: HandlerMap = {
  'settings:get': () => getSettings(),
  'settings:set': (patch) => {
    const next = updateSettings(patch);
    onSettingsChanged?.(next);
    broadcast('settings:changed', next);
    return next;
  },
  'auth:set-token': ({ token }) => {
    setApiToken(token);
    invalidateClients();
  },
  'auth:has-token': () => hasApiToken(),
  'auth:clear-token': () => {
    clearApiToken();
    invalidateClients();
  },
  'jira:test-connection': () => testConnection(),
  'jira:list-projects': () => listProjects(),
  'jira:list-boards': ({ projectKey }) => listBoards(projectKey),
  'jira:fetch-snapshot': () => refreshNow(),
  'jira:get-transitions': ({ issueKey }) => getTransitions(issueKey),
  'jira:transition': async ({ issueKey, transitionId }) => {
    await transition(issueKey, transitionId);
    void refreshNow().catch(() => {});
  },
  'jira:assign-to-me': async ({ issueKey }) => {
    await assignToMe(issueKey);
    void refreshNow().catch(() => {});
  },
  'jira:add-comment': ({ issueKey, body }) => addComment(issueKey, body),
  'jira:log-work': ({ issueKey, timeSpent, comment }) => logWork(issueKey, timeSpent, comment),
  'jira:create-issue': async ({ projectKey, summary, issueType }) => {
    const created = await createIssue(projectKey, summary, issueType);
    void refreshNow().catch(() => {});
    return created;
  },
  'jira:list-issue-types': ({ projectKey }) => listIssueTypes(projectKey),
  'app:open-external': ({ url }) => {
    void shell.openExternal(url);
  },
  'app:open-settings': () => {
    openSettingsWindow();
  },
  'app:hide-popover': () => {
    hidePopover();
  },
  'app:show-popover': () => {
    showPopover();
  },
  'app:set-popover-mode': ({ mode }) => {
    setPopoverMode(mode);
  },
  'app:quit': () => {
    app.quit();
  },
  'app:set-badge': ({ count }) => {
    if (process.platform === 'darwin') {
      app.dock?.setBadge(count > 0 ? String(count) : '');
    } else {
      app.setBadgeCount?.(count);
    }
  },
  'app:set-launch-at-login': ({ enabled }) => {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
  },
  'app:get-version': () => app.getVersion(),
  'app:get-platform': () => process.platform,
  'app:get-electron-app-path': () => app.getPath('exe'),
  'permissions:get-status': () => permissionsStatus(),
  'permissions:open-system-settings': ({ pane }) => {
    if (process.platform !== 'darwin') return;
    const url =
      pane === 'accessibility'
        ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
        : pane === 'inputMonitoring'
          ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'
          : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation';
    void shell.openExternal(url);
  },
  'permissions:request-accessibility': () => {
    if (process.platform !== 'darwin') return { granted: true };
    // Passing `true` triggers macOS to prompt the user (or surface the system
    // dialog pointing them to System Settings if the binary isn't yet listed).
    const granted = systemPreferences.isTrustedAccessibilityClient(true);
    return { granted };
  },
  'permissions:reveal-electron-binary': () => {
    // Open Finder with the Electron.app bundle highlighted, ready to drag into
    // the Accessibility list.
    if (process.platform !== 'darwin') return;
    // app.getPath('exe') points to .../Electron.app/Contents/MacOS/Electron.
    // The user wants to drag the .app bundle, three levels up.
    const exe = app.getPath('exe');
    const appBundle = exe.replace(/\/Contents\/MacOS\/[^/]+$/, '');
    void shell.showItemInFolder(appBundle);
  },
  'shortcuts:register': () => registerGlobalShortcut(),
  'menu:show-issue-context': async ({ issueKey, issueUrl, isUnassigned }) => {
    // Anchor on the popover window rather than the OS-focused one — right-click
    // can change focus and would leave us with no window or the wrong one.
    const win =
      getPopoverWindow() ??
      BrowserWindow.getFocusedWindow() ??
      BrowserWindow.getAllWindows()[0];
    if (!win) {
      console.error('[goojira] context menu: no window available');
      return;
    }

    // Show the menu immediately with the static items, then fetch transitions
    // in parallel and append them. This avoids a 100-300ms perceptible delay
    // before the menu appears at all.
    let transitions: TransitionInfo[] = [];
    try {
      transitions = await getTransitions(issueKey);
    } catch (e) {
      console.error('[goojira] context menu: getTransitions failed', e);
    }

    const transitionItems: Electron.MenuItemConstructorOptions[] = transitions.map((t) => ({
      label: `${t.name}  →  ${t.toStatus}`,
      click: async () => {
        try {
          await transition(issueKey, t.id);
          void refreshNow().catch(() => {});
        } catch {
          /* surfaced via snapshot:error */
        }
      },
    }));

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Open in browser',
        click: () => {
          void shell.openExternal(issueUrl);
        },
      },
      {
        label: `Copy key  (${issueKey})`,
        click: () => clipboard.writeText(issueKey),
      },
      {
        label: 'Copy link',
        click: () => clipboard.writeText(issueUrl),
      },
      { type: 'separator' },
    ];

    if (isUnassigned) {
      template.push({
        label: 'Take this ticket (assign to me)',
        click: async () => {
          try {
            await assignToMe(issueKey);
            void refreshNow().catch(() => {});
          } catch {
            /* surfaced via snapshot:error */
          }
        },
      });
      template.push({ type: 'separator' });
    }

    template.push(
      {
        label: 'Add comment…',
        click: () => {
          win.webContents.send('ui:open-comment-dialog', { issueKey });
        },
      },
      {
        label: 'Log work…',
        click: () => {
          win.webContents.send('ui:open-log-work-dialog', { issueKey });
        },
      },
    );

    if (transitionItems.length > 0) {
      template.push(
        { type: 'separator' },
        {
          label: 'Transition to',
          submenu: transitionItems,
        },
      );
    }

    try {
      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: win });
    } catch (e) {
      console.error('[goojira] context menu: popup failed', e);
    }
  },
  'debug:get-info': (): DebugInfo => ({
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron ?? 'unknown',
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome ?? 'unknown',
    platform: process.platform,
    arch: process.arch,
    osRelease: `${os.type()} ${os.release()}`,
    userDataPath: app.getPath('userData'),
    logsPath: app.getPath('logs'),
    hasToken: hasApiToken(),
    settings: getSettings(),
    permissions: permissionsStatus(),
  }),
  'debug:get-jql': () => {
    const s = getSettings();
    const ctx = {
      projectKeys: s.selectedProjectKeys,
      recentlyDoneWindowDays: s.recentlyDoneWindowDays,
      mentionedWindowDays: s.mentionedWindowDays,
    };
    return Object.fromEntries(
      Object.entries(queries).map(([k, fn]) => [k, fn(ctx)]),
    );
  },
  'debug:get-logs': () => getLogEntries(),
  'debug:open-user-data': () => {
    void shell.openPath(app.getPath('userData'));
  },
  'debug:open-devtools': () => {
    const focused = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    focused?.webContents.openDevTools({ mode: 'detach' });
  },
  'debug:reset-settings': () => {
    // Wipe settings + token. Used as a "factory reset" from the debug panel.
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
    } catch {
      /* ignore */
    }
    clearApiToken();
    // Re-seed a fresh settings file so subsequent reads aren't surprised.
    updateSettings({ ...DEFAULT_SETTINGS });
  },
};

export function registerIpc(): void {
  for (const channel of Object.keys(handlers) as IpcChannel[]) {
    ipcMain.handle(channel, async (_event, req) => {
      try {
        return await (handlers[channel] as (r: unknown) => unknown)(req);
      } catch (e) {
        // Re-throw so the renderer's invoke() rejects with the message.
        throw new Error((e as Error).message);
      }
    });
  }
  // Convenience commands not in the typed contract:
  ipcMain.on('popover:show', () => showPopover());
}
