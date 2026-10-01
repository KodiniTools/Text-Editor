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
          // Textfarbe AUF der Akzentflaeche (hell: Creme auf Blau, dunkel: Navy auf Gold)
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
        },
        // Neutrale Skala = Visualizer-Palette (Creme/Navy). Die Werte kommen je
        // Theme aus style.css, damit alle bestehenden zinc-Klassen ohne Umbau
        // das KodiniTools-Farbschema tragen.
        zinc: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [
            n,
            `rgb(var(--zinc-${n}) / <alpha-value>)`,
          ]),
        ),
      },
      fontFamily: {
        // UI-Schrift wie im Visualizer; die Dokumentschrift bleibt --editor-font.
        sans: ['Supreme', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        editor: 'var(--editor-font)',
      },
    },
  },
  plugins: [],
}
