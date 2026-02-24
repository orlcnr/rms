import type { Config } from 'tailwindcss';
const defaultTheme = require('tailwindcss/defaultTheme');

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '400px',
        ...defaultTheme.screens,
      },
      colors: {
        bg: {
          app: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          muted: 'var(--bg-muted)',
          hover: 'var(--bg-hover)',
        },

        primary: {
          main: 'var(--primary-main)',
          hover: 'var(--primary-hover)',
          subtle: 'var(--primary-subtle)',
        },

        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },

        border: {
          light: 'var(--border-light)',
          medium: 'var(--border-medium)',
        },

        success: {
          main: 'var(--success-main)',
          bg: 'var(--success-bg)',
          border: 'var(--success-border)',
          text: 'var(--success-text)',
        },

        danger: {
          main: 'var(--danger-main)',
          bg: 'var(--danger-bg)',
          border: 'var(--danger-border)',
          text: 'var(--danger-text)',
        },

        warning: {
          main: 'var(--warning-main)',
          bg: 'var(--warning-bg)',
          border: 'var(--warning-border)',
          text: 'var(--warning-text)',
        },

        info: {
          main: 'var(--info-main)',
          bg: 'var(--info-bg)',
          border: 'var(--info-border)',
          text: 'var(--info-text)',
        },
      },
      fontFamily: {
        display: ['Public Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '8px',
        xl: '12px',
        full: '9999px',
        sm: '2px',
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
