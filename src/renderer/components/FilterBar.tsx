import { useMemo } from 'react';
import { Search, X, FilterX } from 'lucide-react';
import { useStore } from '../store';

export function FilterBar() {
  const searchText = useStore((s) => s.searchText);
  const setSearchText = useStore((s) => s.setSearchText);
  const statusFilter = useStore((s) => s.statusFilter);
  const setStatusFilter = useStore((s) => s.setStatusFilter);
  const assigneeFilter = useStore((s) => s.assigneeFilter);
  const setAssigneeFilter = useStore((s) => s.setAssigneeFilter);
  const sprintFilter = useStore((s) => s.sprintFilter);
  const setSprintFilter = useStore((s) => s.setSprintFilter);
  const clearFilters = useStore((s) => s.clearFilters);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const snapshot = useStore((s) => s.snapshot);

  // Distinct statuses + assignees taken from the live snapshot, so the
  // dropdowns only ever offer values that actually exist in the user's data.
  const { statuses, assignees } = useMemo(() => {
    const statusSet = new Set<string>();
    const assigneeMap = new Map<string, string>(); // accountId -> displayName
    if (snapshot) {
      for (const arr of Object.values(snapshot.sections)) {
        for (const i of arr) {
          if (i.status) statusSet.add(i.status);
          if (i.assignee) assigneeMap.set(i.assignee.accountId, i.assignee.displayName);
        }
      }
    }
    return {
      statuses: [...statusSet].sort((a, b) => a.localeCompare(b)),
      assignees: [...assigneeMap.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [snapshot]);

  if (!settings) return null;

  const projectKey = settings.filters.projectKey ?? '';
  const anyFilterActive =
    !!searchText ||
    !!statusFilter ||
    !!assigneeFilter ||
    sprintFilter !== 'all' ||
    !!projectKey;

  return (
    <div className="flex flex-col gap-1.5 border-b border-border-subtle px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded border border-border bg-bg-elevated py-1 pl-6 pr-2 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-subtle hover:bg-bg-hover hover:text-fg"
              title="Clear text filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {anyFilterActive && (
          <button
            onClick={() => {
              clearFilters();
              if (settings.filters.projectKey) {
                void setSettings({ filters: { ...settings.filters, projectKey: null } });
              }
            }}
            className="flex items-center gap-1 rounded border border-border bg-bg-elevated px-1.5 py-1 text-[10px] text-fg-muted hover:bg-bg-hover hover:text-fg"
            title="Clear all filters"
          >
            <FilterX className="h-3 w-3" /> clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={projectKey}
          onChange={(e) =>
            void setSettings({
              filters: { ...settings.filters, projectKey: e.target.value || null },
            })
          }
          className={selectCls}
          title="Project"
        >
          <option value="">All projects</option>
          {settings.selectedProjectKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <select
          value={statusFilter ?? ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className={selectCls}
          title="Status"
        >
          <option value="">Any status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={assigneeFilter ?? ''}
          onChange={(e) => setAssigneeFilter(e.target.value || null)}
          className={selectCls}
          title="Assignee"
        >
          <option value="">Anyone</option>
          <option value="__me__">Me</option>
          <option value="__unassigned__">Unassigned</option>
          {assignees.length > 0 && <option disabled>──────</option>}
          {assignees.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={sprintFilter}
          onChange={(e) =>
            setSprintFilter(e.target.value as 'all' | 'current' | 'backlog')
          }
          className={selectCls}
          title="Sprint"
        >
          <option value="all">Any sprint</option>
          <option value="current">Current sprint</option>
          <option value="backlog">Backlog</option>
        </select>
      </div>
    </div>
  );
}

const selectCls =
  'rounded border border-border bg-bg-elevated px-1.5 py-0.5 text-[11px] text-fg focus:border-accent focus:outline-none max-w-[120px] truncate';
