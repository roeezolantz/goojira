import type { Config } from 'tailwindcss';

// Colors resolve to CSS variables so a `data-theme` flip on <html> swaps
// the whole palette. RGB triplets in styles.css; alpha is preserved via the
// `<alpha-value>` placeholder.
const cssVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}', './index.html'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: cssVar('--bg'),
          elevated: cssVar('--bg-elevated'),
          hover: cssVar('--bg-hover'),
        },
        border: {
          DEFAULT: cssVar('--border'),
          subtle: cssVar('--border-subtle'),
        },
        fg: {
          DEFAULT: cssVar('--fg'),
          muted: cssVar('--fg-muted'),
          subtle: cssVar('--fg-subtle'),
        },
        accent: {
          DEFAULT: cssVar('--accent'),
          green: cssVar('--accent-green'),
          red: cssVar('--accent-red'),
          yellow: cssVar('--accent-yellow'),
          purple: cssVar('--accent-purple'),
        },
      },
      fontSize: {
        xs: ['11px', '14px'],
        sm: ['12px', '16px'],
        base: ['13px', '18px'],
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
