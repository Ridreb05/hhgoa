/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#0f172a',
        'card-border': '#1e293b',
        border: '#1e293b',
        primary: {
          50: '#ecfeff',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490'
        },
        risk: {
          low: '#10b981',
          medium: '#f59e0b',
          high: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
