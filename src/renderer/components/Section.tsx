import { ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import type { Issue } from '@shared/types';
import { IssueRow } from './IssueRow';

interface Props {
  collapseKey: string;
  label: string;
  issues: Issue[];
  trailing?: React.ReactNode;
  groupAssignedFirst?: boolean;
  emptyText?: string;
}

export function Section({
  collapseKey,
  label,
  issues,
  trailing,
  groupAssignedFirst = false,
  emptyText,
}: Props) {
  const collapsed = useStore((s) => s.collapsedSections.has(collapseKey));
  const toggle = useStore((s) => s.toggleSection);

  if (issues.length === 0 && !emptyText) return null;

  let body: React.ReactNode;
  if (issues.length === 0) {
    body = <div className="px-3 py-2 text-xs text-fg-subtle">{emptyText}</div>;
  } else if (groupAssignedFirst) {
    const mine = issues.filter((i) => i.assignee != null);
    const open = issues.filter((i) => i.assignee == null);
    body = (
      <>
        {mine.length > 0 && (
          <>
            <div className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-wider text-fg-subtle">
              Assigned to me
            </div>
            {mine.map((i) => (
              <IssueRow key={i.key} issue={i} />
            ))}
          </>
        )}
        {open.length > 0 && (
          <>
            <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-fg-subtle">
              Unassigned
            </div>
            {open.map((i) => (
              <IssueRow key={i.key} issue={i} />
            ))}
          </>
        )}
      </>
    );
  } else {
    body = issues.map((i) => <IssueRow key={i.key} issue={i} />);
  }

  return (
    <section>
      <header
        onClick={() => toggle(collapseKey)}
        className="sticky top-0 z-10 flex cursor-pointer items-center gap-1.5 bg-bg/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted backdrop-blur"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span className="flex-1">
          {label}
          <span className="ml-1.5 font-normal text-fg-subtle">{issues.length}</span>
        </span>
        {trailing}
      </header>
      {!collapsed && <div>{body}</div>}
    </section>
  );
}
