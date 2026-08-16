# Kodini Texteditor

Datenschutzfreundlicher Browser-Texteditor. Alle Verarbeitung passiert **lokal im Browser** –
keine Uploads, keine Server-Kommunikation, keine Cookies. Dokumente werden nur im
`localStorage` gespeichert.

Stack: **Vue 3 (Composition API, `<script setup>`) + TypeScript (strict) + Vite + Pinia + Vue Router + Tailwind + Vitest**.

## Funktionen

- **Mehrere Dokumente** als Tabs (anlegen, umbenennen per Doppelklick, schliessen), Auto-Save im `localStorage`
- **Undo/Redo** – eine gemeinsame Zeitachse fuer Inhalt UND Darstellung: Tippen wird gebuendelt,
  Transformationen sind je eine Stufe, und Aenderungen in der Format-Leiste (Schrift, Groesse,
  Zeilenabstand, Laufweite, Farbe, Ausrichtung, Umbruch) lassen sich genauso zuruecknehmen
- **Suchen & Ersetzen** – Gross/Klein, ganzes Wort, Regex; Weiter/Zurueck, Einzeln/Alle ersetzen, Trefferzahl
- **Ueber 30 Transformationen** (auf Auswahl ODER Gesamttext):
  - Schreibweise: GROSS, klein, Titel, Satz, tOGGLE, camelCase, snake_case, kebab-case
  - Leerzeichen: trimmen, Leerzeilen weg, Mehrfach-Spaces reduzieren, Tabs↔Spaces
  - Zeilen: A-Z / Z-A / numerisch sortieren, umkehren, mischen, Duplikate entfernen, nummerieren
  - Umkehren: Zeichen / Woerter
  - Kodierung: Base64, URL, HTML (je encode/decode, Unicode-sicher)
- **Statistik**: Woerter, Zeichen (mit/ohne Leerz.), Zeilen, Saetze, Absaetze, Lesezeit; Cursor Zeile/Spalte
- **Format-Leiste** direkt unter der Werkzeugleiste – Schriftart mit allen Schnitten der
  eigenen Schriften (nach Familie gruppiert, Vorschau in eigener Schrift), Schriftgroesse,
  Zeilenabstand, Laufweite, Textfarbe (8 Schnellfarben + freier Farbwaehler), Ausrichtung,
  Zeilenumbruch, Zuruecksetzen – alles undo-/redo-faehig. Ein-/ausblendbar ueber `Format`.
  Design (Hell/Dunkel) und Sprache steuert die globale Navigation
- **Ueberschriften & Listen** – Absatz auf `Ueberschrift 1/2/3` umstellen sowie Aufzaehlungs- und
  nummerierte Listen. Damit der zeilengenaue Seitenumbruch weiter aufgeht, sitzen die Bloecke auf
  einem **Grundlinienraster**: jede sichtbare Zeile bleibt genau einen Basisschritt
  (`Schriftgroesse × Zeilenhoehe`) hoch, Abstaende kommen nur als ganze Schritte dazu, und die
  Ueberschriftengroesse ist auf ~einen Schritt gedeckelt – so zerschneidet ein Seitenschnitt nie
  eine Ueberschrift. Editor, Vorschau und PDF teilen sich diese Regeln (Klasse `.editor-rich`)
- **Seitenformat** (A3/A4/A5/Letter/Legal, Hoch- oder Querformat) – die Bearbeitung erfolgt auf
  einem masstabsgetreuen Blatt
- **Markdown-Live-Vorschau**: ueber `Markdown` in der Werkzeugleiste klappt neben dem Editor eine
  Live-Vorschau auf (auf schmalen Schirmen darunter). Gerendert wird der **reine Text** des
  Dokuments als Markdown (`# Titel`, `- Punkt`, `**fett**`, `[Link](…)`, Zitate, Code, Tabellen) –
  der Editor dient so zugleich als Markdown-Quelle. Das Rendern (`marked`) wird per `DOMPurify`
  bereinigt (kein XSS)
