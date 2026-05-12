## 2025-01-24 - URL Protocol Validation for `shell.openExternal`
**Vulnerability:** Electron's `shell.openExternal` can be used to execute local files or scripts if passed a `file:` or `javascript:` URL.
**Learning:** Even in applications with restricted inputs, validating external URL protocols at the IPC boundary is a critical defense-in-depth measure.
**Prevention:** Always use a wrapper like `safeOpenExternal` that allowlists protocols (`https:`, `http:`) before opening URLs in the default browser.
