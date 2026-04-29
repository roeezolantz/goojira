import { useState } from 'react';
import { useStore } from '../store';

export function CommentDialog() {
  const issueKey = useStore((s) => s.commentForIssueKey);
  const setTarget = useStore((s) => s.setCommentTarget);
  const addComment = useStore((s) => s.addComment);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  if (!issueKey) return null;

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await addComment(issueKey, text.trim());
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 pt-12">
      <div className="w-[320px] rounded-md border border-border bg-bg-elevated p-3 shadow-xl">
        <div className="mb-2 text-xs uppercase tracking-wide text-fg-muted">
          Comment on {issueKey}
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
            if (e.key === 'Escape') setTarget(null);
          }}
          rows={4}
          placeholder="Type your comment… (⌘↵ to submit)"
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
            disabled={busy || !text.trim()}
            className="rounded bg-accent px-3 py-1 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