- **Vorschau = exportierte Datei**: Die Vorschau zeigt das Dokument als paginierte Seiten genau
  so, wie das PDF aussieht (gleicher Umbruch, gleiche Schrift)
- **PDF-Export mit einem Klick** (`Speichern -> Als PDF`): erzeugt direkt eine `.pdf` im gewaehlten
  Seitenformat. Vorschau und Export nutzen dieselbe Render-Funktion, die Seiten werden gerastert
  (`html2canvas` + `jsPDF`) – dadurch wird **jede** eigene Schrift pixelgenau uebernommen
- **Drucken** (Knopf in der Werkzeugleiste bzw. `Strg/Cmd + P`) im gewaehlten Seitenformat
- **Fokus-Modus** blendet alle Leisten aus
- **Mobile / Touch** – die komplette Oberflaeche ist fuer Smartphones und Tablets angepasst:
  Werkzeug-, Format- und Statusleiste werden auf schmalen Bildschirmen zu je einer horizontal
  wischbaren Zeile (statt in viele Zeilen umzubrechen), Knoepfe und Farbfelder haben groessere
  Tippflaechen, Formularfelder nutzen 16px (kein ungewolltes iOS-Zoom beim Fokus), Bild-Griffe zum
  Skalieren/Loeschen sind groesser, und die Tab-Aktionen (Umbenennen/Schliessen) sind ohne Hover
  dauerhaft sichtbar. Die Menues (`Speichern`, `Werkzeuge`) liegen per `Teleport` im `body`, damit
  sie in einer scrollenden Leiste nicht abgeschnitten werden
- **Zweisprachig (DE/EN)** – die komplette Oberflaeche laesst sich ueber den Sprachumschalter der
  globalen Navigation wechseln; die Wahl wird gemerkt und beim ersten Besuch aus der Browsersprache abgeleitet
