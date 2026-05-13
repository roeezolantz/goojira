import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shell } from 'electron';
import { safeOpenExternal } from './shell-util';

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('safeOpenExternal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows https: URLs', async () => {
    await safeOpenExternal('https://example.com');
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('allows http: URLs', async () => {
    await safeOpenExternal('http://example.com');
    expect(shell.openExternal).toHaveBeenCalledWith('http://example.com');
  });

  if (process.platform === 'darwin') {
    it('allows x-apple.systempreferences: URLs on macOS', async () => {
      const url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';
      await safeOpenExternal(url);
      expect(shell.openExternal).toHaveBeenCalledWith(url);
    });
  }

  it('blocks file: URLs', async () => {
    await safeOpenExternal('file:///etc/passwd');
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it('blocks javascript: URLs', async () => {
    await safeOpenExternal('javascript:alert(1)');
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it('blocks data: URLs', async () => {
    await safeOpenExternal('data:text/html,<html></html>');
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it('handles invalid URLs gracefully', async () => {
    await safeOpenExternal('not-a-url');
    expect(shell.openExternal).not.toHaveBeenCalled();
  });
});
