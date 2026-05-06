// Shared types between main, preload, and renderer.

export type IssueType = 'Story' | 'Bug' | 'Task' | 'Epic' | 'Sub-task' | 'Spike' | string;
export type IssuePriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | string;

export interface Issue {
  key: string;
  url: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'indeterminate' | 'done' | 'unknown';
  type: IssueType;
  priority?: IssuePriority;
  storyPoints?: number | null;
  assignee?: { accountId: string; displayName: string; avatarUrl?: string } | null;
  reporter?: { accountId: string; displayName: string; avatarUrl?: string } | null;
  projectKey: string;
  projectName: string;
  sprintId?: number | null;
  sprintName?: string | null;
  labels: string[];
  dueDate?: string | null;
  updated: string;
}

export interface Sprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string | null;
  endDate?: string | null;
  goal?: string | null;
  boardId: number;
  boardName: string;
}

export type SectionKey =
  | 'inProgress'
  | 'todo'
  | 'awaitingReview'
  | 'availableToTake'
  | 'backlog'
  | 'recentlyDone'
  | 'blocked'
  | 'mentioned';

export interface Snapshot {
  fetchedAt: string;
  user?: { accountId: string; displayName: string; emailAddress: string } | null;
  activeSprints: Sprint[]; // Active sprints across selected boards
  sections: Record<SectionKey, Issue[]>;
  errors?: string[];
}

export interface Settings {
  baseUrl: string; // e.g. "https://your-domain.atlassian.net"
  email: string;
  selectedProjectKeys: string[];
  selectedBoardIds: number[];
  refreshIntervalMinutes: number;
  groupBy: 'section' | 'project' | 'epic' | 'priority' | 'type';
  sortBy: 'updated' | 'priority' | 'storyPoints' | 'key';
  sortDirection: 'asc' | 'desc';
  filters: {
    text: string;
    projectKey?: string | null;
    issueType?: IssueType | null;
    priorityMin?: IssuePriority | null;
  };
  showSections: SectionKey[];
  launchAtLogin: boolean;
  badgeSections: SectionKey[]; // Which sections feed the menubar badge count.
  recentlyDoneWindowDays: number;
  mentionedWindowDays: number;
  // 'menubar' = tray-anchored popover, hides on blur, not draggable.
  // 'pinned'  = free-floating window, stays open, draggable from the top bar.
  popoverMode: 'menubar' | 'pinned';
  popoverPosition?: { x: number; y: number } | null;
  theme: 'auto' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: '',
  email: '',
  selectedProjectKeys: [],
  selectedBoardIds: [],
  refreshIntervalMinutes: 5,
  groupBy: 'section',
  sortBy: 'updated',
  sortDirection: 'desc',
  filters: {
    text: '',
    projectKey: null,
    issueType: null,
    priorityMin: null,
  },
  showSections: [
    'inProgress',
    'todo',
    'awaitingReview',
    'availableToTake',
    'backlog',
    'blocked',
    'recentlyDone',
  ],
  launchAtLogin: false,
  badgeSections: ['todo', 'availableToTake'],
  recentlyDoneWindowDays: 7,
  mentionedWindowDays: 7,
  popoverMode: 'menubar',
  popoverPosition: null,
  theme: 'auto',
};

export interface ProjectInfo {
  key: string;
  name: string;
  avatarUrl?: string;
}

export interface BoardInfo {
  id: number;
  name: string;
  type: 'scrum' | 'kanban' | string;
  projectKey?: string;
  projectName?: string;
}

export interface TransitionInfo {
  id: string;
  name: string;
  toStatus: string;
  toStatusCategory: 'todo' | 'indeterminate' | 'done' | 'unknown';
}

export type TokenStatus =
  | 'missing' // No token file on disk.
  | 'unreadable' // File exists but can't be decrypted under any backend.
  | 'keychain' // Present, encrypted via Electron safeStorage (OS keychain).
  | 'machine-bound'; // Present, encrypted with a machine-derived key (fallback when keychain isn't available).

export function isTokenAvailable(s: TokenStatus): boolean {
  return s === 'keychain' || s === 'machine-bound';
}

export interface ConnectionDiagnostic {
  // The URL we attempted to reach (best-effort; may include the request path).
  url: string;
  // Present when we got an HTTP response back (i.e., not a network error).
  httpStatus?: number;
  // Truncated response body, when available. May be JSON-stringified.
  responseBody?: string;
  // Human-readable interpretation of what likely went wrong.
  hint?: string;
  // Soft pre-flight warnings about settings before the network call (e.g.,
  // URL doesn't end in .atlassian.net). Present even on success.
  preflightWarnings?: string[];
}

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  user?: { accountId: string; displayName: string; emailAddress: string };
  diagnostic?: ConnectionDiagnostic;
}