- **Import/Export**: Datei oeffnen, als `.txt`/`.md`/**HTML** herunterladen, alles kopieren. Der
  HTML-Export ist eigenstaendig (self-contained) und uebernimmt Typografie und Bilder wie die
  Vorschau -- der Text bleibt dabei echter, auswaehlbarer Text (kein Rasterbild)
- **Sicherung (Backup & Wiederherstellung)**: unter `Speichern -> Sicherung exportieren` werden
  **alle** Dokumente samt Einstellungen als eine `.json` gesichert; `Sicherung wiederherstellen`
  (oder eine `.json` einfach ins Fenster ziehen) fuegt die Dokumente **hinzu** (nichts geht
  verloren). Wichtig, weil die Daten sonst nur im `localStorage` liegen
- **Drag & Drop**: Text (`.txt`/`.md`), Bilder oder eine Sicherung (`.json`) einfach ins Fenster
  ziehen -- Text wird als neues Dokument geoeffnet, Bilder werden platziert, Sicherungen importiert
- **PWA / Offline**: installierbar (App-Symbol, eigenes Fenster) und **komplett offline** nutzbar –
  ein Service Worker cacht die App-Shell und alle Assets (auch die PDF-Export-Bausteine). Neue
  Versionen werden als dezentes „Neu laden"-Banner angeboten (kein ungefragtes Neuladen)
- **Tastenkuerzel fuer Turbo-Nutzer** – nahezu jede Aktion ist mit der Tastatur erreichbar; die
  vollstaendige, plattformbewusste Uebersicht (macOS zeigt ⌘/⌥) oeffnet der Knopf mit dem
  Tastatur-Symbol in der Werkzeugleiste bzw. `Strg + /` oder `F1`

## Tastenkuerzel

`Strg` steht unter macOS fuer `Cmd`. Die Kombinationen sind so gewaehlt, dass sie mit den
Browser-Kuerzeln nicht kollidieren; die Erkennung laeuft ueber die physische Taste (`e.code`),
damit z. B. `Alt + 1` und `Strg + Shift + .` auch auf macOS und anderen Tastaturlayouts stimmen.

**Datei & Dokumente**

| Kuerzel | Aktion |
|---|---|
| `Strg + M` | Neues Dokument |
| `Strg + O` | Datei oeffnen (Import) |
| `Strg + S` | Als `.txt` herunterladen |
| `Strg + Shift + S` | Als PDF exportieren |
| `Strg + P` | Als PDF / drucken (im Seitenformat) |
| `Alt + 1` … `Alt + 9` | Zu Dokument 1–9 springen (9 = letztes) |

**Bearbeiten & Suchen**

| Kuerzel | Aktion |
|---|---|
| `Strg + Z` | Rueckgaengig |
| `Strg + Y` / `Strg + Shift + Z` | Wiederholen |
| `Strg + A` | Alles markieren |
| `Strg + F` | Suchen & Ersetzen |
| `Strg + G` / `Strg + Shift + G` | Weiter- / rueckwaerts suchen |

**Format**

| Kuerzel | Aktion |
|---|---|
| `Strg + B` | Fett |
| `Strg + I` | Kursiv |
| `Strg + \` | Formatierung entfernen |
| `Strg + Shift + .` / `Strg + Shift + ,` | Schrift vergroessern / verkleinern |
| `Tab` | 2 Leerzeichen einfuegen |

**Absaetze & Listen**

| Kuerzel | Aktion |
|---|---|
| `Strg + Alt + 0` | Normaler Text |
| `Strg + Alt + 1` / `2` / `3` | Ueberschrift 1 / 2 / 3 |
| `Strg + Shift + 8` | Aufzaehlungsliste |
| `Strg + Shift + 7` | Nummerierte Liste |

**Ansicht**

| Kuerzel | Aktion |
|---|---|
| `Strg + Shift + F` | Fokus-Modus umschalten |
| `Esc` | Suche / Fokus / Uebersicht schliessen |
| `Strg + /` · `F1` | Tastenkuerzel-Uebersicht |

## Installation & Start

```bash
npm install
npm run dev        # Dev-Server (http://localhost:5173)
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm run test       # Vitest (112 Tests)
npm run typecheck  # vue-tsc --noEmit
npm run lint       # ESLint (Vue + TypeScript)
npm run lint:fix   # ESLint mit Autofix
npm run format     # Prettier (schreibt)
npm run format:check  # Prettier (nur pruefen)
npm run check      # lint + format:check + typecheck + test in einem
```

**Code-Qualitaet**: ESLint (`eslint.config.js`, Flat-Config) mit den empfohlenen Regeln von
`typescript-eslint` und `eslint-plugin-vue`. Die Formatierung bleibt bei Prettier
(`.prettierrc.json`); `@vue/eslint-config-prettier` schaltet alle Regeln ab, die sich mit
Prettier ueberschneiden, sodass sich beide nicht widersprechen. `npm run check` fasst Lint,
Format-Pruefung, Typecheck und Tests zusammen – gut fuer CI oder vor einem Commit.

## Projektstruktur

```
src/
  main.ts                     App-Bootstrap (Pinia + Router)
  App.vue                     Root + Theme-Init
  style.css                   Tailwind + CSS-Variablen (Akzentfarbe)
  types.ts                    EditorApi-Interface
  router/index.ts             Vue Router (eine Route)
  i18n/
    messages.ts               Uebersetzungstabelle DE/EN (getippt)
    index.ts                  Spracherkennung, Umschalten, Persistenz, useI18n()
  stores/editor.ts            Pinia: Dokumente, Settings, Undo/Redo, Persistenz
  config/fonts.ts             Schriftenliste + Erkennen/Laden eigener Webfonts
  composables/
    useTextStats.ts           Reaktive Textstatistik
    useTheme.ts               Design + Textdarstellung als CSS-Variablen
    useKeyboardShortcuts.ts   Globale Tastenkuerzel
    useAnchoredMenu.ts        Dropdown per Teleport (scroll-/touchfest)
    useFileDrop.ts            Globales Drag & Drop fuer Dateien
  utils/
    textTransforms.ts         Reine Transform-Funktionen (getestet)
    transformRegistry.ts      Gruppierte Liste fuers Menue
    find.ts                   Regex-Bau + Trefferzaehlung (getestet)
    files.ts                  Datei-Helfer: Lesen, Typ-Erkennung, Download (getestet)
    exportHtml.ts             Eigenstaendiges HTML-Dokument bauen (getestet)
    fontFiles.ts              Dateiname -> Familie/Schnitt (getestet)
    pageFormats.ts            Papierformate + @page-Groesse (getestet)
    renderPages.ts            Seiten-DOM fuer Vorschau + PDF (getestet)
    pageRenderOptions.ts      Settings -> Render-Optionen (gemeinsame Quelle)
    exportPdf.ts              Ein-Klick-PDF (html2canvas + jsPDF, dyn. geladen)
    markdown.ts               Markdown -> bereinigtes HTML
  components/
    DocumentTabs.vue  EditorToolbar.vue  TransformMenu.vue  FormatBar.vue
    FindReplace.vue   EditorArea.vue     PagePreview.vue      StatusBar.vue
    NumberStepper.vue ShortcutHelp.vue  PwaPrompt.vue  MarkdownPreview.vue
  views/EditorView.vue        Layout + Verdrahtung
tests/                        Vitest-Specs
```

## Eigene Schriften

Schriften werden **automatisch gefunden**. Datei nach
`/var/www/kodinitools.com/public/fonts/` legen, neu deployen – fertig. Kein Eintrag im Quelltext.

```bash
scp KodiniSans-Regular.woff2 root@server:/var/www/kodinitools.com/public/fonts/
/opt/kodini-build/texteditor/deploy/deploy.sh
```

`deploy.sh` schreibt beim Bauen eine `fonts.json` mit den gefundenen Dateinamen neben die
`index.html`; die App liest sie und baut daraus die Auswahl.

**Jeder Schnitt wird ein eigener Auswahleintrag**, gruppiert unter dem Familiennamen. Aus
`Switzer-Thin.woff2 … Switzer-Bold.woff2` werden also die Eintraege `Switzer Thin`, `Switzer
Light`, … `Switzer Bold` in der Gruppe „Switzer". Der Dateiname bestimmt Familie und Schnitt:

| Datei | Eintrag |
|---|---|
| `Switzer-Regular.woff2` | Switzer › Regular (400 normal) |
| `Switzer-Bold.woff2` | Switzer › Bold (700 normal) |
| `Switzer-BoldItalic.woff2` | Switzer › Bold Italic (700 kursiv) |
| `Hind-SemiBold.woff2` | Hind › Semibold (600) |
| `Ranade-Variable.woff2` | Ranade › Variable (100–900) |
| `Tanker-Regular.woff2` | Tanker › Regular |

Erkannt werden `thin`, `extralight`, `light`, `regular`, `medium`, `semibold`, `bold`,
`extrabold`, `black` (auch numerisch: `-300`), dazu `italic`/`oblique` und `VariableFont`.
Ohne erkennbaren Schnitt wird der ganze Dateiname zur Familie – ein Name wie
`Playfair-Display.woff2` wird also nicht faelschlich zerschnitten.

Weitere Eigenschaften:

- **Formate**: `woff2` (empfohlen), `woff`, `ttf`, `otf`. Liegt derselbe Schnitt mehrfach vor,
  gewinnt das modernste Format – der Browser laedt nur eine Datei.
- **Vorschau**: Beim Aufklappen der Schrift-Auswahl steht jeder Eintrag in seiner eigenen
  Schrift. Dafuer werden die Dateien geladen, sobald der Mauszeiger die Auswahl beruehrt (oder
  sie den Fokus bekommt) – nicht beim Seitenstart.
- **Geladen wird sonst erst bei Auswahl, und dann nur die eine Datei des Schnitts.** Wer nur
  tippt und nie eine eigene Schrift oeffnet, loest **null Netzwerkaufrufe** aus.
- **Variable Fonts**: Liegt neben `X-Variable.woff2` auch ein `X-Regular.woff2`, wird der
  Variable Font weggelassen (die statische Datei ist kleiner, und sonst waere nicht definiert,
  welche greift). Fehlt das Regular – wie bei Ranade –, bleibt der Variable Font.
- **Faellt das Laden aus**, greift der Fallback-Stack – der Text bleibt lesbar.
- **Dateinamen** duerfen Buchstaben, Ziffern und `. _ - ,` enthalten. Alles andere (Umlaute,
  Leerzeichen, Anfuehrungszeichen) wird uebersprungen und beim Deploy als Warnung genannt.
- Der nginx-Block in [`deploy/nginx-texteditor.conf`](deploy/nginx-texteditor.conf) cacht
  `/public/fonts/` ein Jahr lang.
- Anderer Ordner: `FONTS_DIR=/pfad/zu/fonts deploy.sh`

Wer eine Schrift lieber von Hand benennen oder aus einer anderen Quelle laden will, traegt sie
weiterhin in `CUSTOM_FONTS` in [`src/config/fonts.ts`](src/config/fonts.ts) ein – das hat Vorrang.

## Globale Seiten-Bausteine (Navigation, Footer, Cookies)

Die Seite laeuft unter der globalen KodiniTools-Navigation (Eintrag unter **Tools**), mit dem
gemeinsamen Footer und dem DSGVO-Cookie-Banner samt Google Consent Mode v2.

- Die Bausteine liegen als eigene Dateien unter [`partials/`](partials/) (`nav.html`,
  `footer.html`, `cookie-banner.html`, `consent-mode.html`).
- Ein kleiner Vite-Schritt (`injectPartials` in `vite.config.ts`) bindet sie beim Build ueber
  Platzhalter `<!--INJECT:name-->` direkt in `index.html` ein. `dist/` bleibt damit
  **selbsttragend** – kein SSI, kein zusaetzlicher Request. Zum Aktualisieren die Datei unter
  `partials/` ersetzen und neu bauen.
- **Layout**: `index.html` ist eine App-Shell (Flex-Spalte) – Navigation oben, Editor in der
  Mitte (fuellt den Platz), Footer unten. Die Seite selbst scrollt nicht; gescrollt wird im
  Editor.
- **Sprache synchron**: Navigation, Footer, Cookie-Banner und Editor teilen sich
  `localStorage['locale']` und das Fenster-Event `locale-changed`. Ein Wechsel an einer Stelle
  zieht ueberall nach – egal ob im Nav-Umschalter oder in der Format-Leiste.
- **Design synchron**: Die Navigation stylt sich ueber `[data-theme]` und speichert in
  `localStorage['theme']`. Der Editor setzt zusaetzlich zum Tailwind-`.dark` auch `data-theme`
  und uebernimmt einen Wechsel aus dem Nav-Theme-Toggle (MutationObserver). Beide Richtungen
  greifen. Theme und Sprache haben deshalb genau einen Ort: die globale Navigation (die
  Format-Leiste enthaelt sie nicht mehr).

## Sprachen (i18n)

Die Oberflaeche ist zweisprachig (Deutsch/Englisch). Umgeschaltet wird in der Format-Leiste unter
`Sprache` / `Language`; die Wahl landet im `localStorage`, beim ersten Besuch entscheidet die
Browsersprache. Die aktive Sprache steht auch in `<html lang>`.

Umgesetzt ohne zusaetzliche Abhaengigkeit (kein `vue-i18n`): eine getippte Nachrichtentabelle in
[`src/i18n/messages.ts`](src/i18n/messages.ts). `de` ist die Referenz, `en` hat den Typ
`typeof de` – **eine fehlende oder zu viel uebersetzte Zeichenkette ist ein Compilerfehler**, kein
stiller Fehltext. Das haelt beide Sprachen automatisch synchron und kommt ohne Laufzeit-Compiler
aus (relevant unter strenger CSP).

Eine dritte Sprache ergaenzen: in `messages.ts` ein weiteres Objekt vom Typ `Messages` anlegen,
in `MESSAGES` und `LOCALES` (in [`src/i18n/index.ts`](src/i18n/index.ts)) eintragen – die
Format-Leiste zeigt dann automatisch einen weiteren Knopf.

Bereits vorhandene Dokumente werden beim Sprachwechsel **nicht** umgeschrieben (es sind
Nutzerdaten); nur das erste Willkommensdokument wird in der Startsprache angelegt.

## KodiniTools-Integration

- **Akzentfarbe** anpassen: in `src/style.css` die CSS-Variable `--accent` (RGB-Tripel ohne Kommas)
  auf deine Markenfarbe setzen, ggf. `--accent-soft` fuer hell/dunkel.
- Passt zum Privacy-First-Ansatz: keine Netzwerkaufrufe zur Laufzeit, solange keine eigene
  Schrift ausgewaehlt ist (dann wird genau deren Datei geladen).

## PWA / Offline

Der Editor ist eine installierbare **Progressive Web App** und laeuft komplett **offline** – das
passt zum Privacy-First-Ansatz (die Dokumente liegen ohnehin nur im `localStorage`).

- **Service Worker** via [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (Workbox,
  `generateSW`). Konfiguration in [`vite.config.ts`](vite.config.ts): die App-Shell und **alle**
  gebauten Assets werden vorab gecacht – inklusive der faul geladenen PDF-Bausteine
  (`jspdf`/`html2canvas`), damit auch der PDF-Export offline funktioniert. Fuer die eigenen
  Schriften (`/public/fonts/`), die Schriftliste (`fonts.json`) und die App-Icons gibt es
  Runtime-Caches.
- **Manifest**: [`public/site.webmanifest`](public/site.webmanifest) bleibt die Quelle
  (`manifest: false` im Plugin) – `display: standalone`, eigener `scope`/`start_url` unter
  `/texteditor/`.
- **Updates**: bewusst als **Angebot**. Ist eine neue Version bereit, zeigt
  [`components/PwaPrompt.vue`](src/components/PwaPrompt.vue) ein kleines „Neu laden"-Banner
  (`registerType: 'prompt'`) – so laedt die App nie ungefragt mitten im Tippen neu. Beim ersten
  Offline-Bereitstehen erscheint einmalig ein Hinweis-Toast.
- **Dev**: der Service Worker ist im Dev-Server aus (Standard) – kein Cache-Aerger beim Entwickeln.
  Zum Testen `npm run build && npm run preview`.
- **nginx**: `/texteditor/sw.js` wird bewusst mit `Cache-Control: no-cache` ausgeliefert (Block in
  [`deploy/nginx-texteditor.conf`](deploy/nginx-texteditor.conf)), damit Updates zeitnah ankommen.
  Die eigentlichen App-Assets bleiben gehasht und langlebig gecacht.

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

- Der Editor ist ein `contenteditable`-Feld (fuer Inline-Auszeichnung, Ueberschriften, Listen und
  frei platzierte Bilder); kein Syntax-Highlighting.
- Ueberschriften/Listen sitzen auf dem Grundlinienraster – dadurch ist die Ueberschriftengroesse
  auf ~einen Zeilenschritt gedeckelt (bei sehr enger Zeilenhoehe fallen die Ueberschriften daher
  kleiner aus). Weitere Blocktypen (Zitat, Code) und echte Markdown-Ausgabe sind moegliche
  Follow-ups.
- Undo-History ist pro Session (nicht persistiert) und auf 200 Stufen begrenzt.
- Regex im Suchfeld nutzt Nutzereingaben; ungueltige Muster werden abgefangen (kein Absturz).
