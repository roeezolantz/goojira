import type { Sprint } from '@shared/types';

interface Props {
  sprints: Sprint[];
}

function daysUntil(endDate?: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

export function SprintBadge({ sprints }: Props) {
  if (sprints.length === 0) return null;
  const earliestEnding = [...sprints]
    .filter((s) => s.endDate)
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())[0];
  if (!earliestEnding) return null;

  const days = daysUntil(earliestEnding.endDate);
  if (days == null) return null;

  let label: string;
  let cls = 'text-fg-muted';
  if (days < 0) {
    label = `${earliestEnding.name} · overdue ${-days}d`;
    cls = 'text-accent-red';
  } else if (days === 0) {
    label = `${earliestEnding.name} · ends today`;
    cls = 'text-accent-red';
  } else if (days === 1) {
    label = `${earliestEnding.name} · 1 day left`;
    cls = 'text-accent-yellow';
  } else if (days <= 2) {
    label = `${earliestEnding.name} · ${days} days left`;
    cls = 'text-accent-yellow';
  } else {
    label = `${earliestEnding.name} · ${days} days left`;
  }

  const title =
    sprints.length > 1
      ? `${sprints.length} active sprints · earliest ending: ${earliestEnding.name}`
      : earliestEnding.name;

  return (
    <span title={title} className={`text-[10px] font-normal normal-case ${cls}`}>
      {label}
    </span>
  );
}
