/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coal: {
          900: '#0F172A', // Primary Navy Deep
          800: '#1E293B', // Coal Dark
          700: '#334155', // Slate Slate
          600: '#475569',
          500: '#64748B',
          100: '#F1F5F9',
          50:  '#F8FAFC',
        },
        accent: {
          amber: '#D97706',
          emerald: '#059669',
          orange: '#EA580C',
          rose: '#E11D48',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
