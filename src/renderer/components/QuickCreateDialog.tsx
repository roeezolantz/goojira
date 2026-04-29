import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';

export function QuickCreateDialog() {
  const open = useStore((s) => s.quickCreateOpen);
  const setOpen = useStore((s) => s.setQuickCreateOpen);
  const settings = useStore((s) => s.settings);
  const create = useStore((s) => s.createIssue);

  const [projectKey, setProjectKey] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [summary, setSummary] = useState('');
  const [issueTypes, setIssueTypes] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !settings) return;
    const initial = settings.filters.projectKey ?? settings.selectedProjectKeys[0] ?? '';
    setProjectKey(initial);
    setSummary('');
  }, [open, settings]);

  useEffect(() => {
    if (!projectKey) {
      setIssueTypes([]);
      return;
    }
    void api.invoke('jira:list-issue-types', { projectKey }).then((types) => {
      setIssueTypes(types);
      if (types.length && !types.find((t) => t.name === issueType)) {
        setIssueType(types[0]!.name);
      }
    });
  }, [projectKey, issueType]);

  if (!open || !settings) return null;

  const submit = async () => {
    if (!projectKey || !summary.trim() || !issueType) return;
    setBusy(true);
    try {
      await create(projectKey, summary.trim(), issueType);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 pt-12">
      <div className="w-[320px] rounded-md border border-border bg-bg-elevated p-3 shadow-xl">
        <div className="mb-2 text-xs font-semibold text-fg-muted uppercase tracking-wide">
          Quick Create
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            className="rounded border border-border bg-bg px-2 py-1 text-sm text-fg focus:border-accent focus:outline-none"
          >
            <option value="">Project…</option>
            {settings.selectedProjectKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            disabled={!projectKey}
            className="rounded border border-border bg-bg px-2 py-1 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-50"
          >
            {issueTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            autoFocus
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="Summary"
            className="rounded border border-border bg-bg px-2 py-1 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-xs text-fg-muted hover:bg-bg-hover hover:text-fg"
            >
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={busy || !projectKey || !summary.trim()}
              className="rounded bg-accent px-3 py-1 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create & Open'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
