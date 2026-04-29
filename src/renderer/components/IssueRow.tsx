import { useStore } from '../store';
import type { Issue } from '@shared/types';
import { api } from '../api';
import { IssueIcon } from './IssueIcon';
import { StatusIcon } from './StatusIcon';

interface Props {
  issue: Issue;
}

const priorityClass: Record<string, string> = {
  Highest: 'text-accent-red',
  High: 'text-accent-red',
  Medium: 'text-accent-yellow',
  Low: 'text-fg-muted',
  Lowest: 'text-fg-subtle',
};

export function IssueRow({ issue }: Props) {
  const openIssue = useStore((s) => s.openIssue);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openIssue(issue.url)}
      onContextMenu={(e) => {
        e.preventDefault();
        // Use the native OS context menu — it can extend beyond the popover
        // window's bounds (the React-rendered one was getting clipped).
        void api.invoke('menu:show-issue-context', {
          issueKey: issue.key,
          issueUrl: issue.url,
          isUnassigned: issue.assignee == null,
        });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') openIssue(issue.url);
      }}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-bg-hover focus:bg-bg-hover focus:outline-none"
      title={issue.summary}
    >
      <StatusIcon category={issue.statusCategory} />
      <IssueIcon type={issue.type} />
      <span className="font-mono text-xs text-fg-muted shrink-0">{issue.key}</span>
      <span className="flex-1 truncate">{issue.summary}</span>
      {issue.priority && priorityClass[issue.priority] && (
        <span className={`text-[10px] uppercase ${priorityClass[issue.priority]} shrink-0`}>
          {issue.priority.slice(0, 1)}
        </span>
      )}
      {issue.storyPoints != null && (
        <span className="rounded bg-bg-elevated px-1 text-[10px] text-fg-muted shrink-0">
          {issue.storyPoints}
        </span>
      )}
    </div>
  );
}
