import { useState } from 'react';
import { useStore } from '../store';

export function LogWorkDialog() {
  const issueKey = useStore((s) => s.logTimeForIssueKey);
  const setTarget = useStore((s) => s.setLogTimeTarget);
  const logWork = useStore((s) => s.logWork);
  const [time, setTime] = useState('30m');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  if (!issueKey) return null;

  const submit = async () => {
    if (!time.trim()) return;
    setBusy(true);
    try {
      await logWork(issueKey, time.trim(), comment.trim() || undefined);
      setTime('30m');
      setComment('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 pt-12">
      <div className="w-[320px] rounded-md border border-border bg-bg-elevated p-3 shadow-xl">
        <div className="mb-2 text-xs uppercase tracking-wide text-fg-muted">
          Log work on {issueKey}
        </div>
        <input
          autoFocus
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="Time spent (e.g. 30m, 2h, 1d)"
          className="mb-2 w-full rounded border border-border bg-bg p-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Optional comment"
          className="w-full resize-none rounded border border-border bg-bg p-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={() => setTarget(null)}
            className="rounded px-2 py-1 text-xs text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy || !time.trim()}
            className="rounded bg-accent px-3 py-1 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {busy ? 'Logging…' : 'Log work'}
          </button>
        </div>
      </div>
    </div>
  );
}
