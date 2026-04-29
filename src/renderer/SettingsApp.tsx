import { useEffect, useState } from 'react';
import { api } from './api';
import { useStore, SECTION_LABELS, SECTION_ORDER } from './store';
import type { BoardInfo, ConnectionTestResult, ProjectInfo } from '@shared/types';
import { PermissionsCard } from './components/PermissionsCard';
import { DebugPanel } from './components/DebugPanel';

export function SettingsApp() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [test, setTest] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listError, setListError] = useState<{ projects?: string; boards?: string } | null>(null);
  const [version, setVersion] = useState('');
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);

  useEffect(() => {
    void useStore.getState().init();
    void api.invoke('auth:has-token').then(setHasToken);
    void api.invoke('app:get-version').then(setVersion);
  }, []);

  if (!settings) return <div className="app-settings p-6 text-fg-muted">Loading…</div>;

  const saveToken = async () => {
    if (!token.trim()) return;
    await api.invoke('auth:set-token', { token: token.trim() });
    setToken('');
    setHasToken(true);
  };

  const clearToken = async () => {
    await api.invoke('auth:clear-token');
    setHasToken(false);
    setTest(null);
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const res = await api.invoke('jira:test-connection');
      setTest(res);
    } finally {
      setTesting(false);
    }
  };

  const loadProjectsAndBoards = async () => {
    setLoadingLists(true);
    setListError(null);
    const errs: { projects?: string; boards?: string } = {};
    try {
      const ps = await api.invoke('jira:list-projects');
      setProjects(ps);
      if (ps.length === 0) errs.projects = '0 projects returned (API succeeded but list is empty)';
    } catch (e) {
      errs.projects = (e as Error).message;
      console.error('[goojira] list-projects failed', e);
    }
    try {
      const bs = await api.invoke('jira:list-boards', { projectKey: null });
      setBoards(bs);
      if (bs.length === 0) errs.boards = '0 boards returned (you may need a Jira Software / Agile license, or no boards have been created yet)';
    } catch (e) {
      errs.boards = (e as Error).message;
      console.error('[goojira] list-boards failed', e);
    }
    setListError(Object.keys(errs).length ? errs : null);
    setLoadingLists(false);
  };

  const toggleArrayValue = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="app-settings overflow-y-auto p-6 text-sm">
      <h1 className="mb-4 text-base font-semibold text-fg">goojira — Settings</h1>

      <PermissionsCard />

      <Group title="Connection">
        <Field label="Jira URL">
          <input
            value={settings.baseUrl}
            onChange={(e) => void setSettings({ baseUrl: e.target.value.trim() })}
            placeholder="https://your-domain.atlassian.net"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            value={settings.email}
            onChange={(e) => void setSettings({ email: e.target.value.trim() })}
            placeholder="you@example.com"
            className={inputCls}
          />
        </Field>
        <Field label="API Token">
          {hasToken ? (
            <div className="flex items-center gap-2">
              <span className="rounded bg-bg-elevated px-2 py-1 text-xs text-fg-muted">
                ●●●●●●●● stored in OS keychain
              </span>
              <button onClick={() => void clearToken()} className={btnSecondary}>
                Clear
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="paste token from id.atlassian.com"
                className={inputCls}
              />
              <button onClick={() => void saveToken()} className={btnPrimary} disabled={!token.trim()}>
                Save
              </button>
            </div>
          )}
        </Field>
        <p className="mb-2 text-xs text-fg-subtle">
          Generate an API token at{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              void api.invoke('app:open-external', {
                url: 'https://id.atlassian.com/manage-profile/security/api-tokens',
              });
            }}
            className="text-accent hover:underline"
          >
            id.atlassian.com/manage-profile/security/api-tokens
          </a>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => void runTest()} className={btnSecondary} disabled={testing}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          {test &&
            (test.ok ? (
              <span className="text-xs text-accent-green">
                ✓ Connected as {test.user?.displayName} ({test.user?.emailAddress})
              </span>
            ) : (
              <span className="text-xs text-accent-red">✗ {test.error}</span>
            ))}
        </div>
      </Group>

      <Group title="Projects & Boards">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadProjectsAndBoards()}
            className={btnSecondary}
            disabled={loadingLists || !hasToken}
          >
            {loadingLists ? 'Loading…' : 'Load projects & boards'}
          </button>
          {!hasToken && (
            <span className="text-[11px] text-fg-subtle">save a token first</span>
          )}
          {!loadingLists && projects.length > 0 && (
            <span className="text-[11px] text-accent-green">
              ✓ {projects.length} project{projects.length === 1 ? '' : 's'} · {boards.length} board
              {boards.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {listError && (
          <div className="rounded border border-accent-red/30 bg-accent-red/5 p-2 text-[11px] text-accent-red">
            {listError.projects && (
              <div className="break-all">
                <strong>Projects:</strong> {listError.projects}
              </div>
            )}
            {listError.boards && (
              <div className="break-all">
                <strong>Boards:</strong> {listError.boards}
              </div>
            )}
          </div>
        )}

        {projects.length > 0 && (
          <Field label="Projects to track">
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded border border-border bg-bg-elevated p-2">
              {projects.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={settings.selectedProjectKeys.includes(p.key)}
                    onChange={() =>
                      void setSettings({
                        selectedProjectKeys: toggleArrayValue(settings.selectedProjectKeys, p.key),
                      })
                    }
                  />
                  <span className="font-mono text-fg-muted">{p.key}</span>
                  <span className="truncate text-fg">{p.name}</span>
                </label>
              ))}
            </div>
          </Field>
        )}

        {boards.length > 0 && (
          <Field label="Boards to track (for active sprint)">
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded border border-border bg-bg-elevated p-2">
              {boards.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={settings.selectedBoardIds.includes(b.id)}
                    onChange={() =>
                      void setSettings({
                        selectedBoardIds: toggleArrayValue(settings.selectedBoardIds, b.id),
                      })
                    }
                  />
                  <span className="text-fg">{b.name}</span>
                  <span className="text-fg-muted">{b.type}</span>
                  {b.projectKey && <span className="text-fg-subtle">· {b.projectKey}</span>}
                </label>
              ))}
            </div>
          </Field>
        )}
      </Group>

      <Group title="Display">
        <Field label="Theme">
          <div className="flex gap-1">
            {(['auto', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => void setSettings({ theme: t })}
                className={
                  settings.theme === t
                    ? 'rounded border border-accent bg-accent px-3 py-1 text-xs text-white'
                    : 'rounded border border-border bg-bg-elevated px-3 py-1 text-xs text-fg hover:bg-bg-hover'
                }
              >
                {t === 'auto' ? 'Auto (system)' : t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Refresh interval (minutes)">
          <input
            type="number"
            min={1}
            max={120}
            value={settings.refreshIntervalMinutes}
            onChange={(e) =>
              void setSettings({
                refreshIntervalMinutes: Math.max(1, Math.min(120, Number(e.target.value) || 5)),
              })
            }
            className={inputCls + ' w-20'}
          />
        </Field>
        <Field label="Sections to show">
          <div className="flex flex-wrap gap-2">
            {SECTION_ORDER.map((key) => (
              <label key={key} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={settings.showSections.includes(key)}
                  onChange={() =>
                    void setSettings({
                      showSections: toggleArrayValue(settings.showSections, key),
                    })
                  }
                />
                {SECTION_LABELS[key]}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Menubar badge counts">
          <div className="flex flex-wrap gap-2">
            {SECTION_ORDER.map((key) => (
              <label key={key} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={settings.badgeSections.includes(key)}
                  onChange={() =>
                    void setSettings({
                      badgeSections: toggleArrayValue(settings.badgeSections, key),
                    })
                  }
                />
                {SECTION_LABELS[key]}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Recently-done window (days)">
          <input
            type="number"
            min={1}
            max={90}
            value={settings.recentlyDoneWindowDays}
            onChange={(e) =>
              void setSettings({
                recentlyDoneWindowDays: Math.max(1, Math.min(90, Number(e.target.value) || 7)),
              })
            }
            className={inputCls + ' w-20'}
          />
        </Field>
        <Field label="Mentioned window (days)">
          <input
            type="number"
            min={1}
            max={30}
            value={settings.mentionedWindowDays}
            onChange={(e) =>
              void setSettings({
                mentionedWindowDays: Math.max(1, Math.min(30, Number(e.target.value) || 7)),
              })
            }
            className={inputCls + ' w-20'}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={settings.launchAtLogin}
            onChange={(e) => {
              const enabled = e.target.checked;
              void setSettings({ launchAtLogin: enabled });
              void api.invoke('app:set-launch-at-login', { enabled });
            }}
          />
          Launch at login
        </label>
      </Group>

      <Group title="About">
        <p
          className="cursor-default select-none text-xs text-fg-muted"
          onClick={() => {
            const next = versionTaps + 1;
            setVersionTaps(next);
            if (next >= 7) {
              setDebugUnlocked(true);
              setVersionTaps(0);
            }
          }}
          title={
            debugUnlocked
              ? 'Debug unlocked. Click 7× more to hide.'
              : versionTaps > 0
                ? `${7 - versionTaps} more clicks to unlock debug`
                : 'goojira version'
          }
        >
          goojira v{version}
          {debugUnlocked && <span className="ml-2 text-accent-yellow">🐞 debug unlocked</span>}
        </p>
        <p className="text-xs text-fg-subtle">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              void api.invoke('app:open-external', {
                url: 'https://github.com/roeezolantz/goojira',
              });
            }}
            className="text-accent hover:underline"
          >
            View on GitHub
          </a>
        </p>
      </Group>

      {debugUnlocked && <DebugPanel />}
    </div>
  );
}

const inputCls =
  'rounded border border-border bg-bg-elevated px-2 py-1 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none';
const btnPrimary = 'rounded bg-accent px-3 py-1 text-xs text-white hover:bg-accent/90 disabled:opacity-50';
const btnSecondary =
  'rounded border border-border bg-bg-elevated px-3 py-1 text-xs text-fg hover:bg-bg-hover disabled:opacity-50';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
        {title}
      </h2>
      <div className="flex flex-col gap-3 rounded border border-border-subtle bg-bg-elevated/40 p-3">
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

