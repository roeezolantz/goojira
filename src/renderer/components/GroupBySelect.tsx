import { useStore } from '../store';
import type { Settings } from '@shared/types';

const OPTIONS: { value: Settings['groupBy']; label: string }[] = [
  { value: 'section', label: 'Section' },
  { value: 'project', label: 'Project' },
  { value: 'priority', label: 'Priority' },
  { value: 'type', label: 'Type' },
  { value: 'epic', label: 'Epic' },
];

export function GroupBySelect() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  if (!settings) return null;
  return (
    <label className="flex items-center gap-1 text-[10px] text-fg-muted">
      group by
      <select
        value={settings.groupBy}
        onChange={(e) => void setSettings({ groupBy: e.target.value as Settings['groupBy'] })}
        className="rounded border border-border bg-bg-elevated px-1 py-0.5 text-[10px] text-fg focus:border-accent focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
