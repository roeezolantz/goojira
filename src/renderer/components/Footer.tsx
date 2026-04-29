import { useState } from 'react';
import {
  RefreshCw,
  Settings as SettingsIcon,
  Plus,
  Power,
  AlertTriangle,
  Copy,
  Check,
  Pin,
  PinOff,
} from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api';

function relativeTime(iso: string | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Footer() {
  const snapshot = useStore((s) => s.snapshot);
  const loading = useStore((s) => s.loading);
  const refresh = useStore((s) => s.refresh);
  const openSettings = useStore((s) => s.openSettings);
  const setQuickCreateOpen = useStore((s) => s.setQuickCreateOpen);
  const quit = useStore((s) => s.quit);
  const error = useStore((s) => s.error);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const isPinned = settings?.popoverMode === 'pinned';

  const togglePin = async () => {
    const next = isPinned ? 'menubar' : 'pinned';
    await setSettings({ popoverMode: next });
    await api.invoke('app:set-popover-mode', { mode: next });
  };
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sectionErrors = snapshot?.errors ?? [];

  const copyErrors = async () => {
    await navigator.clipboard.writeText(sectionErrors.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const totalIssues = snapshot
    ? Object.values(snapshot.sections).reduce((n, arr) => n + arr.length, 0)
    : 0;

  return (
    <>
      {sectionErrors.length > 0 && errorsOpen && (
        <div className="border-t border-accent-red/30 bg-accent-red/10 px-3 py-2 text-[11px] text-accent-red">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold">Some queries failed:</span>
            <button
              onClick={() => void copyErrors()}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] hover:bg-accent-red/20"
              title="Copy all errors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
          <ul className="list-disc pl-4">
            {sectionErrors.map((e, i) => (
              <li key={i} className="break-all">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
      <footer className="flex items-center gap-1.5 border-t border-border-subtle px-2 py-1.5 text-[11px] text-fg-muted">
        <span
          className="flex-1 truncate"
          title={error ?? `${totalIssues} issues · fetched ${snapshot?.fetchedAt ?? 'never'}`}
        >
          {error ? (
            <span className="text-accent-red">{error}</span>
          ) : (
            <>
              {totalIssues} issues · {relativeTime(snapshot?.fetchedAt)}
            </>
          )}
        </span>
        {sectionErrors.length > 0 && (
          <button
            onClick={() => setErrorsOpen((o) => !o)}
            title={`${sectionErrors.length} query error${sectionErrors.length > 1 ? 's' : ''}`}
            className="flex items-center gap-1 rounded p-1 text-accent-yellow hover:bg-bg-hover"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-[10px]">{sectionErrors.length}</span>
          </button>
        )}
      <button
        onClick={() => setQuickCreateOpen(true)}
        title="Quick create (⌘N)"
        className="rounded p-1 hover:bg-bg-hover hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => void refresh()}
        title="Refresh (⌘R)"
        className={`rounded p-1 hover:bg-bg-hover hover:text-fg ${loading ? 'animate-spin' : ''}`}
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => void togglePin()}
        title={isPinned ? 'Dock to menubar' : 'Pin window (stays open & draggable)'}
        className="rounded p-1 hover:bg-bg-hover hover:text-fg"
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={openSettings}
        title="Settings (⌘,)"
        className="rounded p-1 hover:bg-bg-hover hover:text-fg"
      >
        <SettingsIcon className="h-3.5 w-3.5" />
      </button>
        <button
          onClick={quit}
          title="Quit"
          className="rounded p-1 hover:bg-bg-hover hover:text-accent-red"
        >
          <Power className="h-3.5 w-3.5" />
        </button>
      </footer>
    </>
  );
}
