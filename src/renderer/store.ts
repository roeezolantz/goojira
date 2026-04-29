import { create } from 'zustand';
import type {
  Settings,
  Snapshot,
  SectionKey,
  Issue,
  TransitionInfo,
} from '@shared/types';
import { api } from './api';

interface ContextMenu {
  issueKey: string;
  x: number;
  y: number;
}

interface State {
  snapshot: Snapshot | null;
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  searchText: string;
  // Volatile filters — reset on app restart, distinct from persisted settings.filters.
  statusFilter: string | null;
  assigneeFilter: string | null; // null = anyone, '__me__' = me, '__unassigned__' = none, else accountId
  sprintFilter: 'all' | 'current' | 'backlog';
  collapsedSections: Set<string>;
  contextMenu: ContextMenu | null;
  transitionsByIssue: Record<string, TransitionInfo[]>;
  quickCreateOpen: boolean;
  commentForIssueKey: string | null;
  logTimeForIssueKey: string | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setSearchText: (s: string) => void;
  setStatusFilter: (s: string | null) => void;
  setAssigneeFilter: (s: string | null) => void;
  setSprintFilter: (s: 'all' | 'current' | 'backlog') => void;
  clearFilters: () => void;
  toggleSection: (key: string) => void;
  setSettings: (patch: Partial<Settings>) => Promise<void>;
  openIssue: (url: string) => void;
  openContextMenu: (issueKey: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  loadTransitions: (issueKey: string) => Promise<void>;
  transitionIssue: (issueKey: string, transitionId: string) => Promise<void>;
  takeIssue: (issueKey: string) => Promise<void>;
  addComment: (issueKey: string, body: string) => Promise<void>;
  logWork: (issueKey: string, timeSpent: string, comment?: string) => Promise<void>;
  setQuickCreateOpen: (open: boolean) => void;
  createIssue: (projectKey: string, summary: string, issueType: string) => Promise<void>;
  setCommentTarget: (issueKey: string | null) => void;
  setLogTimeTarget: (issueKey: string | null) => void;
  copyIssueKey: (issue: Issue) => void;
  copyIssueLink: (issue: Issue) => void;
  hidePopover: () => void;
  openSettings: () => void;
  quit: () => void;
}

export const useStore = create<State>((set, get) => ({
  snapshot: null,
  settings: null,
  loading: false,
  error: null,
  searchText: '',
  statusFilter: null,
  assigneeFilter: null,
  sprintFilter: 'all',
  collapsedSections: new Set(),
  contextMenu: null,
  transitionsByIssue: {},
  quickCreateOpen: false,
  commentForIssueKey: null,
  logTimeForIssueKey: null,

  async init() {
    const settings = await api.invoke('settings:get');
    set({ settings });
    api.on('snapshot:updated', (snap) => set({ snapshot: snap, error: null }));
    api.on('snapshot:error', ({ message }) => set({ error: message }));
    api.on('settings:changed', (s) => set({ settings: s }));
    api.on('ui:open-comment-dialog', ({ issueKey }) => set({ commentForIssueKey: issueKey }));
    api.on('ui:open-log-work-dialog', ({ issueKey }) => set({ logTimeForIssueKey: issueKey }));
    void get().refresh();
  },

  async refresh() {
    set({ loading: true });
    try {
      const snap = await api.invoke('jira:fetch-snapshot');
      set({ snapshot: snap, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  setSearchText(s) {
    set({ searchText: s });
  },

  setStatusFilter(s) {
    set({ statusFilter: s });
  },

  setAssigneeFilter(s) {
    set({ assigneeFilter: s });
  },

  setSprintFilter(s) {
    set({ sprintFilter: s });
  },

  clearFilters() {
    set({
      searchText: '',
      statusFilter: null,
      assigneeFilter: null,
      sprintFilter: 'all',
    });
  },

  toggleSection(key) {
    const next = new Set(get().collapsedSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    set({ collapsedSections: next });
  },

  async setSettings(patch) {
    const next = await api.invoke('settings:set', patch);
    set({ settings: next });
  },

  openIssue(url) {
    void api.invoke('app:open-external', { url });
  },

  openContextMenu(issueKey, x, y) {
    set({ contextMenu: { issueKey, x, y } });
    void get().loadTransitions(issueKey);
  },

  closeContextMenu() {
    set({ contextMenu: null });
  },

  async loadTransitions(issueKey) {
    if (get().transitionsByIssue[issueKey]) return;
    try {
      const t = await api.invoke('jira:get-transitions', { issueKey });
      set((s) => ({ transitionsByIssue: { ...s.transitionsByIssue, [issueKey]: t } }));
    } catch {
      // ignore
    }
  },

  async transitionIssue(issueKey, transitionId) {
    await api.invoke('jira:transition', { issueKey, transitionId });
    set({ contextMenu: null });
    void get().refresh();
  },

  async takeIssue(issueKey) {
    await api.invoke('jira:assign-to-me', { issueKey });
    set({ contextMenu: null });
    void get().refresh();
  },

  async addComment(issueKey, body) {
    await api.invoke('jira:add-comment', { issueKey, body });
    set({ commentForIssueKey: null });
    void get().refresh();
  },

  async logWork(issueKey, timeSpent, comment) {
    await api.invoke('jira:log-work', { issueKey, timeSpent, comment });
    set({ logTimeForIssueKey: null });
  },

  setQuickCreateOpen(open) {
    set({ quickCreateOpen: open });
  },

  async createIssue(projectKey, summary, issueType) {
    const created = await api.invoke('jira:create-issue', { projectKey, summary, issueType });
    set({ quickCreateOpen: false });
    void api.invoke('app:open-external', { url: created.url });
    void get().refresh();
  },

  setCommentTarget(issueKey) {
    set({ commentForIssueKey: issueKey, contextMenu: null });
  },

  setLogTimeTarget(issueKey) {
    set({ logTimeForIssueKey: issueKey, contextMenu: null });
  },

  copyIssueKey(issue) {
    void navigator.clipboard.writeText(issue.key);
    set({ contextMenu: null });
  },

  copyIssueLink(issue) {
    void navigator.clipboard.writeText(issue.url);
    set({ contextMenu: null });
  },

  hidePopover() {
    void api.invoke('app:hide-popover');
  },

  openSettings() {
    void api.invoke('app:open-settings');
    void api.invoke('app:hide-popover');
  },

  quit() {
    void api.invoke('app:quit');
  },
}));

export const SECTION_LABELS: Record<SectionKey, string> = {
  inProgress: 'In Progress',
  todo: 'To Do',
  awaitingReview: 'Awaiting Review',
  availableToTake: 'Available to Take',
  backlog: 'Backlog',
  blocked: 'Blocked',
  recentlyDone: 'Recently Done',
  mentioned: 'Mentioned',
};

export const SECTION_ORDER: SectionKey[] = [
  'inProgress',
  'todo',
  'awaitingReview',
  'availableToTake',
  'backlog',
  'blocked',
  'recentlyDone',
  'mentioned',
];
