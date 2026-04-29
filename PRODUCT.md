# goojira — Product Summary

> A handoff doc for the next session. Read this first if you're picking up
> the project. Pairs with `README.md` (user-facing) and `CONTRIBUTING.md`
> (contributor flow). This file is **internal context** — what the product
> is, why it's built the way it is, and what's left to ship.

---

## In one sentence

**goojira** is a lean, cross-platform menubar / tray companion for Jira that
shows you your active sprint at a glance — built like the GitHub menubar app:
dense rows, dark+light theme, click-to-open, no chrome you don't need.

---

## Why this exists

The Jira web UI is heavy and slow — opening a tab, navigating to a board, and
filtering takes 10+ seconds when all you want is a 5-second answer to "what's
on my plate right now." A menubar app with a small popover hits that need:
glance, click, gone.

The reference UX was the GitHub macOS menubar app the user screenshotted in
the kickoff. We hit the same shape: tray icon → small popover → grouped
sections of items → click opens in browser.

---

## Feature inventory

The 4 core sections (per the original spec):

1. **In Progress** — assigned to me, status category "In Progress", in active sprint. Shows a sprint-countdown badge: *"Sprint 47 · 2 days left"*, color-coded (red on last day, yellow ≤2 days).
2. **To Do** — assigned to me, status "To Do", in active sprint.
3. **Available to Take** — unassigned, in active sprint. Right-click → "Take this ticket" assigns it to you in one move.
4. **Backlog** — assigned-to-me OR unassigned, no sprint, not done, not Epic. Sub-grouped: assigned-to-me first, then unassigned.

Bonus sections (toggle in Settings → Display → "Sections to show"):

5. **Awaiting Review** — tickets I reported, currently in review/QA status, assigned to someone else.
6. **Blocked** — assigned to me, with `blocked` label or "Blocked" status.
7. **Recently Done** — closed by me in the last N days (default 7).
8. **Mentioned** — comments mentioning me, or where I'm a watcher (last N days).

### Filters (volatile, reset on app restart)

