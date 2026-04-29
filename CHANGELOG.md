# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
