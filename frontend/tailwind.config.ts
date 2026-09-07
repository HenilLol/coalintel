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
        // CoalIntel Dark Theme Core Palette
        deepMine: '#0B1117',
        coalNavy: '#111B24',
        graphite: '#17232D',
        steelSlate: '#20313D',
        darkSteel: '#2C3D49',
        frost: '#F1F5F7',
        ashGray: '#9EADB7',

        // Structure & Surfaces
        coal: {
          50: '#F1F5F7',
          100: '#9EADB7',
          700: '#2C3D49', // Dark Steel (Borders)
          800: '#20313D', // Steel Slate (Elevated surface)
          850: '#17232D', // Graphite (Cards)
          900: '#111B24', // Coal Navy (Navigation)
          950: '#0B1117', // Deep Mine (Main background)
          DEFAULT: '#0B1117',
        },
        ash: {
          DEFAULT: '#0B1117', // Main background alias
          50: '#111B24',
          100: '#17232D',
          200: '#20313D',
          300: '#2C3D49',
        },
        surface: {
          DEFAULT: '#17232D', // Graphite
          dark: '#111B24',    // Coal Navy
          elevated: '#20313D', // Steel Slate
        },
        steel: {
          DEFAULT: '#2C3D49', // Dark Steel
          100: '#111B24',
          200: '#17232D',
          300: '#20313D',
          400: '#2C3D49',
          500: '#9EADB7',
        },

        // Brand Accents
        teal: {
          DEFAULT: '#18B6B2', // Intelligence Teal
          50: '#E6F9F9',
          100: '#C2F3F2',
          200: '#8CEAE7',
          300: '#35D3CE',     // Bright Teal (Hover/Active)
          400: '#22C4C0',
          500: '#18B6B2',     // Main Accent
          600: '#123C43',     // Active navigation background
          700: '#0D2D32',
          800: '#0A2226',
          900: '#07181A',
        },
        brand: {
          50: '#E6F9F9',
          100: '#C2F3F2',
          300: '#35D3CE',
          500: '#18B6B2',
          600: '#123C43',
          900: '#111B24',
        },
        amber: {
          DEFAULT: '#F2A900', // Ember Amber
          300: '#FFC83B',
          400: '#FFBA1A',
          500: '#F2A900',
          600: '#D97706',
          700: '#92400E',
          900: '#3A2C0A',     // KPI highlight background
        },
        gold: {
          400: '#FFC83B',
          500: '#F2A900',
          600: '#D97706',
          900: '#3A2C0A',
        },

        // Status Colors
        green: {
          DEFAULT: '#39B978', // Mine Green
          400: '#52C78D',
          500: '#39B978',
          600: '#2E9762',
          900: '#0D331E',
        },
        warning: {
          DEFAULT: '#F08A24', // Caution Orange
          400: '#F5A14B',
          500: '#F08A24',
          600: '#D47112',
          900: '#421E03',
        },
        danger: {
          DEFAULT: '#F05B5B', // Signal Red
          400: '#F57878',
          500: '#F05B5B',
          600: '#D43D3D',
          900: '#421010',
        },

        // Typography
        ink: {
          DEFAULT: '#F1F5F7', // Frost White
          primary: '#F1F5F7',
          muted: '#9EADB7',   // Ash Gray
        },
        slateText: {
          DEFAULT: '#9EADB7', // Ash Gray
        },
        navy: {
          800: '#20313D',
          900: '#17232D',
          950: '#111B24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-amber': '0 0 20px -5px rgba(242, 169, 0, 0.35)',
        'glow-gold': '0 0 20px -5px rgba(242, 169, 0, 0.35)',
        'glow-teal': '0 0 20px -5px rgba(24, 182, 178, 0.35)',
        'glow-red': '0 0 20px -5px rgba(240, 91, 91, 0.35)',
        'glow-emerald': '0 0 20px -5px rgba(57, 185, 120, 0.35)',
        'card-light': '0 4px 20px -2px rgba(11, 17, 23, 0.5)',
        'card-dark': '0 4px 20px -2px rgba(11, 17, 23, 0.7)',
      },
    },
  },
  plugins: [],
};

export default config;
