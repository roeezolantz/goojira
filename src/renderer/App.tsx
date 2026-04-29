import { useEffect, useMemo } from 'react';
import { useStore, SECTION_LABELS, SECTION_ORDER } from './store';
import type { Issue, SectionKey } from '@shared/types';
// SectionKey is used for the typed Record below.
import { TitleBar } from './components/TitleBar';
import { FilterBar } from './components/FilterBar';
import { GroupBySelect } from './components/GroupBySelect';
import { Section } from './components/Section';
import { Footer } from './components/Footer';
import { SprintBadge } from './components/SprintBadge';
import { QuickCreateDialog } from './components/QuickCreateDialog';
import { CommentDialog } from './components/CommentDialog';
import { LogWorkDialog } from './components/LogWorkDialog';
import { EmptyState } from './components/EmptyState';
import { api } from './api';

const PRIORITY_RANK: Record<string, number> = {
  Highest: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  Lowest: 5,
};

function matchesText(issue: Issue, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    issue.key.toLowerCase().includes(needle) ||
    issue.summary.toLowerCase().includes(needle) ||
    issue.projectKey.toLowerCase().includes(needle) ||
    issue.assignee?.displayName.toLowerCase().includes(needle) === true
  );
}

function matchesAssignee(
  issue: Issue,
  filter: string | null,
  myAccountId: string | undefined,
): boolean {
  if (!filter) return true;
  if (filter === '__unassigned__') return issue.assignee == null;
  if (filter === '__me__') return issue.assignee?.accountId === myAccountId;
  return issue.assignee?.accountId === filter;
}

export function App() {
  const settings = useStore((s) => s.settings);
  const snapshot = useStore((s) => s.snapshot);
  const searchText = useStore((s) => s.searchText);
  const statusFilter = useStore((s) => s.statusFilter);
  const assigneeFilter = useStore((s) => s.assigneeFilter);
  const sprintFilter = useStore((s) => s.sprintFilter);
  const refresh = useStore((s) => s.refresh);
  const openSettings = useStore((s) => s.openSettings);
  const setQuickCreateOpen = useStore((s) => s.setQuickCreateOpen);
  const toggleSection = useStore((s) => s.toggleSection);
  const setSearchText = useStore((s) => s.setSearchText);
  const hidePopover = useStore((s) => s.hidePopover);

  // Wire keyboard shortcuts at the popover level.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        void refresh();
      } else if (cmd && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Filter…"]');
        input?.focus();
        input?.select();
      } else if (cmd && e.key === ',') {
        e.preventDefault();
        openSettings();
      } else if (cmd && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setQuickCreateOpen(true);
      } else if (cmd && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        const key = SECTION_ORDER[idx];
        if (key) toggleSection(key);
      } else if (e.key === 'Escape') {
        if (searchText) {
          setSearchText('');
        } else {
          hidePopover();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [refresh, openSettings, setQuickCreateOpen, toggleSection, hidePopover, setSearchText, searchText]);

  // Update menubar badge whenever the snapshot or badge config changes.
  useEffect(() => {
    if (!snapshot || !settings) return;
    const count = settings.badgeSections.reduce(
      (sum, k) => sum + (snapshot.sections[k]?.length ?? 0),
      0,
    );
    void api.invoke('app:set-badge', { count });
  }, [snapshot, settings]);

  const filtered = useMemo(() => {
    if (!snapshot || !settings) return null;
    const result: Record<SectionKey, Issue[]> = { ...snapshot.sections };
    const projectKey = settings.filters.projectKey;
    const type = settings.filters.issueType;
    const myAccountId = snapshot.user?.accountId;
    for (const key of SECTION_ORDER) {
      result[key] = (snapshot.sections[key] ?? []).filter(
        (i) =>
          matchesText(i, searchText) &&
          (!projectKey || i.projectKey === projectKey) &&
          (!type || i.type === type) &&
          (!statusFilter || i.status === statusFilter) &&
          matchesAssignee(i, assigneeFilter, myAccountId) &&
          (sprintFilter === 'all' ||
            (sprintFilter === 'current' && i.sprintId != null) ||
            (sprintFilter === 'backlog' && i.sprintId == null)),
      );
    }
    return result;
  }, [snapshot, settings, searchText, statusFilter, assigneeFilter, sprintFilter]);

  const grouped = useMemo(() => {
    if (!filtered || !settings) return null;
    if (settings.groupBy === 'section') return null;
    const all = SECTION_ORDER.flatMap((k) => filtered[k] ?? []);
    // De-duplicate (an issue could appear in multiple sections; the first wins).
    const seen = new Set<string>();
    const unique = all.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)));

    const buckets = new Map<string, Issue[]>();
    for (const i of unique) {
      let label: string;
      switch (settings.groupBy) {
        case 'project':
          label = `${i.projectKey} — ${i.projectName}`;
          break;
        case 'priority':
          label = i.priority ?? 'No priority';
          break;
        case 'type':
          label = i.type;
          break;
        case 'epic':
          label = i.sprintName ?? 'No sprint';
          break;
        default:
          label = 'Other';
      }
      const arr = buckets.get(label) ?? [];
      arr.push(i);
      buckets.set(label, arr);
    }

    if (settings.groupBy === 'priority') {
      return [...buckets.entries()].sort(
        (a, b) => (PRIORITY_RANK[a[0]] ?? 99) - (PRIORITY_RANK[b[0]] ?? 99),
      );
    }
    return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, settings]);

  const isConfigured =
    settings && settings.baseUrl && settings.email && (snapshot?.user || !snapshot?.errors?.length);

  return (
    <div className="app-popover">
      <TitleBar />
      <FilterBar />
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-1">
        <span className="text-[10px] uppercase tracking-wider text-fg-subtle">
          {snapshot?.user?.displayName ?? '—'}
        </span>
        <GroupBySelect />
      </div>
      <div className="scroll-area flex-1 overflow-y-auto">
        {!isConfigured && !snapshot?.activeSprints.length && !snapshot?.user ? (
          <EmptyState />
        ) : grouped ? (
          grouped.map(([label, issues]) => (
            <Section key={label} collapseKey={`group:${label}`} label={label} issues={issues} />
          ))
        ) : filtered ? (
          (settings?.showSections ?? SECTION_ORDER).map((key) => {
            const issues = filtered[key] ?? [];
            const isInProgress = key === 'inProgress';
            const isBacklog = key === 'backlog';
            return (
              <Section
                key={key}
                collapseKey={key}
                label={SECTION_LABELS[key]}
                issues={issues}
                trailing={isInProgress ? <SprintBadge sprints={snapshot?.activeSprints ?? []} /> : null}
                groupAssignedFirst={isBacklog}
              />
            );
          })
        ) : (
          <div className="p-6 text-center text-sm text-fg-muted">Loading…</div>
        )}
      </div>
      <Footer />
      <QuickCreateDialog />
      <CommentDialog />
      <LogWorkDialog />
    </div>
  );
}
