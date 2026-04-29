# Assets

Place app icons here.

## Required

- `iconTemplate.png` — 16x16 PNG, black-on-transparent. Used for the macOS menubar tray.
  The `Template` suffix in the filename tells macOS to auto-invert it for light/dark menubars.
- `icon.png` — 512x512 (or larger) PNG. Used as the Linux app icon and source for builds.
- `icon.icns` — macOS app bundle icon (generated from `icon.png` with `iconutil`).
- `icon.ico` — Windows app icon (generated from `icon.png` with [png-to-ico](https://www.npmjs.com/package/png-to-ico) or similar).

`forge.config.ts` references `assets/icon` (no extension) for the packaged app icon — Electron Forge picks the right format per OS.

If `iconTemplate.png` is missing the app falls back to text `FJ` in the menubar — fully functional, just less pretty.
