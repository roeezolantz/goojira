import { useEffect } from 'react';
import { useStore } from '../store';

/**
 * Applies the user's theme preference to the <html> element by setting
 * `data-theme="dark|light|auto"`. When `auto`, the CSS in styles.css
 * delegates to `prefers-color-scheme` — listened to here so we re-render
 * (purely cosmetic; the CSS already reacts on its own).
 */
export function ThemeApplier() {
  const settings = useStore((s) => s.settings);
  const theme = settings?.theme ?? 'auto';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // No render — this is a side-effect-only component.
  return null;
}
