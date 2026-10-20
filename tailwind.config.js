/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        card: '#ffffff',
        'card-hover': '#f1f5f9',
        border: '#e2e8f0',
        primary: {
          50: '#eef6ff',
          100: '#d9edff',
          200: '#bce0fe',
          300: '#8ec9fe',
          400: '#53a8fc',
          500: '#0084ff',
          600: '#0066ff',
          700: '#0052cc',
          800: '#003d99',
          900: '#0a2966',
          950: '#071a3d',
        },
        brand: {
          blue: '#0066ff',
          cyan: '#00d2ff',
          dark: '#0b192c',
          navy: '#0f172a',
          accent: '#007dfe',
        },
        cyan: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#00d2ff',
          600: '#0891b2',
        },
        charcoal: {
          700: '#272d3d',
          800: '#1a1e2b',
          900: '#11141e',
          950: '#0b0d14',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      }
    },
  },
  plugins: [],
}
