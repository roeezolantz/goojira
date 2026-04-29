import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Keyboard,
  FolderOpen,
} from 'lucide-react';
import { api } from '../api';
import type { PermissionsStatus } from '@shared/types';

export function PermissionsCard() {
  const [status, setStatus] = useState<PermissionsStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [exePath, setExePath] = useState('');

  const refresh = async () => {
    setChecking(true);
    try {
      const s = await api.invoke('permissions:get-status');
      setStatus(s);
      // After every check, try to (re-)register the shortcut — it can succeed
      // as soon as Accessibility is granted, with no app restart needed.
      await api.invoke('shortcuts:register');
      const after = await api.invoke('permissions:get-status');
      setStatus(after);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void refresh();
    void api.invoke('app:get-electron-app-path').then(setExePath);
  }, []);

  if (!status) return null;

  // Non-macOS: nothing to grant.
  if (status.platform !== 'darwin') {
    return (
      <Card tone="ok" icon={<ShieldCheck className="h-4 w-4" />}>
        <div>
          Running on <code className="text-fg">{status.platform}</code> — no special permissions
          needed. Global shortcut <Kbd>Ctrl + Shift + J</Kbd> is{' '}
          {status.shortcutRegistered ? (
            <span className="text-accent-green">registered</span>
          ) : (
            <span className="text-accent-red">not registered</span>
          )}
          .
        </div>
      </Card>
    );
  }

  const allGood = status.accessibility && status.shortcutRegistered;

  if (allGood) {
    return (
      <Card tone="ok" icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="flex items-center justify-between gap-2">
          <span>
            Accessibility granted · <Kbd>⌘ ⇧ J</Kbd> registered.
          </span>
          <button onClick={() => void refresh()} className={btnGhost}>
            <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} /> Re-check
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card tone="warn" icon={<ShieldAlert className="h-4 w-4 text-accent-yellow" />}>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="mb-1 font-semibold text-fg">Accessibility permission needed</h3>
          <p className="text-fg-muted">
            macOS requires apps to be granted <em>Accessibility</em> access in order for
            global keyboard shortcuts to fire. Without this, <Kbd>⌘ ⇧ J</Kbd> will appear
            registered but never trigger.
          </p>
        </div>

        <ol className="list-decimal pl-5 text-fg-muted">
          <li>
            Click <strong className="text-fg">Reveal Electron binary in Finder</strong> below.
            A Finder window opens with <code>Electron.app</code> already highlighted.
          </li>
          <li>
            Click <strong className="text-fg">Open Privacy Settings</strong>. The
            Accessibility list opens (you may need to unlock it with your password).
          </li>
          <li>
            <strong className="text-fg">Drag the highlighted Electron.app</strong> from
            Finder directly into the Accessibility list. (Or click <strong>+</strong> and
            navigate manually.)
          </li>
          <li>
            Toggle the new <strong className="text-fg">Electron</strong> entry{' '}
            <strong>on</strong>.
          </li>
          <li>
            Come back here and click <strong className="text-fg">Re-check</strong>. No app
            restart needed.
          </li>
        </ol>

        <details className="text-[11px] text-fg-subtle">
          <summary className="cursor-pointer hover:text-fg-muted">
            Show binary path (for manual entry)
          </summary>
          <code className="mt-1 block break-all rounded bg-bg-elevated p-1.5 text-fg-muted">
            {exePath || 'loading…'}
          </code>
        </details>

        <p className="text-[11px] text-fg-subtle">
          When you build a packaged release later, the permission entry becomes{' '}
          <code>goojira</code> instead of <code>Electron</code> — this is just a dev-mode
          quirk because all Electron-based dev apps share the same binary path.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void api.invoke('permissions:reveal-electron-binary')}
            className={btnPrimary}
          >
            <FolderOpen className="h-3 w-3" /> Reveal Electron binary in Finder
          </button>
          <button
            onClick={() =>
              void api.invoke('permissions:open-system-settings', { pane: 'accessibility' })
            }
            className={btnSecondary}
          >
            <ExternalLink className="h-3 w-3" /> Open Privacy Settings
          </button>
          <button
            onClick={() => void api.invoke('permissions:request-accessibility')}
            className={btnGhost}
            title="Asks macOS to surface its grant prompt for this app"
          >
            <Keyboard className="h-3 w-3" /> Trigger system prompt
          </button>
          <button
            onClick={() => void refresh()}
            className={btnGhost}
            disabled={checking}
          >
            <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Re-check'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-fg-muted">
          <Stat label="Accessibility" ok={status.accessibility} />
          <Stat label="⌘⇧J registered" ok={status.shortcutRegistered} />
        </div>
      </div>
    </Card>
  );
}

function Card({
  tone,
  icon,
  children,
}: {
  tone: 'ok' | 'warn';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const ringClass =
    tone === 'ok' ? 'border-accent-green/30 bg-accent-green/5' : 'border-accent-yellow/40 bg-accent-yellow/5';
  return (
    <section className={`mb-6 rounded border p-4 text-xs ${ringClass}`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">{children}</div>
      </div>
    </section>
  );
}

function Stat({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded bg-bg-elevated px-2 py-1">
      <span>{label}</span>
      <span className={ok ? 'text-accent-green' : 'text-accent-red'}>{ok ? '✓' : '✗'}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-fg">
      {children}
    </kbd>
  );
}

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1 text-xs text-white hover:bg-accent/90';
const btnSecondary =
  'inline-flex items-center gap-1.5 rounded border border-border bg-bg-elevated px-3 py-1 text-xs text-fg hover:bg-bg-hover disabled:opacity-50';
const btnGhost =
  'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] text-fg-muted hover:bg-bg-hover hover:text-fg';
