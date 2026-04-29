import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DebugInfo, Snapshot } from '@shared/types';
import {
  RefreshCw,
  FolderOpen,
  Bug,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export function DebugPanel() {
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [jql, setJql] = useState<Record<string, string> | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapBusy, setSnapBusy] = useState(false);
  const [open, setOpen] = useState({ env: true, settings: false, jql: false, snap: false });

  const refresh = async () => {
    const i = await api.invoke('debug:get-info');
    setInfo(i);
    const q = await api.invoke('debug:get-jql');
    setJql(q);
  };

  const fetchSnap = async () => {
    setSnapBusy(true);
    try {
      const s = await api.invoke('jira:fetch-snapshot');
      setSnapshot(s);
    } catch (e) {
      setSnapshot({
        fetchedAt: new Date().toISOString(),
        user: null,
        activeSprints: [],
        sections: {} as Snapshot['sections'],
        errors: [(e as Error).message],
      });
    } finally {
      setSnapBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (!info) return <div className="text-fg-muted">Loading debug info…</div>;

  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-yellow">
        <Bug className="h-3.5 w-3.5" /> Debug
      </h2>
      <div className="flex flex-col gap-3 rounded border border-accent-yellow/30 bg-bg-elevated/40 p-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void refresh()} className={btn}>
            <RefreshCw className="h-3 w-3" /> Refresh info
          </button>
          <button onClick={() => void fetchSnap()} className={btn} disabled={snapBusy}>
            <RefreshCw className={`h-3 w-3 ${snapBusy ? 'animate-spin' : ''}`} />
            {snapBusy ? 'Fetching…' : 'Fetch snapshot now'}
          </button>
          <button
            onClick={() => void api.invoke('debug:open-user-data')}
            className={btn}
            title={info.userDataPath}
          >
            <FolderOpen className="h-3 w-3" /> Open user-data folder
          </button>
          <button onClick={() => void api.invoke('debug:open-devtools')} className={btn}>
            <Bug className="h-3 w-3" /> Open DevTools
          </button>
          <button
            onClick={async () => {
              if (!confirm('Wipe all settings and the saved token? This cannot be undone.')) return;
              await api.invoke('debug:reset-settings');
              await refresh();
              location.reload();
            }}
            className={btnDanger}
          >
            <Trash2 className="h-3 w-3" /> Reset settings
          </button>
        </div>

        <Pane
          label="Environment"
          isOpen={open.env}
          onToggle={() => setOpen((o) => ({ ...o, env: !o.env }))}
        >
          <KV pairs={[
            ['App', `v${info.appVersion}`],
            ['Electron', info.electronVersion],
            ['Chrome', info.chromeVersion],
            ['Node', info.nodeVersion],
            ['Platform', `${info.platform} (${info.arch})`],
            ['OS', info.osRelease],
            ['User data', info.userDataPath],
            ['Logs', info.logsPath],
            ['Token saved', info.hasToken ? '✓' : '✗'],
            ['Accessibility', info.permissions.accessibility ? '✓' : '✗'],
            ['⌘⇧J registered', info.permissions.shortcutRegistered ? '✓' : '✗'],
          ]} />
        </Pane>

        <Pane
          label="Effective settings"
          isOpen={open.settings}
          onToggle={() => setOpen((o) => ({ ...o, settings: !o.settings }))}
        >
          <Json value={info.settings} />
        </Pane>

        {jql && (
          <Pane
            label={`JQL queries (${Object.keys(jql).length})`}
            isOpen={open.jql}
            onToggle={() => setOpen((o) => ({ ...o, jql: !o.jql }))}
          >
            <div className="flex flex-col gap-2">
              {Object.entries(jql).map(([k, q]) => (
                <div key={k}>
                  <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-fg-muted">
                    <span>{k}</span>
                    <button
                      onClick={() => void navigator.clipboard.writeText(q)}
                      className="rounded p-0.5 hover:bg-bg-hover"
                      title="Copy JQL"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <code className="block break-all rounded bg-bg p-2 text-[11px] text-fg">
                    {q || '(empty)'}
                  </code>
                </div>
              ))}
            </div>
          </Pane>
        )}

        {snapshot && (
          <Pane
            label="Last snapshot"
            isOpen={open.snap}
            onToggle={() => setOpen((o) => ({ ...o, snap: !o.snap }))}
          >
            <div className="mb-2 grid grid-cols-2 gap-1 text-[11px]">
              <KV
                pairs={[
                  ['Fetched', snapshot.fetchedAt],
                  ['User', snapshot.user?.displayName ?? '(none)'],
                  ['Active sprints', String(snapshot.activeSprints.length)],
                  [
                    'Total issues',
                    String(
                      Object.values(snapshot.sections).reduce(
                        (n, arr) => n + arr.length,
                        0,
                      ),
                    ),
                  ],
                ]}
              />
            </div>
            {snapshot.errors && snapshot.errors.length > 0 && (
              <div className="mb-2 rounded border border-accent-red/30 bg-accent-red/10 p-2 text-[11px] text-accent-red">
                <div className="mb-1 font-semibold">Errors:</div>
                <ul className="list-disc pl-4">
                  {snapshot.errors.map((e, i) => (
                    <li key={i} className="break-all">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-[11px]">
              <div className="mb-1 text-fg-muted">Section counts:</div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(snapshot.sections).map(([k, arr]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded bg-bg px-2 py-0.5"
                  >
                    <span className="text-fg-muted">{k}</span>
                    <span className="text-fg">{arr.length}</span>
                  </div>
                ))}
              </div>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-fg-muted hover:text-fg">
                Raw JSON
              </summary>
              <Json value={snapshot} />
            </details>
          </Pane>
        )}
      </div>
    </section>
  );
}

function Pane({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-border-subtle bg-bg p-2">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted hover:text-fg"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}

function KV({ pairs }: { pairs: [string, string][] }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-0.5 text-[11px]">
      {pairs.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-fg-muted">{k}</span>
          <code className="break-all text-fg">{v}</code>
        </div>
      ))}
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="relative">
      <button
        onClick={() => void navigator.clipboard.writeText(text)}
        className="absolute right-1 top-1 rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
        title="Copy JSON"
      >
        <Copy className="h-3 w-3" />
      </button>
      <pre className="max-h-72 overflow-auto rounded bg-bg p-2 text-[10px] text-fg-muted">
        {text}
      </pre>
    </div>
  );
}

const btn =
  'inline-flex items-center gap-1.5 rounded border border-border bg-bg px-2 py-1 text-[11px] text-fg hover:bg-bg-hover disabled:opacity-50';
const btnDanger =
  'inline-flex items-center gap-1.5 rounded border border-accent-red/40 bg-accent-red/10 px-2 py-1 text-[11px] text-accent-red hover:bg-accent-red/20';
