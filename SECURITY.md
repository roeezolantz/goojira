# Security Policy

## Supported versions

Pre-1.0. Only the latest release receives security fixes. Once 1.0 ships, this section will list the supported version range.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Email **zolantz.roee@gmail.com** with:

- A description of the issue and its impact
- Steps to reproduce (a minimal repro is ideal)
- The goojira version and your OS
- Any suggested mitigation

You'll get an acknowledgement within 72 hours. Fix timelines are best-effort — this is a solo-maintainer project.

## Scope

In scope:

- The goojira app itself: main process, preload, renderer, IPC contract
- Token storage (Electron `safeStorage`)
- Auto-update flow (signed releases via GitHub Releases)
- Build / release pipeline (`forge.config.ts`, GitHub Actions workflows)

Out of scope:

- Vulnerabilities in upstream dependencies (report those to the upstream — we'll bump the dep when a fix lands)
- Issues in Atlassian Jira itself or the `jira.js` SDK
- Self-hosted Jira Server / Data Center compatibility (not currently supported)
