# Kodini Texteditor

Datenschutzfreundlicher Browser-Texteditor. Alle Verarbeitung passiert **lokal im Browser** –
keine Uploads, keine Server-Kommunikation, keine Cookies. Dokumente werden nur im
`localStorage` gespeichert.

Stack: **Vue 3 (Composition API, `<script setup>`) + TypeScript (strict) + Vite + Pinia + Vue Router + Tailwind + Vitest**.

## Funktionen

- **Mehrere Dokumente** als Tabs (anlegen, umbenennen per Doppelklick, schliessen), Auto-Save im `localStorage`
- **Undo/Redo** – eigenes History-System (Tippen wird gebuendelt, Transformationen = je eine Stufe)
- **Suchen & Ersetzen** – Gross/Klein, ganzes Wort, Regex; Weiter/Zurueck, Einzeln/Alle ersetzen, Trefferzahl
- **Ueber 30 Transformationen** (auf Auswahl ODER Gesamttext):
  - Schreibweise: GROSS, klein, Titel, Satz, tOGGLE, camelCase, snake_case, kebab-case
  - Leerzeichen: trimmen, Leerzeilen weg, Mehrfach-Spaces reduzieren, Tabs↔Spaces
  - Zeilen: A-Z / Z-A / numerisch sortieren, umkehren, mischen, Duplikate entfernen, nummerieren
  - Umkehren: Zeichen / Woerter
  - Kodierung: Base64, URL, HTML (je encode/decode, Unicode-sicher)
- **Live Markdown-Vorschau** (sicher via `marked` + `DOMPurify`)
- **Statistik**: Woerter, Zeichen (mit/ohne Leerz.), Zeilen, Saetze, Absaetze, Lesezeit; Cursor Zeile/Spalte
- **Ansicht**: Hell/Dunkel/Auto, Schriftart (Sans/Serif/Mono), Schriftgroesse, Zeilenhoehe, Zeilenumbruch, Fokus-Modus
- **Import/Export**: Datei oeffnen, als `.txt`/`.md` herunterladen, alles kopieren

## Tastenkuerzel

| Kuerzel | Aktion |
|---|---|
| `Strg/Cmd + F` | Suchen & Ersetzen |
| `Strg/Cmd + M` | Neues Dokument |
| `Strg/Cmd + Z` | Rueckgaengig |
| `Strg/Cmd + Y` / `Strg/Cmd + Shift + Z` | Wiederholen |
| `Strg/Cmd + S` | Als `.txt` herunterladen |
| `Esc` | Suche schliessen |
| `Tab` | 2 Leerzeichen einfuegen |

## Installation & Start

```bash
npm install
npm run dev        # Dev-Server (http://localhost:5173)
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm run test       # Vitest (31 Tests)
npm run typecheck  # vue-tsc --noEmit
npm run format     # Prettier
```

## Projektstruktur

```
src/
  main.ts                     App-Bootstrap (Pinia + Router)
  App.vue                     Root + Theme-Init
  style.css                   Tailwind + CSS-Variablen (Akzentfarbe)
  types.ts                    EditorApi-Interface
  router/index.ts             Vue Router (eine Route)
  stores/editor.ts            Pinia: Dokumente, Settings, Undo/Redo, Persistenz
  composables/
    useTextStats.ts           Reaktive Textstatistik
    useTheme.ts               Hell/Dunkel + Schriftart auf <html>
    useKeyboardShortcuts.ts   Globale Tastenkuerzel
  utils/
    textTransforms.ts         Reine Transform-Funktionen (getestet)
    transformRegistry.ts      Gruppierte Liste fuers Menue
    find.ts                   Regex-Bau + Trefferzaehlung (getestet)
    markdown.ts               Markdown -> bereinigtes HTML
  components/
    DocumentTabs.vue  EditorToolbar.vue  TransformMenu.vue
    FindReplace.vue   EditorArea.vue     MarkdownPreview.vue  StatusBar.vue
  views/EditorView.vue        Layout + Verdrahtung
tests/                        Vitest-Specs
```

## KodiniTools-Integration

- **Akzentfarbe** anpassen: in `src/style.css` die CSS-Variable `--accent` (RGB-Tripel ohne Kommas)
  auf deine Markenfarbe setzen, ggf. `--accent-soft` fuer hell/dunkel.
- **Deployment**: `npm run build` -> `dist/` per SCP/FileZilla auf den VPS, von Nginx als statische
  Dateien ausliefern. Kein Node-Prozess/PM2 noetig (reine Client-App).
- Passt zum Privacy-First-Ansatz: keinerlei Netzwerkaufrufe zur Laufzeit.

## Bekannte Grenzen / Follow-ups

- Kein Syntax-Highlighting im Editor (bewusst `<textarea>` fuer Robustheit statt contenteditable).
- ESLint ist nicht enthalten (nur Prettier). Empfohlen zum Ergaenzen:
  `npm i -D eslint @vue/eslint-config-typescript eslint-plugin-vue` + passende Flat-Config.
- Undo-History ist pro Session (nicht persistiert) und auf 200 Stufen begrenzt.
- Regex im Suchfeld nutzt Nutzereingaben; ungueltige Muster werden abgefangen (kein Absturz).
