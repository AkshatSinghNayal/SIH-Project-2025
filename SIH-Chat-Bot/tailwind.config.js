/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F3EA',
        surface: '#FFFFFF',
        sage: { 50: '#F1F5F2', 100: '#E3EBE4', 200: '#CBDAD0', 500: '#6E8F7C', 700: '#4E6B5B' },
        dusk: { 50: '#F4F1F8', 100: '#EAE6F1', 200: '#D5CDE3', 500: '#8C7FA3', 700: '#665A7D' },
        honey: { 100: '#F8EDD8', 500: '#E4A94F' },
        coral: { 100: '#F6E3DC', 500: '#D98168' },
        ink: { 600: '#5B6660', 900: '#2B332C' },
        line: { 200: '#E4E0D6' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        organic: '28px 12px 28px 12px',
        'organic-sm': '16px 8px 16px 8px',
        soft: '16px',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(110, 143, 124, 0.12)',
        'soft-lg': '0 12px 32px rgba(110, 143, 124, 0.18)',
        'soft-dusk': '0 8px 24px rgba(140, 127, 163, 0.16)',
        'soft-honey': '0 6px 18px rgba(228, 169, 79, 0.25)',
        focus: '0 0 0 2px #F6F3EA, 0 0 0 4px #4E6B5B',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.12)', opacity: '1' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'drift-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(12px, -16px) scale(1.06)' },
        },
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        rise: 'rise 250ms ease-out both',
        'fade-in': 'fade-in 250ms ease-out both',
        'drift-slow': 'drift-slow 14s ease-in-out infinite',
      },
      maxWidth: {
        proseletter: '68ch',
      },
    },
  },
  plugins: [],
};
