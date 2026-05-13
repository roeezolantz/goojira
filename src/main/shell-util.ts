import { shell } from 'electron';

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);

if (process.platform === 'darwin') {
  ALLOWED_PROTOCOLS.add('x-apple.systempreferences:');
}

/**
 * Validates a URL protocol before opening it with shell.openExternal.
 * This prevents opening potentially dangerous protocols like file: or javascript:.
 */
export async function safeOpenExternal(url: string): Promise<void> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      console.warn(`[goojira] Blocked attempt to open external URL with disallowed protocol: ${parsed.protocol}`);
      return;
    }
    await shell.openExternal(url);
  } catch (e) {
    console.error(`[goojira] Failed to open external URL: ${url}`, e);
  }
}
