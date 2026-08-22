import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          raised: 'var(--bg-surface-raised)',
          active: 'var(--bg-surface-active)',
          border: 'var(--border-subtle)',
          'border-hi': 'var(--border-highlight)',
          text: 'var(--text-main)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
          accent: 'var(--accent)',
          highlight: 'var(--stat-highlight)',
          card: 'var(--card-bg)',
          'card-border': 'var(--card-border)',
          input: 'var(--input-bg)',
          'input-border': 'var(--input-border)',
          'btn-primary': 'var(--btn-primary-bg)',
          'btn-primary-text': 'var(--btn-primary-text)',
          'btn-primary-hover': 'var(--btn-primary-hover)',
        },
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
      boxShadow: {
        'theme-glow': 'var(--accent-glow)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        cursor: 'blink 1s step-start infinite',
      },
    },
  },
  plugins: [],
};
export default config;
