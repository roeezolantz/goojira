import { BrowserWindow, screen, Tray, nativeImage, app } from 'electron';
import path from 'node:path';
import { getSettings, updateSettings } from './store/settings';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const POPOVER_WIDTH = 380;
const POPOVER_HEIGHT = 600;

let popoverWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function rendererUrl(devUrl: string | undefined, name: string): string {
  if (devUrl) return devUrl;
  return `file://${path.join(__dirname, `../renderer/${name}/index.html`)}`;
}

function preloadPath(): string {
  // Both main.js and preload.js are emitted by plugin-vite into .vite/build/.
  return path.join(__dirname, 'preload.js');
}

export function createPopoverWindow(): BrowserWindow {
  if (popoverWindow && !popoverWindow.isDestroyed()) return popoverWindow;
  const win = new BrowserWindow({
    width: POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    movable: true, // The renderer's top strip provides the drag region.
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: ['--window-kind=popover'],
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void win.loadURL(rendererUrl(MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME));
  }

  win.on('blur', () => {
    // In pinned mode the user wants the window to stay put.
    if (getSettings().popoverMode !== 'menubar') return;
    if (!win.webContents.isDevToolsOpened()) win.hide();
  });
  // Persist the user's preferred position when pinned, so subsequent opens
  // restore it instead of re-centering.
  win.on('moved', () => {
    if (getSettings().popoverMode !== 'pinned') return;
    const pos = win.getPosition();
    const x = pos[0] ?? 0;
    const y = pos[1] ?? 0;
    updateSettings({ popoverPosition: { x, y } });
  });
  win.on('closed', () => {
    popoverWindow = null;
  });

  popoverWindow = win;
  return win;
}

function positionPopoverNearTray(win: BrowserWindow): void {
  if (!tray) return;
  const trayBounds = tray.getBounds();
  const winBounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x + trayBounds.width / 2,
    y: trayBounds.y + trayBounds.height / 2,
  });

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  let y: number;
  if (process.platform === 'darwin') {
    y = Math.round(trayBounds.y + trayBounds.height + 4);
  } else {
    y = Math.round(trayBounds.y - winBounds.height - 4);
  }

  const wa = display.workArea;
  x = Math.max(wa.x + 4, Math.min(x, wa.x + wa.width - winBounds.width - 4));
  y = Math.max(wa.y + 4, Math.min(y, wa.y + wa.height - winBounds.height - 4));

  win.setPosition(x, y, false);
}

function positionPopoverPinned(win: BrowserWindow): void {
  const settings = getSettings();
  const winBounds = win.getBounds();
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const wa = display.workArea;

  const saved = settings.popoverPosition;
  // Reuse saved position if it still falls on a connected display.
  if (saved && saved.x >= wa.x && saved.x + winBounds.width <= wa.x + wa.width) {
    win.setPosition(saved.x, saved.y, false);
    return;
  }
  // Otherwise center on the display under the cursor.
  const x = Math.round(wa.x + (wa.width - winBounds.width) / 2);
  const y = Math.round(wa.y + (wa.height - winBounds.height) / 2);
  win.setPosition(x, y, false);
}

export function showPopover(): void {
  const win = createPopoverWindow();
  if (getSettings().popoverMode === 'pinned') {
    positionPopoverPinned(win);
  } else {
    positionPopoverNearTray(win);
  }
  win.show();
  win.focus();
}

export function setPopoverMode(mode: 'menubar' | 'pinned'): void {
  updateSettings({ popoverMode: mode });
  const win = createPopoverWindow();
  // Pinned mode: drop alwaysOnTop so the user can stack other windows over it
  // if they want; menubar mode keeps it floating.
  win.setAlwaysOnTop(mode !== 'pinned');
  if (mode === 'pinned') {
    // Reset saved position so the next show centers, unless they've already
    // saved one this session.
    if (!getSettings().popoverPosition) positionPopoverPinned(win);
    else positionPopoverPinned(win);
  } else {
    positionPopoverNearTray(win);
  }
  if (!win.isVisible()) win.show();
  win.focus();
}

export function hidePopover(): void {
  if (popoverWindow && !popoverWindow.isDestroyed()) popoverWindow.hide();
}

export function togglePopover(): void {
  if (popoverWindow && popoverWindow.isVisible()) {
    hidePopover();
  } else {
    showPopover();
  }
}

export function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  // No backgroundColor — let the renderer's themed CSS paint the window so
  // light-mode users don't see a dark flash on open.
  const win = new BrowserWindow({
    width: 720,
    height: 640,
    title: 'goojira — Settings',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: ['--window-kind=settings'],
    },
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void win.loadURL(rendererUrl(MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME));
  }
  win.on('closed', () => {
    settingsWindow = null;
  });
  if (process.platform === 'darwin') app.dock?.show();
  settingsWindow = win;
}

export function getTray(): Tray | null {
  return tray;
}

export function getPopoverWindow(): BrowserWindow | null {
  return popoverWindow && !popoverWindow.isDestroyed() ? popoverWindow : null;
}

function loadTrayIcon(): Electron.NativeImage {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'assets', 'iconTemplate.png'),
    path.join(__dirname, '../../assets/iconTemplate.png'),
    path.join(app.getAppPath(), 'assets/iconTemplate.png'),
  ];
  for (const p of candidates) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) {
      if (process.platform === 'darwin') img.setTemplateImage(true);
      return img;
    }
  }
  return nativeImage.createEmpty();
}

export function createTray(onClick: () => void): Tray {
  const icon = loadTrayIcon();
  tray = new Tray(icon);
  // Always show "GJ" text next to the icon so it's findable in the menubar.
  tray.setTitle(' GJ');
  tray.setToolTip('goojira — click to open, ⌘⇧J to toggle');
  tray.on('click', onClick);
  tray.on('right-click', onClick);
  return tray;
}
