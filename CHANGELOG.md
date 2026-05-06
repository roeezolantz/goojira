# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-05-06

### Added

- **Machine-bound token encryption fallback.** When the OS keychain isn't accessible (typical on unsigned macOS builds where `safeStorage.isEncryptionAvailable()` returns false), goojira now falls back to AES-256-GCM with a key derived from a stable machine identifier (`IOPlatformUUID` on macOS, `/etc/machine-id` on Linux, `MachineGuid` on Windows) plus the app bundle path. Strictly stronger than plaintext (the file isn't grep-able), tied to the host machine, and free — no Apple Developer ID required to start using the app.
- Settings UI now shows which storage backend is active: *"stored in OS keychain"* (preferred) or *"stored (machine-bound encryption)"* with a short note explaining the trade-off.

### Fixed

- **Save-token errors no longer fail silently.** Previously, when `setApiToken` threw (e.g., because OS encryption was unavailable), the renderer swallowed the rejection and the UI looked idle while the file was never written. Now the Settings page surfaces a red error banner with the underlying message.

## [0.1.2] - 2026-05-06

### Fixed

- Detect when a stored API token can't be decrypted (commonly happens after upgrading an unsigned macOS build — each ad-hoc signature gets its own keychain key). Instead of the misleading *"Jira is not configured"* error, Settings now shows a clear yellow warning with a one-click *Clear & re-enter* button. The diagnostic bundle and Debug panel surface the token status and `safeStorage` encryption availability.

## [0.1.1] - 2026-05-06

### Added

- Connection diagnostics on the Settings *Test connection* button: HTTP status, attempted URL, human-readable hint mapping the failure to a likely cause (auth, permission, workspace not found, rate limit, DNS, TLS interception, etc.), pre-flight URL warnings, and the truncated response body.
- Debug panel **API call log** pane — a ring buffer of the last 100 Jira API calls with timestamps, endpoints, durations, HTTP status, and error messages.
- Debug panel **Copy diagnostic bundle** button — emits a markdown report (env, settings with token redacted and email masked, permissions, snapshot errors, recent API log) ready to paste into a GitHub issue.

### Documentation

- README install path via Homebrew tap (`brew install --cask roeezolantz/goojira/goojira`) plus the `xattr -cr` quarantine workaround for unsigned macOS builds.

## [0.1.0] - 2026-04-29

### Added

- Initial public release of goojira — a cross-platform menubar/tray companion for Jira.
- Four core sections: In Progress, To Do, Available to Take, Backlog.
- Bonus sections: Awaiting Review, Blocked, Recently Done, Mentioned.
- Sprint countdown badge with color-coded urgency.
- Native OS context menu for per-row actions (open, copy, take, comment, log work, transition).
- Quick-create dialog.
- Polling with configurable interval and tray badge count.
- Token storage via Electron `safeStorage` (OS keychain).
- Light / Dark / Auto theme.
- macOS Accessibility permission onboarding.
- Hidden debug panel (7-tap unlock).
- Auto-update from GitHub Releases.
- Vitest test suite covering JQL builders and the issue mapper.
