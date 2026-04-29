# goojira

[![CI](https://github.com/roeezolantz/goojira/actions/workflows/ci.yml/badge.svg)](https://github.com/roeezolantz/goojira/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/roeezolantz/goojira)](./LICENSE)
[![Latest release](https://img.shields.io/github/v/release/roeezolantz/goojira?include_prereleases&sort=semver)](https://github.com/roeezolantz/goojira/releases)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

A lean, cross-platform menubar/tray companion for Jira — your active sprint at a glance.

Inspired by GitHub's tiny menubar app: dense rows, dark theme, click-to-open, no chrome you don't need.

> Status: early. macOS / Windows / Linux. MIT.

## Screenshots

<img width="382" height="603" alt="image" src="https://github.com/user-attachments/assets/a3248fdc-4130-45a5-a3dc-d35693ee6f20" />

<img width="530" height="615" alt="image" src="https://github.com/user-attachments/assets/6a68a06c-18a8-4618-8a8f-1c6437719091" />

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

Requires **Jira Cloud** (Atlassian-hosted). Server / Data Center isn't supported yet.

```bash
npm install
npm start
```

Then:

1. Click the tray icon (or `⌘⇧J`).
2. Click the gear → **Settings**.
3. Fill **Jira URL**, **Email**, **API token** ([Generate an API token →](https://id.atlassian.com/manage-profile/security/api-tokens)).
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

## Troubleshooting

### Tray icon shows `GJ` text instead of an image

Dev fallback when `assets/iconTemplate.png` is missing or invalid. Drop in a real 16x16 black-on-transparent PNG (see `assets/README.md`) and rebuild — that resolves it.

### Global shortcut `⌘⇧J` doesn't open the popover (macOS)

macOS Accessibility permission is required for global shortcut registration. The Settings window has a guided card that walks through the 5-step grant flow and re-checks live (no restart).

### Sprint countdown / story points missing

Most Jira Cloud instances use `customfield_10020` (sprint) and `customfield_10016` (story points), but custom-configured instances vary. These IDs are currently hardcoded; a configurable override is on the roadmap (see `PRODUCT.md`).

### "Unidentified developer" warning on macOS / SmartScreen on Windows

Pre-1.0 builds aren't code-signed yet. On macOS: right-click the app → **Open**. On Windows: **More info → Run anyway**. Code signing is on the roadmap.

### `npm install` warns about platform-specific maker dependencies

`forge.config.ts` lists DMG / Squirrel / Deb / RPM makers unconditionally, so install on a non-host platform may warn about deps it can't use. Safe to ignore — CI builds on a per-OS matrix.

## FAQ

**Cloud only?** Yes for now — uses Atlassian's Cloud REST APIs (Version 3 + Agile). Server / Data Center support isn't implemented; PRs welcome.

**Why API token instead of OAuth?** Lower friction for a personal/OSS tool. The token lives in your OS keychain (via Electron `safeStorage`); generate or revoke at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

**Does it modify my Jira data?** Only on explicit user actions: take ticket (assign), comment, log work, transition status, quick-create. Read-only by default.

**Where does my token live?** Encrypted via Electron `safeStorage` in your user-data directory. Backed by macOS Keychain / Windows Credential Vault / libsecret on Linux.

**How do I check what's being polled?** Click the version label in Settings 7 times to unlock the Debug panel — it shows the exact JQL strings going to Jira.

## Status / Roadmap

Pre-1.0 and actively shaped by use. Bugs and feature requests live in [GitHub Issues](https://github.com/roeezolantz/goojira/issues). Planned work for the road to 1.0: code signing (mac + win), notarization, configurable Jira custom-field IDs, a designed icon set, and broader test coverage.

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md). Lint with `npm run lint`, format with `npm run format`, typecheck with `npm run typecheck`.

## License

MIT — see [LICENSE](./LICENSE).