- **Free-text search** (key, summary, project key, assignee name)
- **Project** dropdown (only shows projects you've selected to track)
- **Status** dropdown (populated from distinct statuses in the live snapshot)
- **Assignee** dropdown: `Anyone` / `Me` / `Unassigned` / divider / each specific person seen in data
- **Sprint**: `Any sprint` / `Current sprint` / `Backlog`
- One-click `clear` button when any filter is active

### Grouping (persisted in settings)

- Section *(default)* — natural section semantics
- Project — flatten and re-group by project
- Priority — Highest → Lowest
- Type — Story/Bug/Task/Epic
- Sprint — re-group by active sprint name

### Per-row actions (native macOS context menu via `Menu.popup`)

- Open in browser
- Copy key (PROJ-123) / Copy link
- Take this ticket (only if unassigned)
- Add comment… (opens in-popover dialog)
- Log work… (opens in-popover dialog)
- Transition to → submenu of available transitions, fetched live per issue

### App-level

- **Polling** (default 5 min, configurable 1–120) with "last updated · 2m ago" footer
- **Menubar badge** count of user-chosen sections (default: To Do + Available to Take)
- **Multi-project, multi-board** (boards drive active-sprint detection)
- **Pin mode**: toggle the popover from auto-anchored-to-tray (hides on blur) to free-floating (centered/draggable, doesn't hide). Position persists.
- **Light / Dark / Auto theme** with smooth 180ms cross-fade. CSS-variable palette so a single `data-theme` flip swaps everything.
- **Quick create**: project + type + summary, then opens the new issue in the browser
- **Token in OS keychain** via Electron's `safeStorage` API
- **Auto-update** (when packaged) from GitHub Releases via `update-electron-app`

### Keyboard shortcuts

- `⌘⇧J` — toggle popover from anywhere (global)
- `⌘R` refresh · `⌘F` focus filter · `⌘N` quick-create · `⌘,` settings
- `⌘1..⌘8` collapse/expand each section
- `Esc` — clears the filter, or hides the popover

### Permissions onboarding

A **Permissions Card** at the top of Settings detects the macOS Accessibility
state, surfaces the binary path, and gives the user a 5-step guided flow:

1. **Reveal Electron binary in Finder** — opens Finder with `Electron.app` highlighted
2. **Open Privacy Settings** — deep-links to System Settings → Privacy & Security → Accessibility
3. Drag the highlighted `.app` into the list
4. Toggle the new Electron entry on
5. **Re-check** button — verifies status + re-registers the global shortcut, no app restart needed

Card auto-hides when permission is granted.

### Hidden Debug panel

Click `goojira v0.1.0` in the About section **7 times** to unlock. Reveals:

- Environment dump (Electron/Chrome/Node/platform/paths/permissions all in one)
- Effective settings JSON (copyable)
- Live JQL queries — the exact 8 strings being sent to Jira, with per-query copy buttons (paste into Jira's advanced search to debug)
- Last snapshot (counts per section, errors, raw JSON)
- Buttons: `Refresh info` · `Fetch snapshot now` · `Open user-data folder` · `Open DevTools` · `Reset settings` (factory wipe with confirm)

---

## Architecture

```
src/
├── main/                         Electron main process (Node)
│   ├── index.ts                  app lifecycle, single-instance lock, badge,
│   │                              global shortcut registration
│   ├── windows.ts                tray + popover positioning + settings window
│   │                              + pin/menubar mode logic
│   ├── ipc.ts                    typed router for ALL channels (one file)
│   ├── store/
│   │   ├── settings.ts           JSON file in app.getPath('userData')
│   │   └── secrets.ts            safeStorage-encrypted token (token.bin)
│   └── jira/
│       ├── client.ts             jira.js Version3Client + AgileClient (cached)
│       ├── queries.ts            JQL builders for each section
│       ├── snapshot.ts           orchestrates 8 section fetches + sprint info
│       │                          + project/board listing + transitions
│       │                          + create/comment/log-work/assign
│       └── poller.ts             interval-based refresh + listener registry
├── preload/index.ts              contextBridge → window.api with typed
│                                  invoke + on (one bridge for both windows)
├── renderer/                     React app (popover and settings share index.html)
│   ├── App.tsx                   popover root
│   ├── SettingsApp.tsx           settings root
│   ├── main.tsx                  picks App vs SettingsApp from window.api.windowKind
│   ├── store.ts                  Zustand store (snapshot, settings, filters,
│   │                              dialogs, ContextMenu state)
│   └── components/
│       ├── TitleBar.tsx          drag-region strip + pin/close (popover only)
│       ├── FilterBar.tsx         search + 4 dropdowns
│       ├── Section.tsx           collapsible header + issue list
│       ├── IssueRow.tsx          single ticket row, click + right-click handlers
│       ├── IssueIcon.tsx         issue-type lucide icons
│       ├── StatusIcon.tsx        status-category lucide icons
│       ├── SprintBadge.tsx       countdown next to "In Progress" header
│       ├── GroupBySelect.tsx     small "group by" select
│       ├── Footer.tsx            status, errors, refresh, pin, settings, quit
│       ├── EmptyState.tsx        first-run prompt with sparkles glyph
│       ├── PermissionsCard.tsx   macOS Accessibility onboarding
│       ├── DebugPanel.tsx        unlocked via 7x version-tap
│       ├── ThemeApplier.tsx      sets data-theme on <html>
│       ├── QuickCreateDialog.tsx
│       ├── CommentDialog.tsx
│       └── LogWorkDialog.tsx
└── shared/types.ts               IPC contract — single source of truth
                                   between main + preload + renderer
```

### Cross-cutting design decisions worth knowing

- **One IPC contract** (`shared/types.ts`'s `IpcContract` interface) — every channel name maps to its `req`/`res` types. `api.invoke<C>(...)` and `ipcMain.handle(...)` are both type-checked against this. Renaming a channel is a TS error in both processes. There are 30+ channels.
- **Native OS context menu** for right-click — built with `Menu.buildFromTemplate` + `popup()` so it can extend beyond the popover bounds (we replaced an earlier React-rendered version that was getting clipped).
- **Theme as CSS variables** — Tailwind colors resolve to `rgb(var(--bg) / <alpha-value>)` etc. Switching `<html data-theme="…">` swaps the whole palette in 180ms. No `dark:` prefixes needed in components.
- **Two BrowserWindows, one HTML** — popover and settings both load `index.html`; the preload sets `api.windowKind` from a `--window-kind=…` arg passed by main. `main.tsx` renders `<App />` or `<SettingsApp />` accordingly.
- **Permissions card has live re-check** — granting Accessibility doesn't require restart; the card calls `globalShortcut.register` again on Re-check, which succeeds the moment the OS permission flips.
- **Snapshot-derived project list** as a fallback — if `searchProjects` API returns empty (permission scope quirks), we backfill the project list from issues already visible in the snapshot.
- **Pin mode** persists position to settings; the popover window has `movable: true` and the `TitleBar` strip is the `-webkit-app-region: drag` zone.
- **No native modules** — used `safeStorage` instead of `keytar`, JSON instead of `better-sqlite3`. Means `npm install` doesn't need a C++ toolchain.
- **safeStorage encryption** — token.bin sits in userData; macOS Keychain / Win Credential Vault / Linux libsecret protects it.

---

## Tech stack

| Concern | Pick |
|---|---|
| Runtime | Electron 32 (Node 20) |
| Build / packaging | Electron Forge 7 with Vite plugin |
| Frontend framework | React 18 + TypeScript 5.5 |
| Renderer state | Zustand 5 |
| Styling | Tailwind 3 + CSS variables for theming |
| Icons | lucide-react |
| Jira client | jira.js v4 (Version3Client + AgileClient) |
| Token storage | Electron `safeStorage` (no keytar dep) |
| Auto-update | `update-electron-app` (GitHub Releases) |
| Renderer build | Vite 5 |
| Lint / format | ESLint 8 + Prettier 3 (with `prettier-plugin-tailwindcss`) |
| CI | GitHub Actions matrix (mac/win/linux) — typecheck + lint + package |
| Distribution | DMG (mac), Squirrel (win), DEB/RPM (linux), ZIP fallback |

---

## Files outside `src/` worth knowing

- `forge.config.ts` — packagerConfig (`appBundleId: dev.roeezolantz.goojira`), all makers, `PublisherGithub` to `roeezolantz/goojira`, the `FusesPlugin` security flips
- `vite.{main,preload,renderer}.config.ts` — three Vite configs; main and preload pin explicit `entryFileNames` because they shared `src/*/index.ts` and were colliding earlier
- `tailwind.config.ts` — the CSS-variable-backed palette
- `index.html` — at root (Vite expects it there); CSP loosened for HMR
- `assets/iconTemplate.png` — 18x18 J-shape, generated programmatically by a Node+zlib script (no design tooling required); `assets/README.md` explains the icon convention
- `.github/workflows/ci.yml` — typecheck + lint + package on push/PR
- `.github/workflows/release.yml` — runs `electron-forge publish` on `v*` tags

---

## Current state

### Works (verified by user during build)

- Tray icon appears in macOS menubar (with `GJ` text fallback when icon image is small/dim)
- Popover opens via tray click and via `⌘⇧J` (after Accessibility grant)
- Settings window opens automatically on first launch (no token configured)
- Permissions card guides Accessibility grant, re-check picks up the change live
- Token saves to safeStorage, "Test connection" verifies, snapshot fetches all 8 sections
- Filters: text + project + status + assignee + sprint all combine via AND
- Right-click → native menu with Open/Copy/Take/Comment/Log/Transitions; doesn't get clipped now
- Pin mode: window becomes draggable, stays open, persists position; toggle in TitleBar or Footer
- Theme: Auto/Light/Dark all swap correctly; smooth transitions; settings window doesn't flash dark on light-mode users
- Hidden debug panel unlocks after 7 version-clicks; all panes work (env / settings / JQL / snapshot)
- Auto-poll every N min; manual refresh; "last updated · 2m ago" footer
- Renamed from working title `fun-jira` → `goojira`. All references updated. App bundleId is `dev.roeezolantz.goojira` (personal namespace, no company branding).

### Known gaps and quirks

- **Story points custom field** is hardcoded to `customfield_10016` — common Jira Cloud default, but instances can vary. Unset in non-default instances → missing badge. Would need an instance-introspection step.
- **Sprint custom field** assumed `customfield_10020` (Cloud default). Same caveat.
- **Tray icon is a small, programmatically-drawn J** — fine for development, but for OSS release you'd want a real designer-made icon (`.icns`, `.ico`, multi-size PNG). The README documents what to drop in `assets/`.
- **Test coverage is narrow** — vitest covers the JQL builders in `queries.ts` and the issue mapper (`mapIssue`) in `snapshot.ts`. Other paths (IO orchestration in `snapshot.ts`, the IPC layer, the renderer) are untested. The IPC contract is the next thing worth covering.
- **Atlassian deprecated `/rest/api/3/search`** in 2024 (returned 410). We use the new `searchForIssuesUsingJqlEnhancedSearch`. Worth keeping an eye on jira.js changelog for further deprecations.
- **macOS Accessibility permission** gates the global shortcut. In dev mode it's granted to the bundled `Electron.app` (shared with VSCode/Cursor/Slack/etc.). In a packaged release it's granted to `goojira.app` specifically — separate entry. Dev grants don't carry over.
- **`forge.config.ts`** declares `MakerDMG`/`MakerSquirrel`/etc. unconditionally; `npm install` on non-host platforms may warn about platform-specific maker deps. CI matrix handles this fine; local dev on a non-darwin box is the case to test.
- **First-run UX**: opens the Settings window automatically when no token exists. Good for onboarding; once token is saved, normal popover behavior takes over.

---

## What "OSS-ready" still needs

Punch-list, roughly priority order. Items struck through were resolved in the OSS-readiness pass.

### High-leverage polish

1. **Real app icon set** — `.icns` (mac), `.ico` (win), `iconTemplate.png` + `iconTemplate@2x.png` (mac tray), 512x512 source PNG. Ideally a wordmark/G-shape that scales.
2. ~~**README rewrite**~~ — done. Badges, screenshots placeholder, troubleshooting, FAQ, status/roadmap added.
3. ~~**Dead-code cleanup**~~ — done. `contextMenu` state and related actions removed from `renderer/store.ts`.
4. **Custom-field configuration UI** — let users override `customfield_10016` / `customfield_10020` in Settings → Display, with a dropdown of all available customfields fetched from `/rest/api/3/field`.
5. ~~**Unit tests**~~ — done. Vitest covers all 8 JQL builders and `mapIssue`. Wider IPC/renderer coverage is still open.

### Distribution

6. **Code signing** for macOS — without it, users get the "unidentified developer" Gatekeeper warning. Requires Apple Developer ID ($99/yr). DMG signing config goes in `forge.config.ts`.
7. **Notarization** — Apple's automated malware scan, required for distribution outside the App Store. Stapled into the DMG.
8. **Windows code signing** — EV cert ideal but expensive; standard cert works with SmartScreen flag for a while.
9. **First release** — pick `v0.1.0`, tag, push, watch the GitHub Actions release workflow build for all 3 platforms.

### Nice-to-have features

10. **Per-project custom queries** — let users write their own JQL for an extra section (e.g. "My PR reviews", "Team sprint progress").
11. **Position memory in menubar mode too** — currently only pinned mode persists position. Probably correct as-is, but worth double-checking.
12. **Search across all projects, not just selected** — option in Settings.
13. **Burndown / velocity widget** in the popover header — small chart.
14. **Drag rows to reorder priority** in current sprint (calls Jira rank API).
15. **Keyboard navigation in the popover** — arrow keys to move through issues, Enter to open. Currently only Tab works.
16. **Notifications** — user explicitly opted out in v1, but worth a Settings toggle for: assigned-to-me, @mention, status change on my in-progress ticket.

### Project hygiene

17. ~~**CONTRIBUTING.md**~~ — Reporting, Testing, expanded Style and Releasing sections added.
18. ~~**CODE_OF_CONDUCT.md**~~ — done (Contributor Covenant 2.1, link-based).
19. ~~**GitHub issue templates**~~ — done (YAML form templates for bug + feature, plus PR template).
20. **Demo screenshots / GIF** for the README — placeholders in `docs/screenshots/` exist; real images still pending.
21. **Logo and brand colors** — the GitHub-flavored palette is a placeholder. Picking a primary brand color would give the app character.

### Added in the OSS-readiness pass

- `SECURITY.md`, `CHANGELOG.md`, `.nvmrc`, `.github/dependabot.yml`, `.github/PULL_REQUEST_TEMPLATE.md`
- `package.json` metadata: `engines.node`, `homepage`, `bugs`, `keywords`
- README badges (CI, license, latest release, platform)
- Vitest test step in `.github/workflows/ci.yml`

---

## Glossary (for someone landing here cold)

- **Active sprint** — Jira's term for "currently running scrum sprint." A board has 0 or 1. The sprint countdown reads `endDate` off this.
- **Status category** — Jira's normalized 3-bucket grouping: `todo` / `indeterminate` (in-progress) / `done`. Our `StatusIcon` + queries use this; raw status names vary per-project (some teams have "Code Review", others "QA", etc.).
- **Account ID** — opaque user identifier in Jira Cloud (replaces username). The "Me" filter compares against `snapshot.user.accountId`.
- **API token** — generated at `id.atlassian.com/manage-profile/security/api-tokens`. Used with email for HTTP Basic auth. Different from OAuth (which we explicitly didn't implement — too much friction for a personal/OSS tool).
- **ADF** (Atlassian Document Format) — the JSON shape Jira Cloud expects for comment/worklog bodies. We wrap plain text in a minimal ADF doc node.
- **Bounded query** — Atlassian's term in the new search API: a JQL with at least one filter clause (not just `order by`). Required by the new endpoint. All our queries are bounded.
- **`customfield_NNNNN`** — Jira's identifier for non-standard fields like story points and sprint. The numbers are instance-specific. We assume Cloud defaults; configurable override is in the OSS-ready punch list.
- **Pinned mode** — our term for the alternate popover behavior: stays open, draggable, doesn't auto-hide. The default is "menubar mode" (tray-anchored, hides on blur).

---

*Last updated: this snapshot covers the project as of the build-out session
that ended after the project-listing fallback was added. The next session
should be able to pick up directly from the OSS-ready punch list above.*
