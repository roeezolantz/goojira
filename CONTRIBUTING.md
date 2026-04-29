# Contributing

Thanks for considering a contribution to goojira!

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
- Prefer `type` for unions/aliases, `interface` for object shapes.
- Avoid `any`; if you need it, leave a comment why.
- Keep components focused and small. Push state into the Zustand store rather than prop-drilling.

## Commits / PRs

- One concept per PR.
- A short PR description goes a long way.
- If your change touches Jira REST behavior, mention what you tested against (your Jira instance's projects/boards).

## Releasing (maintainers only)

1. Bump version in `package.json`.
2. Tag: `git tag v0.x.y && git push origin v0.x.y`.
3. CI (`.github/workflows/release.yml`) runs `electron-forge publish` per platform and creates a draft GitHub Release.
4. Edit the draft notes and publish.

## Code of conduct

Be kind. Assume good intent. Critique code, not people.
