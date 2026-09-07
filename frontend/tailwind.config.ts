import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        coal: {
          50: '#F5F7F8',
          100: '#E6E9EC',
          700: '#33404B',
          800: '#27313A', // Graphite Slate
          900: '#171A1F', // Coal Black
          950: '#0F1216',
          DEFAULT: '#171A1F',
        },
        ash: {
          DEFAULT: '#F5F7F8',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#27313A',
        },
        steel: {
          DEFAULT: '#CBD3D8',
          100: '#F5F7F8',
          200: '#E2E8F0',
          300: '#CBD3D8',
          400: '#94A3B8',
          500: '#64748B',
        },
        amber: {
          DEFAULT: '#F2A900',
          400: '#FFC233',
          500: '#F2A900', // Signal Amber
          600: '#D97706',
          700: '#B45309',
        },
        gold: {
          400: '#F2A900',
          500: '#F2A900',
          600: '#D97706',
          700: '#B45309',
        },
        teal: {
          DEFAULT: '#008C95',
          50: '#E6F4F5',
          100: '#CCE9EB',
          400: '#00A8B5',
          500: '#008C95', // Electric Teal
          600: '#007077',
          700: '#00555A',
        },
        brand: {
          50: '#E6F4F5',
          100: '#CCE9EB',
          500: '#008C95',
          600: '#007077',
          700: '#00555A',
          900: '#171A1F',
        },
        green: {
          DEFAULT: '#2E7D5B',
          500: '#2E7D5B', // Mine Green
          600: '#246548',
        },
        warning: {
          DEFAULT: '#D97706',
          500: '#D97706', // Caution Orange
        },
        danger: {
          DEFAULT: '#C2413B',
          500: '#C2413B', // Alert Red
        },
        ink: {
          DEFAULT: '#20262B', // Primary text
          primary: '#20262B',
          muted: '#5E6B73',
        },
        slateText: {
          DEFAULT: '#5E6B73', // Secondary / muted text
        },
        navy: {
          800: '#33404B',
          900: '#27313A', // Graphite Slate
          950: '#171A1F', // Coal Black
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-amber': '0 0 20px -5px rgba(242, 169, 0, 0.35)',
        'glow-gold': '0 0 20px -5px rgba(242, 169, 0, 0.35)',
        'glow-teal': '0 0 20px -5px rgba(0, 140, 149, 0.35)',
        'glow-red': '0 0 20px -5px rgba(194, 65, 59, 0.35)',
        'glow-emerald': '0 0 20px -5px rgba(46, 125, 91, 0.35)',
        'card-light': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-dark': '0 4px 20px -2px rgba(23, 26, 31, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
