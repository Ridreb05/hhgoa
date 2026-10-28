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
        ground: '#07090e',
        'ground-tint': '#101522',
        panel: '#10141c',
        accent: '#ff951f',
        value: '#edcd8c',
        ink: '#f4f5f7',
        'ink-muted': '#c9ced8',
        line: '#303139',
        // Preserving semantic status tokens while harmonizing with Financial theme
        risk: {
          low: '#34d399',
          medium: '#ff951f',
          high: '#f43f5e',
        },
      },
      borderRadius: {
        panel: '5px',
        editorial: '4px',
        control: '40px',
      },
      fontFamily: {
        sans: ['"Financial Plex Sans"', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"Financial Plex Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      transitionDuration: {
        interaction: '160ms',
      },
      transitionTimingFunction: {
        interaction: 'ease',
      },
    },
  },
  plugins: [],
};
