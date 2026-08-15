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
- Passt zum Privacy-First-Ansatz: keinerlei Netzwerkaufrufe zur Laufzeit.

## Deployment auf kodinitools.com

Ziel-URL: **https://kodinitools.com/texteditor/** – Webroot: `/var/www/kodinitools.com/texteditor/`.
Reine Client-App: **kein Node-Prozess, kein PM2, kein Port, kein Proxy** noetig.

Der Unterpfad ist im Build fest verdrahtet (`base: '/texteditor/'` in `vite.config.ts`); der Router
uebernimmt ihn automatisch via `import.meta.env.BASE_URL`. Ein Build fuer einen anderen Pfad
erfordert also eine Anpassung von `base`.

**1. Nginx** (einmalig)

Den Block aus [`deploy/nginx-texteditor.conf`](deploy/nginx-texteditor.conf) in den
`server`-Block von `/etc/nginx/sites-enabled/kodinitools.com` einfuegen, dann:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Der Block enthaelt: Redirect `/texteditor` -> `/texteditor/`, 1 Jahr `immutable`-Cache fuer
`/texteditor/assets/` (Dateinamen sind gehasht) und SPA-Fallback auf `index.html`, damit
History-Routen nicht 404en. `index.html` selbst wird bewusst nur 60 s gecacht, sonst zeigt der
Browser nach einem Deploy weiter die alte Version.

**2. Build-Checkout anlegen** (einmalig, auf dem Server)

```bash
git clone https://github.com/KodiniTools/Text-Editor.git /opt/kodini-build/texteditor
chmod +x /opt/kodini-build/texteditor/deploy/deploy.sh
```

Voraussetzung: Node >= 18 auf dem Server (`node -v`).

**3. Deployen** – ab jetzt der einzige noetige Befehl

```bash
/opt/kodini-build/texteditor/deploy/deploy.sh
```

[`deploy/deploy.sh`](deploy/deploy.sh) holt `main` von origin, baut (Typecheck + Vite) und legt das
Ergebnis nach `/var/www/kodinitools.com/texteditor/`. Kein Nginx-Reload noetig, da sich nur
statische Dateien aendern.

| Option | Wirkung |
|---|---|
| `-n`, `--dry-run` | Baut und zeigt, was ausgeliefert wuerde – schreibt nichts ins Live-Verzeichnis |
| `--help` | Kurzhilfe |
| `BRANCH=... deploy.sh` | Anderen Branch statt `main` deployen |
| `TARGET=... deploy.sh` | Anderes Zielverzeichnis (muss `/var/www/<site>/<tool>` sein) |

Zwei eingebaute Sicherungen:

- **Build-Pruefung vor dem Ausliefern**: Enthaelt `dist/index.html` nicht den Praefix
  `/texteditor/assets/`, bricht das Script ab und laesst das Live-Verzeichnis unberuehrt. Das
  faengt genau den Fall ab, in dem `base` in `vite.config.ts` fehlt (Ergebnis waere eine weisse
  Seite mit lauter 404s).
- **Atomarer Schwenk**: Die neue Version wird komplett in `.texteditor.new` daneben aufgebaut und
  erst per `mv` aktiv geschaltet. Es gibt damit keinen Moment, in dem die neue `index.html`
  bereits ausgeliefert wird, die passenden Assets aber noch fehlen. Alte Assets mit veraltetem
  Hash verschwinden automatisch mit der alten Version.

Zum Schluss prueft das Script selbst per `curl`, ob `https://kodinitools.com/texteditor/` mit
200 antwortet, und liefert bei Abweichung einen Exit-Code != 0 (brauchbar fuer Cron/CI).

**Manuell pruefen**

```bash
curl -I https://kodinitools.com/texteditor          # 301 -> /texteditor/
curl -I https://kodinitools.com/texteditor/         # 200, Cache-Control: max-age=60
curl -I https://kodinitools.com/texteditor/assets/  # 403/404 (kein Directory-Listing)
```

## Bekannte Grenzen / Follow-ups

- Kein Syntax-Highlighting im Editor (bewusst `<textarea>` fuer Robustheit statt contenteditable).
- ESLint ist nicht enthalten (nur Prettier). Empfohlen zum Ergaenzen:
  `npm i -D eslint @vue/eslint-config-typescript eslint-plugin-vue` + passende Flat-Config.
- Undo-History ist pro Session (nicht persistiert) und auf 200 Stufen begrenzt.
- Regex im Suchfeld nutzt Nutzereingaben; ungueltige Muster werden abgefangen (kein Absturz).
