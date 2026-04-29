import { Sparkles } from 'lucide-react';
import { useStore } from '../store';

export function EmptyState() {
  const openSettings = useStore((s) => s.openSettings);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-fg-muted">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="mb-1 text-base font-semibold text-fg">goojira</p>
      <p className="mb-4 text-[11px] uppercase tracking-wider text-fg-subtle">
        good jira · your sprint at a glance
      </p>
      <p className="mb-5 max-w-[280px] text-xs leading-relaxed">
        Connect your Jira in <span className="text-fg">Settings</span> — URL, email, API
        token — then pick the projects and boards you want to follow.
      </p>
      <button
        onClick={openSettings}
        className="rounded bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
      >
        Open Settings
      </button>
    </div>
  );
}
