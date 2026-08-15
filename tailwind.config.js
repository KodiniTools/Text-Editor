/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        // Akzentfarbe als CSS-Variable -> leicht auf KodiniTools-Branding anpassbar
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        editor: 'var(--editor-font)',
      },
    },
  },
  plugins: [],
}