export interface ApiLogEntry {
  ts: string; // ISO timestamp
  kind: 'call' | 'error';
  endpoint: string; // logical name, e.g. 'myself', 'search:inProgress'
  durationMs: number;
  httpStatus?: number;
  errorMessage?: string;
}

// IPC contract — every channel name + its request and response shape.
export interface IpcContract {
  'settings:get': { req: void; res: Settings };
  'settings:set': { req: Partial<Settings>; res: Settings };
  'auth:set-token': { req: { token: string }; res: void };
  'auth:has-token': { req: void; res: boolean };
  'auth:get-token-status': { req: void; res: TokenStatus };
  'auth:clear-token': { req: void; res: void };
  'jira:test-connection': { req: void; res: ConnectionTestResult };
  'jira:list-projects': { req: void; res: ProjectInfo[] };
  'jira:list-boards': { req: { projectKey?: string | null }; res: BoardInfo[] };
  'jira:fetch-snapshot': { req: void; res: Snapshot };
  'jira:get-transitions': { req: { issueKey: string }; res: TransitionInfo[] };
  'jira:transition': { req: { issueKey: string; transitionId: string }; res: void };
  'jira:assign-to-me': { req: { issueKey: string }; res: void };
  'jira:add-comment': { req: { issueKey: string; body: string }; res: void };
  'jira:log-work': {
    req: { issueKey: string; timeSpent: string; comment?: string };
    res: void;
  };
  'jira:create-issue': {
    req: { projectKey: string; summary: string; issueType: string };
    res: { key: string; url: string };
  };
  'jira:list-issue-types': { req: { projectKey: string }; res: { id: string; name: string }[] };
  'app:open-external': { req: { url: string }; res: void };
  'app:open-settings': { req: void; res: void };
  'app:hide-popover': { req: void; res: void };
  'app:show-popover': { req: void; res: void };
  'app:set-popover-mode': { req: { mode: 'menubar' | 'pinned' }; res: void };
  'app:quit': { req: void; res: void };
  'app:set-badge': { req: { count: number }; res: void };
  'app:set-launch-at-login': { req: { enabled: boolean }; res: void };
  'app:get-version': { req: void; res: string };
  'app:get-platform': { req: void; res: NodeJS.Platform };
  'app:get-electron-app-path': { req: void; res: string };
  'permissions:get-status': { req: void; res: PermissionsStatus };
  'permissions:open-system-settings': { req: { pane: PermissionPane }; res: void };
  'permissions:request-accessibility': { req: void; res: { granted: boolean } };
  'permissions:reveal-electron-binary': { req: void; res: void };
  'shortcuts:register': { req: void; res: { ok: boolean; error?: string } };
  'debug:get-info': { req: void; res: DebugInfo };
  'debug:get-jql': { req: void; res: Record<string, string> };
  'debug:get-logs': { req: void; res: ApiLogEntry[] };
  'debug:open-user-data': { req: void; res: void };
  'debug:open-devtools': { req: void; res: void };
  'debug:reset-settings': { req: void; res: void };
  'menu:show-issue-context': {
    req: {
      issueKey: string;
      issueUrl: string;
      isUnassigned: boolean;
    };
    res: void;
  };
}

export interface DebugInfo {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  osRelease: string;
  userDataPath: string;
  logsPath: string;
  hasToken: boolean;
  tokenStatus: TokenStatus;
  encryptionAvailable: boolean;
  settings: Settings;
  permissions: PermissionsStatus;
}

export type PermissionPane = 'accessibility' | 'inputMonitoring' | 'automation';

export interface PermissionsStatus {
  platform: NodeJS.Platform;
  // macOS Accessibility — required for `globalShortcut` to actually fire on
  // macOS 10.15+. On non-darwin platforms this is always considered granted.
  accessibility: boolean;
  // Whether our `globalShortcut.register('CommandOrControl+Shift+J')` succeeded.
  shortcutRegistered: boolean;
}

export type IpcChannel = keyof IpcContract;
export type IpcRequest<C extends IpcChannel> = IpcContract[C]['req'];
export type IpcResponse<C extends IpcChannel> = IpcContract[C]['res'];

// Push events from main → renderer.
export interface IpcEventContract {
  'snapshot:updated': Snapshot;
  'snapshot:error': { message: string };
  'settings:changed': Settings;
  // Native context menu in main asks the renderer to open these dialogs.
  'ui:open-comment-dialog': { issueKey: string };
  'ui:open-log-work-dialog': { issueKey: string };
}
export type IpcEvent = keyof IpcEventContract;
export type IpcEventPayload<E extends IpcEvent> = IpcEventContract[E];

// Public API exposed on `window.api` via the preload script.
export interface PreloadApi {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: IpcRequest<C> extends void ? [] : [IpcRequest<C>]
  ): Promise<IpcResponse<C>>;
  on<E extends IpcEvent>(event: E, handler: (payload: IpcEventPayload<E>) => void): () => void;
  windowKind: 'popover' | 'settings';
}
