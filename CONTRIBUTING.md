# Contributing

Thanks for considering a contribution to goojira!

## Reporting issues

Bug reports and feature requests live in [GitHub Issues](https://github.com/roeezolantz/goojira/issues). Templates guide you through what to include.

Security vulnerabilities — please email the maintainer directly per [SECURITY.md](./SECURITY.md), don't open a public issue.

## Dev loop

```bash
npm install
npm start            # launches Electron with vite HMR
npm run typecheck    # strict TypeScript across main/preload/renderer
npm run lint
npm run format
```

## Project layout

See the *Architecture* section in [README.md](./README.md) for a tour. Briefly:

- `src/main/` — Electron main process (Node).
- `src/preload/` — bridge that exposes a typed API on `window.api`.
- `src/renderer/` — React popover + settings UI.
- `src/shared/types.ts` — the IPC contract; if you add a channel, add it here first.

## Adding an IPC channel

1. Add it to `IpcContract` in `src/shared/types.ts`.
2. Implement the handler in `src/main/ipc.ts`.
3. Call it from the renderer via `api.invoke('your:channel', { … })`.

The contract is single-source-of-truth: forgetting either side is a type error.

## Adding a section

1. Add the new key to the `SectionKey` union in `shared/types.ts`.
2. Add a JQL builder in `main/jira/queries.ts`.
3. Include it in `fetchSnapshot()` in `main/jira/snapshot.ts`.
4. Add a label in `renderer/store.ts` (`SECTION_LABELS`, `SECTION_ORDER`).
5. Add it to `DEFAULT_SETTINGS.showSections` if it should appear by default.

## Style

- Two-space indent, single quotes, semis, trailing commas (Prettier handles this).
- Import order is enforced by Prettier — don't fight the formatter, run `npm run format`.
- Strict TypeScript is non-negotiable. `npm run typecheck` must pass; no `// @ts-ignore` without a comment explaining why.
- Prefer `type` for unions/aliases, `interface` for object shapes.
- Avoid `any`; if you need it, leave a comment why.
- Keep components focused and small. Push state into the Zustand store rather than prop-drilling.

## Testing

- `npm test` — runs the vitest suite. Currently covers the JQL builders in `src/main/jira/queries.ts` and the issue mapper (`mapIssue`) in `src/main/jira/snapshot.ts`. Other functions in `snapshot.ts` are IO-bound (Electron + jira.js) and aren't unit-tested.
- `npm run test:watch` — re-runs on change.
- New JQL builders or pure mapping helpers should land with a test. Fixture-driven; no Electron mocking required.

## Commits / PRs

- One concept per PR.
- A short PR description goes a long way.
- If your change touches Jira REST behavior, mention what you tested against (your Jira instance's projects/boards).

## Releasing (maintainers only)

1. Bump version in `package.json`.
2. Update `CHANGELOG.md`: move items under `## [Unreleased]` into a new `## [0.x.y] - YYYY-MM-DD` section, then reset the Unreleased block.
3. Tag: `git tag v0.x.y && git push origin v0.x.y`.
4. CI (`.github/workflows/release.yml`) runs `electron-forge publish` per platform and creates a draft GitHub Release.
5. Edit the draft notes and publish.

## Code of conduct

Be kind. Assume good intent. Critique code, not people.
