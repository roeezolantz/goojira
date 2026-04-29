# goojira

A lean, cross-platform menubar/tray companion for Jira — your active sprint at a glance.

Inspired by GitHub's tiny menubar app: dense rows, dark theme, click-to-open, no chrome you don't need.

> Status: early. macOS / Windows / Linux. MIT.

## Features

- **Four core sections** in a glance: In Progress, To Do, Available to Take, Backlog.
- **Sprint countdown** badge next to "In Progress" — *"Sprint 47 · 2 days left"* (yellow at ≤2 days, red on the last day).
- **Backlog grouped** assigned-to-me first, then unassigned.
- **Bonus sections**: Awaiting Review, Blocked, Recently Done, Mentioned (toggle in Settings).
- **Click any row → opens in your default browser.**
- **Right-click row** for: Copy key, Copy link, Take ticket (assign + transition), Comment, Log work, Transition status.
- **Quick create** ticket: project + type + summary, then opens it.
- **Filters**: free-text search, project chip.
- **Group by**: Section (default), Project, Priority, Type, Sprint.
- **Polling** (default 5 min) with "last updated · 2m ago" footer.
- **Menubar badge** count of sections you choose (default: To Do + Available to Take).
- **Multi-project, multi-board.**
- **Keyboard shortcuts**: `⌘R` refresh, `⌘F` filter, `⌘N` new, `⌘,` settings, `⌘1..⌘8` collapse/expand sections, `⌘⇧J` toggle popover from anywhere, `Esc` clear filter / hide.
- **Token stored in OS keychain** (Keychain on macOS, Credential Vault on Windows, libsecret on Linux) via Electron `safeStorage`.
- **Auto-update** from GitHub Releases (when packaged).

## Quick start (dev)

```bash
npm install
npm start
```

Then:

1. Click the tray icon (or `⌘⇧J`).
2. Click the gear → **Settings**.
3. Fill **Jira URL**, **Email**, **API token** ([generate one](https://id.atlassian.com/manage-profile/security/api-tokens)).
4. Click **Test connection**.
5. Click **Load projects & boards** and pick what you want to track.

That's it.

## Build / package

```bash
npm run package   # produces an unpacked app in out/
npm run make      # produces installers (.dmg / .exe / .deb / .rpm / .zip) for the host platform
```

## Release (maintainers)

`npm run publish` — runs `electron-forge publish` which uploads installers to a draft GitHub Release. Requires a `GITHUB_TOKEN` env var with `repo` scope. CI does this on tag push (see `.github/workflows/release.yml`).

## Tray icon

A 16x16 black-on-transparent PNG is expected at `assets/iconTemplate.png` (the `Template` suffix tells macOS to auto-invert it for light/dark menubars). If missing, the app falls back to a text label `GJ` in the menubar — fully functional but ugly. Drop in your own icon and rebuild.

## Architecture

```
src/
├── main/                 Electron main process
│   ├── index.ts          App lifecycle, single-instance lock, polling, badge
│   ├── windows.ts        Tray + popover positioning + settings window
│   ├── ipc.ts            Typed IPC handlers (one router for the whole API)
│   ├── store/
│   │   ├── settings.ts   JSON file in userData
│   │   └── secrets.ts    safeStorage-encrypted token
│   └── jira/
│       ├── client.ts     jira.js Version3 + Agile clients (cached)
│       ├── queries.ts    JQL builders for each section
│       ├── snapshot.ts   Section + sprint orchestration
│       └── poller.ts     Interval-based refresh + listeners
├── preload/index.ts      contextBridge → window.api with typed invoke + on
├── renderer/             React app (popover and settings share one HTML)
└── shared/types.ts       IPC contract — single source of truth between processes
```

The IPC layer uses a typed contract (`IpcContract` in `shared/types.ts`). Every channel name maps to its request/response types; the preload's `api.invoke` and main's handlers share that type so renaming a channel is a TypeScript error in both processes.

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md). Lint with `npm run lint`, format with `npm run format`, typecheck with `npm run typecheck`.

## License

MIT — see [LICENSE](./LICENSE).
