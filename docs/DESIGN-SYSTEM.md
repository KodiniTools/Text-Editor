# Design-System des Kodini Texteditors

Extrahiert aus dem Repository `KodiniTools/Text-Editor`. Jeder Wert nennt seine Quelle als `datei:zeile`. Werte, die nicht direkt im Code stehen, sondern abgeleitet oder gezählt sind, tragen die Markierung **[Annahme]**.
Diese Markdown-Fassung ist aus der Artifact-Version 2 der Doku abgeleitet; die Artifact-Fassung wird wöchentlich aktualisiert und ist die führende Quelle.

|         |                                                      |
| ------- | ---------------------------------------------------- |
| Stand   | 2026-10-12                                           |
| Commit  | `0a9208b` (main, Merge #73)                          |
| Stack   | Vue 3.4 · Tailwind 3.4 · Vite 5 · Pinia 2 · Vitest 2 |
| Version | 2 (ersetzt v1 vom 2026-10-06, Commit `f09f3b3`)      |

Inhalt:

0. [0 Was sich seit v1 geändert hat](#0-was-sich-seit-v1-geändert-hat)
1. [1 Überblick & Architektur](#1-überblick--architektur)
2. [2 Farben](#2-farben)
3. [3 Typografie](#3-typografie)
4. [4 Abstände & Größen](#4-abstände--größen)
5. [5 Radien](#5-radien)
6. [6 Schatten, Fokus & Motion](#6-schatten-fokus--motion)
7. [7 Breakpoints & Media Queries](#7-breakpoints--media-queries)
8. [8 Ebenen (z-index)](#8-ebenen-z-index)
9. [9 Komponenten-Inventar](#9-komponenten-inventar)
10. [10 Hartkodierte & inkonsistente Werte](#10-hartkodierte--inkonsistente-werte)
11. [11 Methodik & Quellen](#11-methodik--quellen)

---

## 0 Was sich seit v1 geändert hat

Zwischen `f09f3b3` und `0a9208b` wurden zwei Pull Requests gemerged (#72 Doku, #73 Migration), zusammen 63 Dateien, +4851/−1333 Zeilen. Die Migration ersetzt das gesamte in v1 beschriebene System; diese Fassung ist deshalb eine Neuerhebung, kein Delta.

### Kurzfassung

- **Eine Stilwelt statt drei.** Editor, Landing, Features und Blog laufen auf denselben Tokens `--ds-*` aus `src/design-system/tokens-v2.css`. Die alte `zinc`-Umbiegung, alle `dark:`-Varianten, die Landing-Verläufe und das Visualizer-CSS sind weg.
- **Tokens v2 sind eine Kopie** aus dem Collage Maker (Stand `9dc4eca`), der sie aus dem Playlist Generator (`89bb48e`) hat (`src/design-system/README.md:3-8`). Pflegeort ist dort, nicht hier.
- **Gold ist jetzt auch hell der Akzent** (`#c9984d`, `tokens-v2.css:127`); Blau `#014f99` gibt es nur noch in den vendored Partials.
- **11 Ui-Bausteine** unter `src/components/ui/` ersetzen Dialog, Toast, kbd und die meisten lokalen Button-Klassen. Werkzeug-, Format- und Tab-Leiste bleiben eigenes Markup auf denselben Tokens (`src/components/ui/README.md:47-51`).
- **Wächter-Tests** verhindern die Rückkehr der alten Welt: `tests/designTokens.spec.ts` (20 Tests), `tests/buttonContrast.spec.ts` (3), `src/design-system/__tests__/tokens-v2.spec.ts` (17). Alle 40 laufen auf `0a9208b` grün.
- **Supreme** liegt jetzt gebündelt in drei Gewichten (400/500/700) unter `src/assets/fonts/` statt als einzelner Regular-Schnitt vom Server.
- **Befunde:** von 17 (3 kritisch) auf 14 (0 kritisch, 8 Warnung, 6 Hinweis). Erledigt sind unter anderem die drei Farbsysteme, die Tailwind-Grau-Literale, die Radien- und Schattenstreuung, Supreme nur als Regular, die fünf lokalen Button-Definitionen und die Toast-/Fehlerfarben ohne Token. Die Partials, die Dokument-/Export-Farben und die doppelt gepflegte Popover-Breite bleiben.
- **Neu dazugekommen:** `docs/DESIGN-SYSTEM.md` aus PR #72 beschreibt noch den v1-Stand (Befund 10.8), und die Mono-Schrift aus den Tokens wird nirgends geladen (10.6).

## 1 Überblick & Architektur

Es gibt **eine Quelle der Wahrheit**: 71 CSS-Variablen im Namespace `--ds-*` (`tokens-v2.css:17-112`, **[Annahme]** gezählt). Dunkel liegt auf `:root`, Hell zweimal identisch auf `.light-theme` (`tokens-v2.css:115-140`) und `:root[data-theme='light']` (`:143-168`), damit auch die Partials die Variablen lesen können. Tailwind ist nur noch Utility-Schicht für Layout; Farben, Radien, Schatten, Dauern und die Typo-Skala sind in `tailwind.config.js` auf diese Variablen gebunden.

| Kennzahl                                                                                                         | Wert    |
| ---------------------------------------------------------------------------------------------------------------- | ------- |
| Stilwelt (vorher 3)                                                                                              | 1       |
| Token-Variablen `--ds-*` (19 Farbe, 2 Effekt, 16 Typo, 10 Abstand, 5 Form, 3 Motion, 9 Größe, 3 Layout, 5 Ebene) | 71      |
| verschiedene Hex-Literale außerhalb der Token in `src/` + `index.html` (vorher 32)                               | 15      |
| `rgba()`-Literale außerhalb der Token (vorher ~60)                                                               | 6       |
| Ui-Bausteine + App-SFCs im Inventar                                                                              | 11 + 19 |
| Befunde (0 kritisch, 8 Warnung, 6 Hinweis)                                                                       | 14      |

| Schicht                       | Datei                                                  | Zweck                                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Token (Laufzeit)**          | `src/design-system/tokens-v2.css`                      | Alle `--ds-*`; importiert als erste Zeile von `src/style.css:12`                                                                                                                                                           |
| **Token (Daten)**             | `tokens-v2.json · tokens-v2.ts`                        | W3C-nahe JSON-Fassung mit `$extensions.css`; typisierter Zugriff `themeColorsV2()`, `breakpointsV2`, `controlSizesV2` (`tokens-v2.ts:23,44,52`). Außerhalb der Tests ungenutzt (Befund 10.13)                              |
| **Tailwind-Brücke**           | `tailwind.config.js`                                   | Semantische Farbklassen `surface-0…3`, `line`, `ink`, `accent`, `on-accent`, `link`, Status (`:10-45`); drei Radien (`:60-67`); zwei Schatten (`:69-73`); Dauern (`:74-80`); Typo-Skala (`:83-108`); z-Ebenen (`:110-115`) |
| **Globale Basis**             | `src/style.css`                                        | Supreme `@font-face`, Body/App-Shell, Angleichung der Partials, Dokument-Typografie `.editor-rich`, Druck, Touch, Bewegung                                                                                                 |
| **Ui-Bausteine**              | `src/components/ui/*.vue`                              | 11 Komponenten, scoped CSS ausschließlich über `--ds-*` (`ui/README.md:12-16`); ESLint-Ausnahme für optionale Props (`eslint.config.js:30-35`)                                                                             |
| **Landing / Features / Blog** | `src/styles/landing.css · features.css`                | Handgeschriebenes CSS, aber nur noch mit Token-Variablen; gekapselt unter `.landing-page` bzw. `.features-page` (`landing.css:8 · features.css:7-9`)                                                                       |
| **Partials (vendored)**       | `partials/nav.html · footer.html · cookie-banner.html` | Unverändert seit v1, eigene Palette; `style.css:127-235` neutralisiert Hintergründe und Textfarben per `!important` (Befund 10.1)                                                                                          |

### Theme-Mechanik

- `useTheme` setzt drei Schalter gleichzeitig: `html.dark` (Altbestand für externe Skripte), `html[data-theme]` (Tokens + Partials) und `body.light-theme` (Parität zu Collage Maker / Playlist Generator) (`src/composables/useTheme.ts:49-54`).
- Ein Inline-Skript setzt `data-theme` vor dem ersten Paint aus `localStorage.theme` oder dem Systemschema (`index.html:26-37`); eine bewusste Wahl wird global geteilt (`useTheme.ts:57-63`), ein Wechsel aus der Navigation per `MutationObserver` übernommen (`useTheme.ts:68-74`).
- `useDocumentTheme` liest nur `data-theme`; fehlendes Attribut gilt als dunkel (`src/composables/useDocumentTheme.ts:10`), passend zu „Dark auf `:root`“.
- `color-scheme` folgt dem Attribut, damit native Selects und Scrollbalken mitgehen (`style.css:61-67`).
- Es gibt keine `dark:`-Varianten mehr; der Wächter `tests/designTokens.spec.ts:56-58` schlägt bei jeder an.

### Gestaltungsregeln (aus den READMEs)

- Gold ist Vollfläche nur für die Primäraktion, Fokus und aktive Zustände; eine Goldfläche pro Ansicht (`design-system/README.md:47-48 · ui/README.md:56`).
- Ein Rahmen (1px), drei Radien, Schatten nur für Overlays (Dialog, Toast, Toolbar-Popover). Hover ändert Farbe, nie Größe; keine Gradients, kein Glow, kein Blur (`design-system/README.md:48-49 · ui/README.md:54-55`).
- Destruktive Aktionen sind textbasiert (`text-danger` / `variant="danger"`), nie Vollfläche (`design-system/README.md:50 · ui/README.md:58`).
- Text auf Goldflächen ist immer `text-on-accent`; Kontrast ≥ 4.5:1 in beiden Themes wird getestet (`tests/buttonContrast.spec.ts:18-45`).

## 2 Farben

### 2.1 Token (`src/design-system/tokens-v2.css`)

Dunkel aus `:root` (`:17-46`), Hell aus `.light-theme` (`:115-140`); der Block `:root[data-theme='light']` (`:143-168`) ist Zeile für Zeile identisch. Tailwind-Klasse laut `tailwind.config.js:10-45`.

| Token                | Dunkel                 | Hell                   | Tailwind                      | Rolle                                            | Quelle dunkel · hell |
| -------------------- | ---------------------- | ---------------------- | ----------------------------- | ------------------------------------------------ | -------------------- |
| `--ds-surface-0`     | #0a1324                | #f6f5f1                | `bg-surface-0`                | Seite                                            | `:19 · :116`         |
| `--ds-surface-1`     | #111d33                | #ffffff                | `bg-surface-1`                | Panel, Karte, Leiste                             | `:20 · :117`         |
| `--ds-surface-2`     | #182741                | #f0eee8                | `bg-surface-2`                | Eingabe, Chip, Hover                             | `:21 · :118`         |
| `--ds-surface-3`     | #1f3050                | #e8e5dd                | `bg-surface-3`                | Hover auf Fläche 2                               | `:22 · :119`         |
| `--ds-border`        | #223553                | #e2dfd7                | `border-line` (auch `border`) | Rahmen, Trenner                                  | `:23 · :120`         |
| `--ds-border-strong` | #2f4668                | #cbc6ba                | `border-line-strong`          | Felder, Sekundär-Buttons                         | `:24 · :121`         |
| `--ds-text`          | #f2eee2                | #14213a                | `text-ink`                    | Text 1                                           | `:27 · :123`         |
| `--ds-text-2`        | #a7b3c4                | #3f4a60                | `text-ink-2`                  | Text 2 (Labels, Fließtext in Karten)             | `:28 · :124`         |
| `--ds-text-3`        | #8593a8                | #5f6b84                | `text-ink-3`                  | Text 3 (Hinweise, Platzhalter)                   | `:29 · :125`         |
| `--ds-accent`        | #d4a257                | #c9984d                | `bg-accent` / `text-accent`   | Primäraktion, Fokus, aktiv                       | `:32 · :127`         |
| `--ds-accent-hover`  | #e0b06a                | #b8842f                | `hover:bg-accent-hover`       | Hover der Primäraktion                           | `:33 · :128`         |
| `--ds-accent-soft`   | `rgba(212,162,87,.14)` | `rgba(201,152,77,.16)` | `bg-accent-soft`              | Auswahl, aktive Fläche, Icon-Boxen               | `:34 · :129`         |
| `--ds-on-accent`     | #0a1324                | #14213a                | `text-on-accent`              | Text auf Gold                                    | `:35 · :130`         |
| `--ds-link`          | #6aaef5                | #0f5aa8                | `text-link`                   | Links (auch im Dokument)                         | `:36 · :131`         |
| `--ds-success`       | #5fcf8a                | #177a42                | `text-success`                | Status                                           | `:39 · :133`         |
| `--ds-warning`       | #e3b341                | #9a6416                | `text-warning`                | Status                                           | `:40 · :134`         |
| `--ds-danger`        | #ef6b6b                | #c93c3c                | `text-danger`                 | Destruktiv (Text), Fehler-Toast, Bild-Löschknopf | `:41 · :135`         |
| `--ds-info`          | #6aaef5                | #0f5aa8                | `text-info`                   | Status (identisch mit link)                      | `:42 · :136`         |

Zusätzlich fest in Tailwind: `white #ffffff`, `black #000000`, `transparent`, `current` (`tailwind.config.js:11-14`). Dieselben Hintergrundfarben stehen als `theme-color` in `index.html:20-21` und als Prerender-Farben in `index.html:115-120` (Kopien, Befund 10.12).

### 2.2 Dokumentfarben (Inhalt, nicht Oberfläche)

Diese Werte landen im Dokument, im Export oder auf Papier und sind bewusst keine Theme-Token. Abweichungen zwischen Editor und Export sind Befund 10.2.

| Bedeutung                     | Wert                                | Verwendung                                                    | Quelle                                                                                             |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Markierung (Textmarker)       | #fde68a auf #111827                 | `.editor-rich mark`, HTML-Export                              | `style.css:382-383 · exportHtml.ts:111-112`                                                        |
| Link im Dokument              | `var(--ds-link)`                    | `.editor-rich a`                                              | `style.css:388`                                                                                    |
| Link im HTML-Export           | #1d4ed8                             | `.kodini-doc a`                                               | `exportHtml.ts:117`                                                                                |
| Zitat-Streifen Editor         | `3px solid var(--ds-border-strong)` | blockquote                                                    | `style.css:373`                                                                                    |
| Zitat-Streifen Export         | `rgba(161,161,170,.6)`              | `.kodini-doc blockquote`                                      | `exportHtml.ts:107`                                                                                |
| Standard-Textfarbe Export/PDF | #111827                             | wenn keine eigene Textfarbe gewählt                           | `pageRenderOptions.ts:49 · useRichText.ts:311`                                                     |
| Standard-Textfarbe Druck      | #000                                | `#print-root`                                                 | `style.css:295`                                                                                    |
| Papier                        | #ffffff                             | Druck, PDF, Export; Blatt im Editor ist `var(--ds-surface-1)` | `style.css:296 · renderPages.ts:226 · exportPdf.ts:86,105 · exportHtml.ts:92 · EditorArea.vue:475` |
| Platzhalter im Editor         | `var(--ds-text-3)`                  | `.editor-rich:empty::before`                                  | `EditorArea.vue:451-454`                                                                           |

### 2.3 Textfarb-Schnellwahl im Editor

Sieben feste Hex-Werte plus „Auto“ (`src/components/FormatBar.vue:27-34`), unverändert seit v1.

| Label-Key   | Wert             | Quelle             |
| ----------- | ---------------- | ------------------ |
| colorAuto   | '' (Theme-Farbe) | `FormatBar.vue:27` |
| colorBlack  | #111827          | `FormatBar.vue:28` |
| colorGray   | #6b7280          | `FormatBar.vue:29` |
| colorRed    | #b91c1c          | `FormatBar.vue:30` |
| colorOrange | #c2410c          | `FormatBar.vue:31` |
| colorGreen  | #15803d          | `FormatBar.vue:32` |
| colorBlue   | #1d4ed8          | `FormatBar.vue:33` |
| colorViolet | #7e22ce          | `FormatBar.vue:34` |

### 2.4 Partials (vendored, eigene Palette)

Unverändert seit v1. Die App entfernt ihre Hintergründe und setzt Text- und Linkfarben aus den Tokens mit `!important` (`style.css:127-137, 196-235`); Dropdowns bekommen `surface-1` zurück (`:139-147`). Der Cookie-Banner ist ausgenommen und behält seine Palette.

| Partial                | Hell                                                      | Dunkel                                                          | Quelle                                 |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| global-nav             | `--nav-bg rgba(249,242,213,.9)`, `--accent-color #014f99` | `--nav-bg rgba(26,32,44,.9)`, `--accent-color #6366f1` (Indigo) | `nav.html:21-30 · 36-45 · 51-60`       |
| site-footer            | bg #ffffff, Rahmen #d4c09a                                | bg #16161c, Link #AEAFB7, Hover #F2E28E                         | `footer.html:6-7,14-15,47,55`          |
| cookie-banner / -modal | bg #ffffff, Buttons #014f99/#003971                       | bg #1a1a1f, Text #fafafa, Link #F2E28E                          | `cookie-banner.html:11-12,21-23,69,89` |

## 3 Typografie

### 3.1 Schriftfamilien

| Rolle                                         | Stack                                                                                                                  | Quelle                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `--ds-font-sans` (Tailwind `font-sans`, Body) | `'Supreme', sans-serif`                                                                                                | `tokens-v2.css:49 · tailwind.config.js:84 · style.css:83` |
| `@font-face Supreme`                          | 400 / 500 / 700, `woff2` aus `./assets/fonts/`, `font-display: swap`; 600 wird vom Browser synthetisiert               | `style.css:35-58`                                         |
| `--ds-font-mono` (Tailwind `font-mono`)       | `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`; JetBrains Mono wird nirgends geladen (Befund 10.6) | `tokens-v2.css:50 · tailwind.config.js:85`                |
| Landing-Welt                                  | `var(--ds-font-sans)` auf `.landing-page` und per `:where(h1,h2,h3,p,a,span,li,button)`                                | `landing.css:17,23-25`                                    |
| Prerender-Skelett                             | `'Supreme', ui-sans-serif, system-ui, sans-serif`                                                                      | `index.html:113`                                          |
| Partials                                      | `'Supreme', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (unverändert)                           | `nav.html:111 · footer.html:10 · cookie-banner.html:16`   |
| Dokumentschrift (Tailwind `font-editor`)      | `var(--editor-font)`; Standard `ui-sans-serif, system-ui, sans-serif`; kein UI-Token                                   | `tailwind.config.js:87 · style.css:21`                    |
| Eingebaute Dokumentschriften                  | Sans / Serif / Mono aus der Registry, eigene Webfonts per `fonts.json`                                                 | `src/config/fonts.ts (unverändert seit v1)`               |

### 3.2 UI-Typoskala (Token)

Sieben Stufen mit Token-Namen; Tailwind bindet `text-xs…3xl` daran und hängt die Zeilenhöhe an die Stufe (`tailwind.config.js:89-97`). `text-base`, Pixelwerte und `leading-relaxed` sind per Test verboten (`designTokens.spec.ts:78-84`). Body-Grundgröße ist `--ds-text-lg` (`style.css:84`).

| Token                    | Größe                 | Zeilenhöhe | Typische Verwendung                                                                                      | Quelle                                                                                                |
| ------------------------ | --------------------- | ---------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `--ds-text-xs`           | 12px                  | 1.5        | Labels (`.fb-label`), Statusleiste, Menü-Hinweise, Tab-Aktionen, Badge, kbd, TOC-Titel                   | `tokens-v2.css:51 · FormatBar.vue:706 · StatusBar.vue:20 · UiKbd.vue:34 · features.css:29,191`        |
| `--ds-text-sm`           | 13px                  | 1.5        | `.tb-btn`, Menüeinträge, Eingaben, Tabs, UiButton sm, Callout, Toast, Select-Label                       | `tokens-v2.css:52 · EditorToolbar.vue:490 · DocumentTabs.vue:39 · UiButton.vue:133 · UiToast.vue:134` |
| `--ds-text-md`           | 14px                  | 1.5        | UiButton md, UiSelect, UiTextField, Nav-Links, Fließtext in Karten                                       | `tokens-v2.css:53 · UiButton.vue:67 · UiSelect.vue:116 · landing.css:77,314`                          |
| `--ds-text-lg`           | 16px                  | 1.5        | Body, UiButton lg, Dialog-/Panel-Titel, Hero-Untertitel, Landing-Buttons, FAQ-Frage, Drop-Overlay-Titel  | `tokens-v2.css:54 · style.css:84 · UiDialog.vue:149 · landing.css:138,160,357 · EditorView.vue:444`   |
| `--ds-text-xl`           | 20px                  | 1.25       | Logo, Feature-Titel, Blog-Titel                                                                          | `tokens-v2.css:55 · landing.css:61,306,528`                                                           |
| `--ds-text-2xl`          | 24px                  | 1.25       | Abschnittstitel, Schrittnummer, Stat-Zahl, Artikel-Titel; Untergrenze der Hero-Clamp                     | `tokens-v2.css:56 · landing.css:237,301 · features.css:78,309`                                        |
| `--ds-text-3xl`          | 32px                  | 1.25       | Obergrenze von `clamp(2xl, 4vw, 3xl)` für Hero-, CTA- und Features-Titel                                 | `tokens-v2.css:57 · landing.css:125,567 · features.css:38,566`                                        |
| Gewichte                 | 400 / 500 / 600 / 700 | —          | `font-medium` Buttons, Labels; `font-semibold` Primär, Titel, kbd; `font-bold` Überschriften, Fett-Knopf | `tokens-v2.css:58-61 · tailwind.config.js:98-103`                                                     |
| `--ds-tracking-tight`    | −0.01em               | —          | Hero-, Abschnitts-, CTA-Titel                                                                            | `tokens-v2.css:64 · landing.css:128,241,571`                                                          |
| Letterspacing ohne Token | .04 / .05 / .08em     | —          | Blog-Tag, Stat-Label; Badge; TOC-Titel (uppercase)                                                       | `landing.css:514 · features.css:89,32,194`                                                            |

### 3.3 Dokument-Typografie (CSS-Variablen `--editor-*`)

Unverändert seit v1: Editor, Vorschau, Druck und Export lesen dieselben Variablen; `useTheme.applyTypography` schreibt sie auf `<html>` (`useTheme.ts:76-100`). Standardwerte in `style.css:18-33`: Schrift Sans-Stack, 16px, Zeilenhöhe 1.7 (zur Laufzeit ganzzahlige px, `useTheme.ts:89-91`), Laufweite 0px, Gewicht 400, Ausrichtung left; `--editor-step` = Größe × Zeilenhöhe als Grundlinienraster.

| Element (`.editor-rich`)             | Größe                                        | Gewicht         | Abstand                                                | Quelle                        |
| ------------------------------------ | -------------------------------------------- | --------------- | ------------------------------------------------------ | ----------------------------- |
| h1 / h2 / h3                         | `min(1.6em \| 1.3em \| 1.15em, step × 0.98)` | 700 / 700 / 600 | line-height 1 Schritt, padding-top 1 Schritt           | `style.css:314-331`           |
| ul / ol                              | —                                            | —               | Einzug 1.6em, verschachtelt 1.3em, Marker disc/decimal | `style.css:332-355`           |
| blockquote                           | —                                            | kursiv          | padding-left 1em, 3px Streifen `border-strong`         | `style.css:369-376`           |
| mark / a                             | —                                            | —               | Radius 2px, padding 0 1px / `--ds-link` unterstrichen  | `style.css:380-395`           |
| Markdown-Vorschau h1/h2/h3           | 1.6em / 1.3em / 1.15em                       | 700 / 600 / 600 | 1.25 / 1.3 / 1.35                                      | `MarkdownPreview.vue:91-105`  |
| Markdown-Vorschau code / pre / table | 0.9em                                        | —               | `bg-surface-2`, `rounded-sm` / `rounded-md p-3`        | `MarkdownPreview.vue:124-141` |

## 4 Abstände & Größen

### 4.1 Token

| Gruppe               | Token                                                         | Wert                                                   | Quelle                                |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| Abstand (4er-Raster) | `--ds-space-1 … -16`                                          | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 px       | `tokens-v2.css:67-76`                 |
| Kontrollhöhen        | `--ds-control-sm / -md / -lg`                                 | 28 · 36 · 40 px                                        | `tokens-v2.css:91-93`                 |
| Zeilen, Leisten      | `--ds-row-height`, `--ds-topbar-height`, `--ds-player-height` | 44 · 56 · 60 px (nur row-height genutzt, Befund 10.12) | `tokens-v2.css:94-96 · style.css:496` |
| Icons                | `--ds-icon-sm / -md`, `--ds-icon-stroke`                      | 16 · 20 px · 1.75                                      | `tokens-v2.css:97-99`                 |
| Layout               | `--ds-container`, `--ds-gutter`, `--ds-gap`                   | 1200 · 24 · 20 px                                      | `tokens-v2.css:102-104`               |
| Rahmenstärke         | `--ds-border-width`                                           | 1px                                                    | `tokens-v2.css:83`                    |

Die Tailwind-Spacing-Skala (`p-2`, `gap-1.5` …) bleibt das Standard-4px-Raster von Tailwind und ist nicht an `--ds-space-*` gebunden; beide sind deckungsgleich bis 64px, nur die 6px-Stufe (`gap-1.5`, `py-1.5`) hat kein Token-Pendant.

### 4.2 Editor-App

| Ort                                       | Werte                                                                                                                             | Quelle                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Leisten (Tabs, Werkzeuge, Format, Status) | Tabs `px-2 gap-1`; Werkzeuge `px-2 py-1.5 gap-1`; Format `gap-x-3 gap-y-2 px-2 py-1.5`; Status `px-4 py-1.5 gap-x-4`              | `DocumentTabs.vue:33 · EditorToolbar.vue:275 · FormatBar.vue:199 · StatusBar.vue:20`                                      |
| Leisten-Knöpfe                            | `.tb-btn px-3 py-1.5` (ohne feste Höhe); `.seg-btn h-7 px-2`; Icon-Variante `h-7 w-7` mit `h-3.5 w-3.5`-SVG; Tab `px-3 py-2`      | `EditorToolbar.vue:490 · FormatBar.vue:716,288 · DocumentTabs.vue:39`                                                     |
| Felder in Leisten                         | `.fb-select h-7 px-2`; `.stepper h-7`; `.fr-input h-7 px-2`; Farbwähler `h-7 w-8`; Swatch `h-5 w-5`                               | `FormatBar.vue:709,508,490 · NumberStepper.vue:48 · FindReplace.vue:113`                                                  |
| Gruppen / Trenner                         | `.fb-group gap-1.5`; `.fb-divider mx-0.5 h-6 w-px`; Toolbar-Trenner `mx-1 h-5 w-px`                                               | `FormatBar.vue:703,712 · EditorToolbar.vue:381`                                                                           |
| Menüs / Popover                           | `p-1` (Speichern), `p-2` (Werkzeuge, Link, Bild-Link); Einträge `px-2 py-1.5`; Abstand zum Anker 4px, Rand 8px, Mindesthöhe 160px | `EditorToolbar.vue:301,496 · TransformMenu.vue:32 · FormatBar.vue:672 · EditorArea.vue:122 · useAnchoredMenu.ts:21,30,32` |
| Menübreiten                               | w-48 (192) · w-64 (256) · w-72 (288 CSS vs 280 JS)                                                                                | `EditorToolbar.vue:74,301 · TransformMenu.vue:14,32 · FormatBar.vue:146,672`                                              |
| Suche/Ersetzen                            | `px-4 py-3 gap-2`; Optionen `gap-3`                                                                                               | `FindReplace.vue:55,94`                                                                                                   |
| Markdown-Vorschau                         | Kopf `px-3 py-1.5`; Inhalt `px-6 py-5`; Absätze `mb-3`, Listen `pl-6`                                                             | `MarkdownPreview.vue:39,72,106-113`                                                                                       |
| Toasts                                    | Stapel `bottom-4 right-4 gap-2`, Breite `min(22rem, 100vw − 2rem)`; UiToast `max-width 400px`, padding `12 12 12 16`              | `ToastHost.vue:12 · UiToast.vue:104-105`                                                                                  |
| Editor-Textblock (Bildschirmmodus)        | `1.25rem max(1.5rem, calc((100% − 48rem)/2))`; Lesebreite 48rem                                                                   | `EditorArea.vue:446-448`                                                                                                  |
| Seitenmodus                               | Backdrop `padding 1rem`; Vorschau-Bühne `py-4`                                                                                    | `EditorArea.vue:466 · PagePreview.vue:161`                                                                                |
| Fokus-Modus                               | Pills `right-4 top-4` / `bottom-4`; Scroll-Freiraum unten 84px (Konstante)                                                        | `EditorView.vue:457,482,94`                                                                                               |
| Drop-Overlay                              | `p-6`; Karte `px-8 py-6`, Icon `h-9 w-9`                                                                                          | `EditorView.vue:429-434`                                                                                                  |
| Druck / PDF / HTML-Export                 | Seitenrand 18mm; HTML-Wrapper `margin 2rem auto; padding 0 1rem` (unverändert seit v1)                                            | `EditorView.vue · renderPages.ts · exportHtml.ts`                                                                         |

### 4.3 Ui-Bausteine

| Komponente         | Maße                                                                                                     | Quelle                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| UiButton           | sm 28 / md 36 / lg 40 px hoch; padding `0 12 \| 16 \| 20`; Icon 16px, gap 8                              | `UiButton.vue:59-61,129-139,147-149`         |
| UiIconButton       | 36×36 (md) / 28×28 (sm); SVG 20 / 16                                                                     | `UiIconButton.vue:52-53,67-69,106-114`       |
| UiSegmentedControl | Höhe 36 / 28; innen `padding 2px gap 2px`; Option `0 12 \| 0 8`                                          | `UiSegmentedControl.vue:100-103,114,151-157` |
| UiSelect           | Höhe 36 / 28; padding rechts `24 + 8` (Chevron 16px)                                                     | `UiSelect.vue:108-110,138,144-146`           |
| UiTextField        | Höhe 40 (`control-lg`), padding `0 12`, Label-Gap 4                                                      | `UiTextField.vue:64,78-81`                   |
| UiDialog           | Breite `min(440px, 100%)` / lg `min(720px, 100%)`; padding 20; Backdrop padding 16; Gap 12; Footer gap 8 | `UiDialog.vue:112,117,121,131,133,164`       |
| UiToast            | `max-width 400px`; gap 12; Statusstreifen links 3px                                                      | `UiToast.vue:103-107`                        |
| UiPanel            | Kopf `12 20`, Body `16 20 20`; Zähler 20px hoch                                                          | `UiPanel.vue:51,67,85`                       |
| UiCallout          | padding `8 12`, Icon 16px, gap 8                                                                         | `UiCallout.vue:70-71,81-82`                  |
| UiEmptyState       | padding `32 16`, Icon 40px, Text max 40ch                                                                | `UiEmptyState.vue:28,35-36,55`               |
| UiKbd              | min-width 24, Höhe 22, Unterkante 2px, gap 4                                                             | `UiKbd.vue:17,24-29`                         |

### 4.4 Landing / Features (Token-Werte)

| Ort                | Werte                                                                                                                                              | Quelle                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Abschnitte         | Hero / Features / Guide / FAQ / Blog / CTA `space-16 gutter` (64 24); ≥768 Hero `space-16 space-12`; ≤640 `space-12 space-5`                       | `landing.css:113,254,322,405,555,587,660`                                                            |
| Container-Breiten  | 1200 (Token) · 800 (FAQ, Features-Titel) · 700 (Hero-Text) · 600 / 550 / 500 (Untertitel, CTA) · 540 (Features-CTA) · 400 (Hero-Bild) · 320 (Bild) | `landing.css:48,323,119,562,142,249,606,224 · features.css:43,52,562`                                |
| Hero-Navigation    | `space-4 gutter`; ≤640 `space-3 space-4 space-1`; Nav-Gap `gutter`, ≤768 `space-5`                                                                 | `landing.css:37,635,69,622`                                                                          |
| Karten             | Feature-Card `space-8 space-6` (≤640 `space-6 space-5`); Grid-Gap `--ds-gap`; FAQ-Frage `space-5 space-6`; Blog-Body `space-6`                     | `landing.css:280,672,270,356,499`                                                                    |
| Buttons            | `space-3 space-6` (12 32), gap 8; large `space-4 space-8`; Hero-Actions gap 16                                                                     | `landing.css:157,200,147`                                                                            |
| Features-Seite     | Hero `space-16 gutter space-12`; Content-Grid `220px 1fr` gap 40; Artikel `space-8` (≤768 `space-6 space-4`); Grids gap 16 / 12 / 8                | `features.css:19,172-173,279,620,110,414,482`                                                        |
| Icon-Boxen         | Feature-Icon 56px, Artikel-Icon 40px (keine Token)                                                                                                 | `landing.css:289-290 · features.css:300-301`                                                         |
| LandingIcon-Größen | 14 · 16 · 20 · 22 · 24 · 28 (Prop `size`, Standard 24; Stroke 1.75 wie `--ds-icon-stroke`)                                                         | `LandingIcon.vue:23-25 · FeaturesView.vue:87,112,137,229 · LandingView.vue:50,143 · BlogView.vue:77` |

### 4.5 Touch-Ziele (`@media (pointer: coarse)`)

| Element                                          | Größe                                                      | Quelle                      |
| ------------------------------------------------ | ---------------------------------------------------------- | --------------------------- |
| `.tb-btn .seg-btn .fr-btn .menu-item .fb-select` | min-height var(--ds-control-lg) = 40; seg-btn min-width 40 | `style.css:483-493`         |
| `.stepper` / `.spin-btn`                         | var(--ds-row-height) = 44 / min-width 30                   | `style.css:495-501`         |
| Checkbox / Swatch / Farbwähler                   | 18×18 / 28×28 (control-sm) / 34×30                         | `style.css:503-515`         |
| Range-Slider                                     | Spur 8px, Daumen 20px (sonst 6 / 14)                       | `style.css:521-531,416,425` |
| Bild-Griff / -Knöpfe                             | 24×24 / 30×30 (sonst 14 / 20)                              | `EditorArea.vue:416-437`    |
| Formularfelder                                   | 16px Schrift (gegen iOS-Zoom)                              | `style.css:476-480`         |

Hinweis: `.fr-btn` in `style.css:486` existiert nicht mehr; Suche/Ersetzen nutzt jetzt `UiButton size="sm"` (28px), der von der Touch-Regel nicht erfasst wird (Befund 10.4).

## 5 Radien

Drei Token plus voll gerundet; `rounded-xl/2xl/3xl` sind per Test verboten (`designTokens.spec.ts:66-68`). Ohne Suffix ist `rounded` = sm (`tailwind.config.js:62`).

| Token                               | Wert                                            | Verwendung                                                                                                                                                              | Quelle                                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ds-radius-sm` (`rounded-sm`)     | 6px                                             | Leisten-Knöpfe, Felder, Menüeinträge, Swatches, Tab-Aktionen, UiButton/IconButton sm, UiKbd, Code, TOC-Link, Shortcut-Item                                              | `tokens-v2.css:79 · EditorToolbar.vue:490,496 · FormatBar.vue:709,716 · UiButton.vue:132 · UiKbd.vue:30 · features.css:210,491`                           |
| `--ds-radius-md` (`rounded-md`)     | 10px                                            | UiButton/IconButton md, UiSelect, UiTextField, UiSegmentedControl, UiToast, UiCallout, Dropdowns/Popover, Landing-Buttons, Icon-Boxen, Subsection/Category/Tag-Box, pre | `tokens-v2.css:80 · UiButton.vue:63 · UiToast.vue:108 · EditorToolbar.vue:301 · landing.css:163,291 · features.css:336,420,458 · MarkdownPreview.vue:129` |
| `--ds-radius-lg` (`rounded-lg`)     | 16px                                            | UiDialog, UiPanel, Drop-Overlay-Karte, Feature-/Blog-/Overview-Karten, FAQ, Hero-Bild, Hero-Stats, TOC-Box, Artikel-Abschnitt                                           | `tokens-v2.css:81 · UiDialog.vue:123 · UiPanel.vue:43 · EditorView.vue:432 · landing.css:227,279,338,431 · features.css:66,119,186,278`                   |
| `--ds-radius-full` (`rounded-full`) | 999px                                           | Fokus-/Zoom-Pills, Seitenzahl-Badge, Blog-Tag, Badge, Tag-Pill, Panel-Zähler, Scrollbar-Daumen, Nav-Unterstrich, Listenpunkte                                           | `tokens-v2.css:82 · EditorView.vue:457,482 · PagePreview.vue:168 · landing.css:95,520 · features.css:28,472 · style.css:247`                              |
| Ohne Token                          | 2 · 3 · 4 · 5 · 9999px · 50% · `calc(sm − 2px)` | Blatt im Seitenmodus; mark; Bild-Griff (Touch 5); Link-Badge; Bild-Knöpfe; Range-Daumen; Segment-Option sm                                                              | `EditorArea.vue:481,353,422,408,370,388 · style.css:384,426 · UiSegmentedControl.vue:158`                                                                 |
| Partials                            | 0.5 / 0.75 / 1rem, 26px, 50%                    | Cookie-Buttons, -Kategorien, -Modal, Toggle (unverändert)                                                                                                               | `cookie-banner.html:79,216,155,269,281`                                                                                                                   |

## 6 Schatten, Fokus & Motion

| Token                                    | Dunkel                                                                                                         | Hell                                                                                                 | Verwendung                                                                                                                                | Quelle                                                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ds-shadow-overlay` (`shadow-overlay`) | `0 8px 24px rgba(0,0,0,.35)`                                                                                   | `0 8px 24px rgba(20,33,58,.12)`                                                                      | UiDialog, UiToast, Dropdowns/Popover, Drop-Overlay-Karte, Fokus-/Zoom-Pills, Seitenzahl-Badge, Blatt im Seitenmodus                       | `tokens-v2.css:46,139 · UiDialog.vue:126 · UiToast.vue:111 · EditorToolbar.vue:301 · EditorView.vue:432,457,482 · PagePreview.vue:168 · EditorArea.vue:480` |
| `--ds-focus-ring` (`shadow-focus`)       | `0 0 0 2px surface-0, 0 0 0 4px accent` (in Light-Blöcken erneut deklariert, weil `var()` dort aufgelöst wird) | alle Ui-Bausteine, Felder, Landing-Links/-Buttons/-Karten, Range-Slider; `focus:ring-*` ist verboten | `tokens-v2.css:45,138,166,12-13 · UiButton.vue:84 · FormatBar.vue:709 · landing.css:102,196 · style.css:446 · designTokens.spec.ts:70-72` |
| Ohne Token                               | `0 1px 3px rgb(0 0 0/.3)` ×3, `0 1px 2px rgb(0 0 0/.35)`; Backdrop `rgba(0,0,0,.5)`                            | Bild-Griff, -Löschen, -Link, Link-Badge; Dialog-Hintergrund                                          | `EditorArea.vue:356,375,391,411 · UiDialog.vue:113`                                                                                       |
| Verboten per Test                        | `shadow-sm…2xl`, `backdrop-blur`, `bg-gradient-*`, `hover:scale`, `hover:-translate-y`                         | —                                                                                                    | `designTokens.spec.ts:60-64`                                                                                                              |

#### Motion

| Token                                             | Wert                                                                                   | Verwendung                                                                                   | Quelle                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `--ds-duration` (`transition-colors`, `duration`) | 150ms                                                                                  | Hover-Farben aller Buttons, Links, Karten; Toast ein/aus                                     | `tokens-v2.css:86 · tailwind.config.js:75 · UiButton.vue:72-75 · ToastHost.vue:37-39` |
| `--ds-duration-slow` (`duration-slow`)            | 250ms                                                                                  | Theme-Wechsel von Body, Dialog ein/aus (opacity + translateY 8px), FAQ auf/zu, FAQ-Icon 180° | `tokens-v2.css:87 · style.css:91-93 · UiDialog.vue:168-186 · landing.css:374,386-388` |
| `--ds-ease`                                       | `cubic-bezier(0.2, 0, 0, 1)`                                                           | Standard-Timing von Tailwind und allen Transitions                                           | `tokens-v2.css:88 · tailwind.config.js:78-80`                                         |
| Reduzierte Bewegung                               | global `0.01ms` für alle; zusätzlich `transition: none` auf Landing/Features-Elementen | —                                                                                            | `style.css:535-544 · landing.css:686-695 · features.css:650-655`                      |
| Verboten per Test                                 | `duration-<zahl>`, `animate-blob`                                                      | —                                                                                            | `designTokens.spec.ts:62,67`                                                          |

## 7 Breakpoints & Media Queries

Die Token kennen drei Breakpoints (phone 480, tablet 768, desktop 1024; `tokens-v2.json:474-480`, als `breakpointsV2` in `tokens-v2.ts:52-56`), aber nur als JSON/TS, nicht als CSS-Variable (Media Queries können keine `var()` lesen). Das CSS nutzt zusätzlich 640 (Befund 10.5).

| Query                              | Welt                          | Wirkung                                                                                                                                       | Quelle                                                                           |
| ---------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Tailwind `sm:` (≥640)              | Editor                        | Format-Trenner sichtbar; Shortcut-Grid 2-spaltig                                                                                              | `FormatBar.vue:712 · ShortcutHelp.vue:120`                                       |
| Tailwind `md:` (≥768)              | Editor                        | Markdown-Vorschau neben statt unter dem Editor                                                                                                | `EditorView.vue:401,416`                                                         |
| `(max-width: 640px)`               | Editor / Landing              | `.hbar-scroll` wird horizontal scrollende Zeile; Landing: Hero-Titel 2xl, Buttons volle Breite, Abschnitte `space-12 space-5`, Blog 1-spaltig | `style.css:455-470 · landing.css:633-684`                                        |
| `(min-width: 768px)`               | Landing                       | Hero zweispaltig, Bild sichtbar (max 400px)                                                                                                   | `landing.css:583-608`                                                            |
| `(max-width: 768px)`               | Landing / Features / Partials | Header gestapelt, Nav wischbar; Features: Hero, Overview, Artikel kompakter, Grids 1-spaltig, Shortcuts 2-spaltig                             | `landing.css:614-631 · features.css:592-633 · nav.html:299,585 · footer.html:84` |
| `(max-width: 1024px)`              | Features                      | TOC ausgeblendet, Content 1-spaltig, Category/Overview 2-spaltig (v1: 1100)                                                                   | `features.css:577-590`                                                           |
| `(max-width: 480px)`               | Features / Footer             | Category/Shortcuts 1-spaltig, Stat-Trenner weg                                                                                                | `features.css:635-648 · footer.html:96`                                          |
| `(pointer: coarse)`                | Editor                        | Touch-Ziele (Abschnitt 4.5)                                                                                                                   | `style.css:472-532 · EditorArea.vue:416-437`                                     |
| `print`                            | Editor                        | nur `#print-root` sichtbar                                                                                                                    | `style.css:263-298`                                                              |
| `(prefers-reduced-motion: reduce)` | alle                          | Abschnitt 6                                                                                                                                   | `style.css:535 · landing.css:686 · features.css:650`                             |
| `(prefers-color-scheme: dark)`     | Boot / Partials               | Initiales Theme ohne gespeicherte Wahl; Nav-Variablen                                                                                         | `index.html:31 · nav.html:34`                                                    |

## 8 Ebenen (z-index)

Fünf Token (`tokens-v2.css:107-111`), vier davon als Tailwind-Klassen (`tailwind.config.js:110-115`). Alle teleportierten Ebenen liegen in `#modal-portal`, dessen eigener Stacking-Context (`z-backdrop` = 1000) sie gemeinsam über die globale Navigation hebt, aber unter dem Cookie-Banner hält (`style.css:177-184 · App.vue:20`).

| z             | Token / Klasse                   | Element                                                                                   | Quelle                                                                                  |
| ------------- | -------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1             | —                                | Hero-Inhalt                                                                               | `landing.css:121`                                                                       |
| 5             | —                                | Frei platzierte Bilder                                                                    | `EditorArea.vue:329`                                                                    |
| 40            | Tailwind `z-40`                  | Fokus-Pill, Zoom-Pill (absolut im Editorbereich)                                          | `EditorView.vue:457,482`                                                                |
| 50            | Tailwind `z-50` / literal        | Drop-Overlay; Landing-Hero-Navigation (sticky)                                            | `EditorView.vue:429 · landing.css:36`                                                   |
| 100 / 200     | —                                | Globale Navigation / ihre Dropdowns (Partial)                                             | `nav.html:79,200`                                                                       |
| 500           | `--ds-z-topbar` (`z-topbar`)     | ungenutzt                                                                                 | `tokens-v2.css:107`                                                                     |
| 900           | `--ds-z-player`                  | ungenutzt (Playlist-Generator-Erbe)                                                       | `tokens-v2.css:108`                                                                     |
| 1000          | `--ds-z-backdrop` (`z-backdrop`) | `#modal-portal`; UiDialog-Backdrop                                                        | `style.css:183 · UiDialog.vue:108`                                                      |
| 1001          | `--ds-z-dialog` (`z-dialog`)     | Speichern-Menü, Werkzeuge-Menü, Link-Popover, Bild-Link-Popover (alle in `#modal-portal`) | `EditorToolbar.vue:301 · TransformMenu.vue:32 · FormatBar.vue:672 · EditorArea.vue:122` |
| 9999          | `--ds-z-toast` (`z-toast`)       | Toast-Stapel                                                                              | `ToastHost.vue:12`                                                                      |
| 10000 / 10001 | —                                | Cookie-Banner / -Modal (von der App erzwungen)                                            | `style.css:186-195 · cookie-banner.html:14,147`                                         |

## 9 Komponenten-Inventar

Alle Vue-SFCs unter `src/components` (inkl. `ui/` und `landing/`) und `src/views`. Varianten und Zustände sind aus Props, Klassen und `:class`-Bindungen abgelesen.

### 9.1 Ui-Bausteine (`src/components/ui/`)

Kopie aus dem Collage Maker ohne `UiFileList`; einzige Ergänzung ist `UiDialog size="lg"` (`ui/README.md:6-8`). Export über `ui/index.ts`, Typen in `ui/types.ts`. Jede Komponente hat einen Vitest unter `ui/__tests__/`.

#### UiButton `UiButton.vue`

- **Props:** `variant` primary · **secondary** (Standard) · ghost · danger; `size` sm · **md** · lg; `type`, `disabled`, `block`, `href` (→ `<a>`), `to` (→ RouterLink); Slot `icon` (`:31-51`)
- **Basis:** `surface-2`, `text`, Rahmen 1px transparent, `radius-md`, 36px, `text-md`, 500 (`:55-76`)
- **Varianten:** primary: accent / on-accent / 600, hover accent-hover · secondary: Rahmen border-strong, hover surface-3 · ghost: transparent, text-2, hover surface-2 + text · danger: transparent, text danger, hover surface-2 (`:92-127`)
- **Zustände:** focus-visible: focus-ring · disabled: opacity .45, not-allowed (`:82-90`)
- **Größen:** sm 28px / `radius-sm` / `text-sm`; lg 40px / `text-lg` (`:129-140`)
- **Einsatz:** FindReplace, FormatBar (Link-Popover), EditorArea (Bild-Link), MarkdownPreview, EditorView (Fokus), PreviewView, UiToast

#### UiIconButton `UiIconButton.vue`

- **Props:** `label` (Pflicht → aria-label + title), `variant` **ghost** · secondary · primary, `size` sm · **md**, `round`, `pressed` (→ aria-pressed), `disabled`, `type` (`:26-44`)
- **Basis:** 36×36, SVG 20px, transparent, `text-2`, `radius-md` (`:48-70`)
- **Varianten / Zustände:** ghost hover: surface-2 + text · secondary: surface-2 + border-strong · primary: accent / on-accent · sm: 28px, SVG 16, radius-sm · round: radius-full · pressed: Rahmen + Text accent · focus-ring · disabled .45 (`:72-124`)
- **Einsatz:** UiDialog (Schließen), UiToast, FindReplace, MarkdownPreview, EditorView (Zoom ±, `size="sm" round`)

#### UiPanel `UiPanel.vue`

- **Props:** `title`, `headingLevel` **2** · 3, `count`, `padded` (Standard true); Slot `actions`; `aria-labelledby` auf `<section>` (`:25-36`)
- **Stil:** `surface-1`, Rahmen `border`, `radius-lg`; Kopf mit Trennlinie; Zähler als Pill `surface-2 / text-2 / text-xs` (`:40-90`)
- **Einsatz:** im Texteditor derzeit ohne Verwendung (nur Test) **[Annahme]** aus Import-Suche

#### UiCallout `UiCallout.vue`

- **Props:** `type` **info** · success · warning · danger; `title`; Slot default; `role="note"` (`:57-63`)
- **Stil:** `surface-2`, `text-2`, `text-sm`, `radius-md`; Status nur im Icon (info/success/warning/danger), kein farbiger Rahmen (`:67-103`)
- **Einsatz:** im Texteditor derzeit ohne Verwendung **[Annahme]**

#### UiEmptyState `UiEmptyState.vue`

- **Props:** `title` (Pflicht), `text`; Slots `icon`, `action` (`:16-19`)
- **Stil:** zentriert, Icon 40px `text-3`, Titel `text-lg` 600, Text `text-sm` max 40ch (`:23-62`)
- **Einsatz:** im Texteditor derzeit ohne Verwendung **[Annahme]**

#### UiSegmentedControl `UiSegmentedControl.vue`

- **Props:** `v-model` (string, Pflicht), `options` `{ value, label, disabled? }`, `label` (Pflicht → aria-label), `size` sm · **md**; Radiogroup, Pfeiltasten/Home/End (`:31-95`)
- **Stil:** Rahmen `border`, `surface-0`, `radius-md`, 36px; Option transparent, `text-2`, `text-sm` 500, `radius-sm` (`:99-129`)
- **Zustände:** active: surface-1 + border-strong + text · hover: text · focus-ring · disabled .45 · sm: 28px, text-xs, radius calc(sm − 2px) (`:131-160`)
- **Einsatz:** im Texteditor derzeit ohne Verwendung; die Formatleiste behält `.seg-btn` **[Annahme]**

#### UiSelect `UiSelect.vue`

- **Props:** `v-model` (Pflicht), `options`, `label` (Pflicht), `id`, `size` sm · **md**, `inline`, `labelHidden`, `disabled`; `$attrs` → select (`:50-68`)
- **Stil:** natives Select ohne Appearance, `surface-2`, Rahmen `border-strong`, `radius-md`, 36px, Chevron-SVG 16px `text-3` (`:106-142`)
- **Zustände:** focus-visible: Rahmen accent + focus-ring · disabled .6 · sm: 28px, radius-sm, text-sm (`:124-149`)
- **Einsatz:** im Texteditor derzeit ohne Verwendung; die Formatleiste behält `.fb-select` **[Annahme]**

#### UiTextField `UiTextField.vue`

- **Props:** `v-model`, `label` (Pflicht), `id`, `type` text · search · email · url · password, `placeholder`, `hint`, `error` (→ aria-invalid, role=alert), `disabled`, `required` (Stern in danger) (`:33-57`)
- **Stil:** 40px (`control-lg`), `surface-2`, Rahmen `border-strong`, `radius-md`, Platzhalter `text-3` (`:77-95`)
- **Zustände:** focus-visible: Rahmen accent + focus-ring · error: Rahmen danger + Fehlertext · disabled .6 (`:97-125`)
- **Einsatz:** im Texteditor derzeit ohne Verwendung; Link-Felder nutzen rohe `<input>` mit Tailwind-Klassen (`FormatBar.vue:683 · EditorArea.vue:136`)

#### UiDialog `UiDialog.vue`

- **Props / Events:** `open`, `title` (Pflicht), `description`, `closeLabel`, `id`, `size` **md** (440px) · lg (720px), `teleportTo` (Standard `body`); Slots default, `footer`; Event `close` (Esc, Backdrop-Klick, Button); Fokus wandert hinein und zurück (`:55-101`)
- **Stil:** Backdrop `fixed inset-0 z-backdrop rgba(0,0,0,.5)`; Panel `surface-1`, Rahmen, `radius-lg`, `shadow-overlay`, padding 20, max-height `100vh − 32px` (`:105-134`)
- **Transition:** `ui-dialog`: opacity + translateY(8px), `duration-slow` (`:168-186`)
- **Einsatz:** ShortcutHelp (`size="lg"`, Teleport `#modal-portal`) (`ShortcutHelp.vue:111-119`)

#### UiToast `UiToast.vue`

- **Props / Events:** `message` (Pflicht), `type` **info** · success · error, `actionLabel`, `dismissLabel`, `dismissOnClick`; Events `action`, `dismiss`; error = `role="alert"`, sonst `status` (`:76-96`)
- **Stil:** `surface-1`, Rahmen, Statusstreifen links 3px (info / success / danger), Icon in Statusfarbe, `radius-md`, `shadow-overlay`, max 400px (`:100-153`)
- **Einsatz:** ToastHost: Stapel `fixed bottom-4 right-4 z-toast`, `aria-live="polite"`, Transition `toast` (translateY .5rem ein, translateX .75rem aus, `--ds-duration`) (`ToastHost.vue:12-54`)

#### UiKbd `UiKbd.vue`

- **Props:** `keys: string[]` (`:9-11`)
- **Stil:** min 24×22, `surface-2`, Rahmen `border-strong` mit 2px Unterkante, `radius-sm`, `text-xs` 600, Schrift inherit (nicht mono) (`:20-38`)
- **Einsatz:** ShortcutHelp, EditorView (Esc-Chip) (`ShortcutHelp.vue:135 · EditorView.vue:471`)

### 9.2 Editor-Shell (eigenes Markup auf Tokens)

#### DocumentTabs `src/components/DocumentTabs.vue`

- **Leiste:** `hbar-scroll border-b border-line bg-surface-2 px-2 gap-1` (`:33`)
- **Tab:** `px-3 py-2 text-sm border-b-2`; aktiv: border-accent text-accent · inaktiv: border-transparent text-ink-2 · hover: text-ink (`:39-44`)
- **Umbenennen-Input:** `w-28 rounded-sm border-accent bg-surface-1 text-sm focus-visible:shadow-focus` (`:52`)
- **Tab-Aktion ✎ / ✕:** `.tab-action rounded-sm px-1 text-xs text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-surface-3`; auf Touch immer sichtbar (`:66,75 · style.css:517-520`)
- **Neu-Button „+“:** `px-3 py-2 text-lg text-ink-3 hover:text-accent` (`:86`)

#### EditorToolbar `src/components/EditorToolbar.vue`

- **Leiste:** `hbar-scroll flex-wrap gap-1 border-b border-line bg-surface-1 px-2 py-1.5` (`:275`)
- **`.tb-btn`:** `rounded-sm px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors`; hover: bg-surface-2 · disabled: opacity-40 · aktiv (Toggle): text-accent · destruktiv: text-danger, disabled text-ink-3 (`:489-491,339,364,417,427`)
- **`.tb-start`:** Outline-Variante: `border border-accent font-semibold text-accent hover:bg-accent-soft` (`:492-494,460`)
- **Trenner:** `mx-1 h-5 w-px bg-line` (`:381,402,409`)
- **Dropdown „Speichern“:** Teleport `#modal-portal`, `fixed z-dialog w-48 rounded-md border border-line bg-surface-1 p-1 shadow-overlay`; Position via `useAnchoredMenu(192)` (`:74,297-334`)
- **`.menu-item`:** `block w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2`; Untertitel `text-xs text-ink-3`; Trennlinie `my-1 h-px bg-line` (`:495-497,312,323`)

#### TransformMenu `src/components/TransformMenu.vue`

- **Trigger:** eigene `.tb-btn`-Kopie mit `flex gap-1`, ohne disabled-Zustand (`:55-57`)
- **Menü:** `fixed z-dialog w-64 rounded-md p-2 shadow-overlay`, `useAnchoredMenu(256)`; Gruppentitel `text-xs font-semibold uppercase tracking-wide text-ink-3` (`:14,32,37`)
- **Eintrag:** eigene `.menu-item`-Kopie ohne Hover; Hover im Template `hover:bg-accent-soft hover:text-accent` (anders als EditorToolbar) (`:44,58-60`)

#### FormatBar `src/components/FormatBar.vue`

- **Leiste:** `hbar-scroll flex-wrap gap-x-3 gap-y-2 border-b border-line bg-surface-2 px-2 py-1.5` (`:199`)
- **`.fb-group` / `.fb-label`:** `flex items-center gap-1.5` / `text-xs font-semibold text-ink-2` (`:702-707`)
- **`.fb-select`:** `h-7 rounded-sm border border-line-strong bg-surface-1 px-2 text-xs text-ink-2`; focus: border-accent · focus-visible: shadow-focus; Schriftauswahl `min-w-[10rem]` (`:708-710,205`)
- **`.fb-divider`:** `mx-0.5 hidden h-6 w-px bg-line sm:block` (`:711-713`)
- **`.seg-btn`:** `inline-flex h-7 rounded-sm border border-line-strong px-2 text-xs text-ink-2`; Icon-Variante `h-7 w-7` mit 16er-SVG; hover: bg-surface-3 · .seg-active: border-accent bg-accent-soft text-accent · aria-pressed (`:715-720,288-337`)
- **Farb-Swatch `.fb-swatch`:** `h-5 w-5 rounded-sm border transition-colors`; gewählt: border-accent ring-2 ring-accent · sonst: border-line-strong; Auto-Swatch zeigt „A“ in `text-xs text-ink-3` (`:490-504`)
- **`.fb-color` / `.zoom-range` / Checkbox:** `h-7 w-8 rounded-sm border border-line-strong p-0.5` / `h-1 w-24 accent-accent` / `accent-accent` (`:508,721-723,647`)
- **Link-Popover:** Teleport `#modal-portal`, `fixed z-dialog w-72 rounded-md p-2 shadow-overlay`, `useAnchoredMenu(280)`; Eingabe roh mit `rounded-sm border-line-strong text-sm focus:border-accent focus-visible:shadow-focus`; `UiButton size="sm"` danger („Link entfernen“) + primary (`:146,668-698`)

#### NumberStepper `src/components/NumberStepper.vue`

- **Rahmen `.stepper`:** `h-7 rounded-sm border border-line-strong bg-surface-1`; Wert `text-xs tabular-nums text-ink-2` (`:48-53`)
- **`.spin-btn`:** `w-5 bg-surface-2 text-ink-3`; hover: bg-surface-3 text-ink · disabled: opacity-30; Trenner `border-line-strong` (`:102-104,58,80`)

#### FindReplace `src/components/FindReplace.vue`

- **Panel:** `border-b border-line bg-surface-2 px-4 py-3 gap-2` (`:55`)
- **`.fr-input`:** `h-7 rounded-sm border border-line-strong bg-surface-1 px-2 text-sm text-ink`; focus: border-accent · focus-visible: shadow-focus (`:111-115`)
- **Buttons:** `UiButton size="sm" variant="secondary"` (‹ › Ersetzen, Alle ersetzen); `UiIconButton size="sm"` Schließen (`:67-70,90-91`)
- **Status / Optionen:** `text-xs text-ink-3`; Checkbox-Labels `text-xs text-ink-2`, `accent-accent` (`:69,94-104`)

#### EditorArea `src/components/EditorArea.vue`

- **Modi:** Bildschirm: .plain-scroll + .plain-pad · Seite: .page-backdrop › .page-canvas › .page-sheet (`:11-15`)
- **`.editor-text`:** alle `--editor-*`-Variablen; Platzhalter per `::before` in `text-3` (`:305-316,451-454`)
- **Blatt:** `surface-1`, `shadow-overlay`, Radius 2px; Backdrop `surface-2`, padding 1rem; Umbruchlinie `1px dashed border-strong` (`:462-491`)
- **Bild-Rahmen `.img-frame`:** .img-selected: outline 2px accent · .img-handle 14px accent, 2px surface-1 · .img-del 20px danger / #fff · .img-link-btn 20px surface-1 / .img-link-active accent · .img-linkbadge 18px accent; Schatten `rgb(0 0 0/.3)` literal; Touch 24/30px (`:327-437`)
- **Bild-Link-Popover:** wie Link-Popover der FormatBar (`w-64`), `UiButton` danger/primary (`:118-151`)

#### MarkdownPreview `src/components/MarkdownPreview.vue`

- **Panel:** `bg-surface-1`; Kopf `border-b border-line px-3 py-1.5`, Titel `text-xs font-semibold uppercase tracking-wide text-ink-2` (`:38-40`)
- **Buttons:** `UiButton size="sm" variant="ghost"` (Kopieren), `UiIconButton size="sm"` (Schließen) (`:44-53`)
- **`.md-preview`:** Typografie aus `--editor-*`; h1–h3 `text-ink`, p/Listen `text-ink-2`, a `text-link`, hr `border-line`, code/pre `bg-surface-2`, blockquote `border-l-4 border-accent`, Tabellen `border-line-strong` (`:85-149`)

#### PagePreview `src/components/PagePreview.vue`

- **Viewport:** `border-l border-line bg-surface-2`; Bühne `py-4` (`:157-161`)
- **Seitenzahl-Badge:** `absolute bottom-3 right-3 rounded-full border border-line bg-surface-1 px-3 py-1 text-xs font-medium text-ink shadow-overlay` (`:168`)

#### StatusBar `src/components/StatusBar.vue`

- **Leiste:** `hbar-scroll gap-x-4 gap-y-1 border-t border-line bg-surface-2 px-4 py-1.5 text-xs text-ink-3` (`:20`)
- **Format-Chip:** `ml-auto rounded-sm bg-surface-3 px-2 py-0.5 font-medium text-ink-2` mit 16er-SVG `h-3 w-3` (`:30-33`)

#### ToastHost · ShortcutHelp

- **ToastHost:** nur noch Stapel + Transition, Optik in `UiToast` (`ToastHost.vue:12-54`)
- **ShortcutHelp:** `UiDialog size="lg"`; Grid `gap-x-8 gap-y-5 sm:grid-cols-2`; Gruppentitel `text-xs font-semibold uppercase tracking-wide text-ink-3`; Zeile `text-sm text-ink-2` + `UiKbd` (`ShortcutHelp.vue:111-135`)

#### EditorView `src/views/EditorView.vue`

- **Seite:** `relative flex h-full flex-col bg-surface-0 text-ink`; Layout Editor | Markdown ab `md:` mit `border-line` (`:373,401-416`)
- **Drop-Overlay:** `absolute inset-0 z-50 bg-accent-soft p-6`; Karte `rounded-lg border-2 border-dashed border-accent bg-surface-1 px-8 py-6 shadow-overlay`, Icon `h-9 w-9 text-accent`, Titel `text-lg font-semibold` (`:429-445`)
- **Fokus-Pill „Verlassen“:** `absolute right-4 top-4 z-40 rounded-full border border-line bg-surface-1 px-4 py-2 text-sm font-medium text-ink shadow-overlay hover:bg-surface-2` + `UiKbd ['Esc']` (`:457-471`)
- **Zoom-Pill:** `absolute bottom-4 left-1/2 z-40 rounded-full border border-line bg-surface-1 px-2 py-1.5 shadow-overlay`; `UiIconButton size="sm" round` ±, Wert `min-w-[3.25rem] text-sm font-medium tabular-nums`, Trenner `h-5 w-px bg-line`, `UiButton size="sm" variant="ghost"` Reset (`:482-526`)

#### PreviewView `src/views/PreviewView.vue`

- **Kopf:** `border-b border-line bg-surface-1 px-4 py-2`; Titel `text-sm font-semibold text-ink`, Untertitel `text-xs text-ink-3` (`:82-88`)
- **Buttons:** `UiButton size="sm" variant="secondary"` (Zurück) / `variant="primary"` (Drucken); Seite `bg-surface-2` (`:80,93-101`)

### 9.3 Landing / Features / Blog

#### LandingLayout `src/components/landing/LandingLayout.vue` · `landing.css:11-104`

- **`.landing-page`:** `surface-0`, `text`, Supreme, `overflow-x: clip` (`landing.css:11-21`)
- **`.landing-header`:** `sticky top 0 z 50`, `surface-1`, 1px `border`; .scrolled: border-strong (`landing.css:33-45`)
- **`.header-logo`:** `text-xl 700 text` (`landing.css:56-64`)
- **`.nav-link`:** `text-md 500 text-2`; hover / .active: text · .active::after: 2px accent, radius-full · focus-visible: focus-ring (`landing.css:72-104`)

#### LandingView `src/views/LandingView.vue` · `landing.css:106-581`

- **`.hero`:** `min-height calc(100vh − 130px)`, flach, Hero-Bild je Theme mit 1px Rahmen und `radius-lg` (`landing.css:107-116,221-228`)
- **`.btn-primary` / `.btn-secondary`:** accent / on-accent bzw. surface-2 + border-strong; `text-lg 600`, `radius-md`; hover: accent-hover / surface-3 · focus-visible: focus-ring · .btn-large (`landing.css:153-201`)
- **`.feature-card`:** `surface-1`, 1px Rahmen, `radius-lg`; hover: border-strong; Icon-Box 56px `accent-soft / accent`, `radius-md`; Step-Variante zeigt Nummer `text-2xl 700` (`landing.css:276-303`)
- **`.faq-item`:** `surface-1`, Rahmen, `radius-lg`; hover: border-strong · .active: Rahmen accent, Icon 180°, Antwort max-height 300px · focus-visible: focus-ring (`landing.css:335-401`)
- **`.cta-section`:** `surface-1` mit Oberkante `border`, zentriert, Titel `clamp(2xl, 4vw, 3xl)` (`landing.css:554-580`)

#### BlogView `src/views/BlogView.vue` · `landing.css:403-551`

- **`.blog-grid`:** `repeat(auto-fit, minmax(300px, 560px))` zentriert, gap `--ds-gap` (`landing.css:417-423`)
- **`.blog-card`:** wie Feature-Card, `overflow hidden`; hover: border-strong · focus-visible: focus-ring (`landing.css:425-444`)
- **`.blog-card-media`:** 16:9, `surface-2`; Fallback `.blog-card-sheet` (flaches Blatt mit accent-Überschrift und border-strong-Linien) (`landing.css:446-493`)
- **`.blog-card-tag`:** Pill `accent-soft / accent`, `text-xs 600 uppercase`; Link `text-link 600` (`landing.css:511-551`)

#### FeaturesView `src/views/FeaturesView.vue` · `features.css`

- **`.blog-badge`:** Pill `accent-soft` mit 1px `accent`-Rahmen, `text-xs 600 uppercase` (`features.css:23-35`)
- **`.hero-stats`:** `surface-1`, Rahmen, `radius-lg`; Stat-Zahl `text-2xl 700 accent`, Label `text-xs text-3 uppercase`, Trenner 1×36px (`features.css:55-96`)
- **`.overview-card`:** 4-spaltig → 2 → 1; `surface-1`, `radius-lg`; hover: border-strong · focus-visible: focus-ring (`features.css:107-134`)
- **`.toc-link` / `.toc-cta`:** `radius-sm text-sm text-2`; hover: surface-2 + text · .active: accent-soft + accent + 600; CTA accent / on-accent `radius-md`, hover accent-hover (`features.css:205-265`)
- **`.article-section`:** `surface-1`, Rahmen, `radius-lg`, padding 32; .unique-section: border-strong · .summary-section: Rahmen accent; Kopf mit 40px Icon-Box `accent-soft` (`features.css:275-306,514-521`)
- **`.feature-list`:** 5px accent-Punkt; --grid · --inline · --spaced · --highlight (6px, text) (`features.css:348-399`)
- **`.subsection-block` / `.category-card` / `.highlight-box` / `.tag-box`:** alle `surface-2`, Rahmen, `radius-md`; Kategorie-Titel `text-sm 600 accent` (`features.css:333-338,402-429,455-460`)
- **`.tag-pill` / `.shortcut-item` / `.shortcut-key`:** `surface-3` + border-strong Pill; `surface-2 radius-sm`; Key `surface-3`, `font-mono text-sm`, `radius-sm` (`features.css:468-505`)

#### LandingIcon `src/components/landing/LandingIcon.vue`

- **System:** Inline-SVG-Icons im 24er-Raster, `stroke currentColor`; Props `size` (Standard 24) und `strokeWidth` (Standard 1.75, wie `--ds-icon-stroke`) (`:23-37`)
- **Verwendete Größen:** 14 · 16 · 20 · 22 · 24 · 28

### 9.4 Globale Partials (vendored)

#### global-nav · site-footer · cookie-banner `partials/*.html`

- **Einbindung:** Build-Zeit über `<!--INJECT:name-->` (`index.html:171,219-220`); Nav zur Laufzeit durch die Live-Version ersetzt (`index.html:165-170 · main.ts:13`)
- **Angleichung durch die App:** Hintergründe transparent, Text `--ds-text`, Links `--ds-link` / hover `--ds-accent`, Dropdowns `surface-1`, Toggle-Icons über `filter`; alles `!important`, Cookie-Elemente ausgenommen (`style.css:127-175,196-235`)
- **Unverändert:** eigene `--nav-*`-Variablen, Indigo-Akzent dunkel, eigene Schriftstacks, Radien und Schatten (Abschnitt 2.4, 5)

## 10 Hartkodierte & inkonsistente Werte

Sortiert nach Schwere. „Warnung“ heißt: Wartungsrisiko oder sichtbare Abweichung von den Regeln des Systems. „Hinweis“ heißt: kosmetisch oder leicht zu beheben. Kritische Befunde aus v1 sind alle erledigt.

#### **Warnung** 10.1 Partials mit fremder Palette, per `!important` überstimmt

Die drei vendored Partials sind seit v1 unverändert (Indigo `#6366f1`, `partials/nav.html:45,60`; Footer `#16161c`, `footer.html:14`). Die App neutralisiert sie mit 30 Zeilen `!important`-Selektoren (`style.css:127-175,196-235`). Das funktioniert, ist aber fragil: Jede Änderung der Live-Navigation auf dem Server kann Farben durchlassen, und der Cookie-Banner behält seine eigene Palette komplett. Nicht im Repo lösbar; die Partials müssten selbst `--ds-*` lesen (die Light-Spiegelung auf `:root[data-theme='light']` ist dafür bereits vorbereitet, `tokens-v2.css:142`).

#### **Warnung** 10.2 Dokumentfarben: Editor, Export und Druck weichen ab

- Link: Editor `var(--ds-link)` (`style.css:388`) vs HTML-Export `#1d4ed8` (`exportHtml.ts:117`)
- Zitat-Streifen: Editor `var(--ds-border-strong)` (`style.css:373`) vs Export `rgba(161,161,170,.6)`, das alte Tailwind-zinc-400 (`exportHtml.ts:107`); Export hat zudem `margin 0.2em 0` (`exportHtml.ts:104`) statt 0 (`style.css:370`), was das Grundlinienraster verschiebt
- Standard-Text: Export/PDF `#111827` (`pageRenderOptions.ts:49 · useRichText.ts:311`) vs Druck `#000` (`style.css:295`) vs Store-Kommentar `#1f2937` (`stores/editor.ts:53`)
- Marker `#fde68a` / `#111827` doppelt gepflegt (`style.css:382-383 · exportHtml.ts:111-112`), laut Kommentar bewusst (`style.css:378-380`)

#### **Warnung** 10.3 Zwei lokale Klassen doppelt definiert

- `.tb-btn` in `EditorToolbar.vue:489-491` und `TransformMenu.vue:55-57` (Kopie ohne `disabled`-Zustand)
- `.menu-item` in `EditorToolbar.vue:495-497` (hover `surface-2`) und `TransformMenu.vue:58-60` (ohne Hover; im Template `hover:bg-accent-soft hover:text-accent`, `:44`). Zwei Menüs, zwei Hover-Optiken.
- Von den fünf Button-Definitionen aus v1 sind drei durch `UiButton` ersetzt (`.fr-btn`, `.pv-btn`, Primär-Button).

#### **Warnung** 10.4 Kontrollhöhen in den Leisten uneinheitlich

Die Tokens kennen 28 / 36 / 40 px. In den Leisten stehen `h-7` = 28 (`.seg-btn`, `.fb-select`, `.stepper`, `.fr-input`, `FormatBar.vue:709,716 · NumberStepper.vue:48 · FindReplace.vue:113`) neben `.tb-btn` ohne feste Höhe (`py-1.5 text-sm` ≈ 31–32 px, `EditorToolbar.vue:490`) und Tabs `py-2 text-sm` (`DocumentTabs.vue:39`). `UiButton size="sm"` (28) und `UiIconButton size="sm"` (28) sitzen daneben in FindReplace und der Zoom-Pill; UiTextField ist 40. Die Touch-Regel vergrößert nur die alten Klassen, nicht die Ui-Bausteine (`style.css:483-493`), und listet mit `.fr-btn` eine Klasse, die es nicht mehr gibt (`style.css:486`).

#### **Warnung** 10.5 Breakpoints: Token und CSS passen nicht zusammen

Token: 480 / 768 / 1024 (`tokens-v2.json:474-480`). CSS: 640 (`style.css:455 · landing.css:633`), 768, 1024, 480 plus Tailwind `sm/md` (640/768). Der Wert 640 hat kein Token; `breakpointsV2` wird außerhalb der Token-Dateien nirgends importiert. Gegenüber v1 (sechs Werte) ist die Streuung kleiner geworden: 600 und 1100 sind weg.

#### **Warnung** 10.6 Mono-Schrift aus den Tokens wird nicht geladen

`--ds-font-mono` beginnt mit `'JetBrains Mono'` (`tokens-v2.css:50`), aber es gibt weder `@font-face` noch einen Link dafür. Shortcut-Keys (`features.css:500`) und Code in der Markdown-Vorschau (`MarkdownPreview.vue:125`) fallen still auf `ui-monospace` zurück. Entweder laden oder den Token-Stack in der Quelle (Playlist Generator) anpassen.

#### **Warnung** 10.7 Supreme 600 wird synthetisiert

Geladen sind 400 / 500 / 700 (`style.css:37-58`); `--ds-weight-semibold` = 600 ist das Gewicht für Primär-Buttons, Dialog-/Panel-Titel, Badges, kbd und alle Landing-Titel (`UiButton.vue:95 · UiDialog.vue:150 · landing.css:161,307`). Der Browser interpoliert es laut Kommentar aus 500/700 (`style.css:35-36`); tatsächlich wählt er den nächsten geladenen Schnitt (500 oder 700), echte Interpolation gibt es nur bei variablen Fonts **[Annahme]**. Der Test prüft nur 400/500/700 (`designTokens.spec.ts:112-118`).

#### **Warnung** 10.8 `docs/DESIGN-SYSTEM.md` beschreibt den alten Stand

Die mit PR #72 eingecheckte Markdown-Fassung (Commit `f09f3b3`, „drei Stilwelten“, `zinc`-Token) wurde von PR #73 am selben Tag überholt und blieb im Repo als aktuelle Doku verlinkt (`README.md:227`). Erledigt mit dieser Fassung (Version 2); offen bleibt, dass die Markdown-Datei bei jeder neuen Artifact-Version manuell nachgezogen werden muss.

#### **Hinweis** 10.9 Literale außerhalb der Token

- Schatten `0 1px 3px rgb(0 0 0/.3)` ×3 und `0 1px 2px rgb(0 0 0/.35)` an Bild-Griff und -Knöpfen (`EditorArea.vue:356,375,391,411`); `#fff` auf dem Löschknopf (`:372`) statt `white`/`on-accent`
- Dialog-Backdrop `rgba(0,0,0,.5)` (`UiDialog.vue:113`), identisch in der Quelle (Collage Maker)
- Letterspacing `.04 / .05 / .08em` ohne Token (`landing.css:514 · features.css:32,89,194`); Token kennt nur `tracking-tight`

#### **Hinweis** 10.10 Magische Zahlen

- Layout: Hero `calc(100vh − 130px)` (`landing.css:109`), `scroll-margin-top 80px` (`:263`), TOC `top 90px` (`features.css:180`), FAQ `max-height 300px` (`landing.css:392`), `FOCUS_BAR_INSET = 84` (`EditorView.vue:94`), Menü-Mindesthöhe 160 (`useAnchoredMenu.ts:32`)
- Größen ohne Token: Icon-Boxen 56 / 40 (`landing.css:289 · features.css:300`), UiEmptyState-Icon 40 (`UiEmptyState.vue:35`), UiKbd 24×22 (`UiKbd.vue:24-25`), Panel-Zähler 20 (`UiPanel.vue:67`), Dialog 440 / 720 (`UiDialog.vue:117,133`), Toast 400 (`UiToast.vue:104`), Container 800 / 700 / 600 / 550 / 540 / 500 / 400 / 320 (Abschnitt 4.4)

#### **Hinweis** 10.11 Ebenen gemischt aus Token und Tailwind-Standard

Dropdowns und Toasts nutzen `z-dialog` / `z-toast`; Drop-Overlay `z-50` und die Pills `z-40` (`EditorView.vue:429,457,482`) sowie die Landing-Navigation `z-index: 50` (`landing.css:36`) stammen aus der Tailwind-Standardskala. `--ds-z-topbar` (500) und `--ds-z-player` (900) sind ungenutzt. Der Shortcut-Dialog liegt jetzt durch `#modal-portal` korrekt über der globalen Navigation (v1-Befund erledigt).

#### **Hinweis** 10.12 Kopien von Token-Werten und ungenutzte Token

- `theme-color` (`index.html:20-21`) und Prerender-Farben (`index.html:115-120`) wiederholen `surface-0` / `text` als Literal; kein Test sichert die Gleichheit
- Der Light-Block steht zweimal vollständig (`tokens-v2.css:115-168`), laut Kommentar bewusst für Partials (`:8-10`); jede Änderung muss an zwei Stellen erfolgen (und in der Quelle)
- Playlist-Generator-Erbe ohne Verwendung: `--ds-topbar-height`, `--ds-player-height`, `--ds-z-player` (`tokens-v2.css:95-96,108`)

#### **Hinweis** 10.13 Tailwind-Arbitrary-Values und doppelte Popover-Breite

`min-w-[10rem]` (`FormatBar.vue:205`), `min-w-[3.25rem]` (`EditorView.vue:502`), `w-[min(22rem,calc(100vw-2rem))]` (`ToastHost.vue:12`). Link-Popover: `useAnchoredMenu(280)` (`FormatBar.vue:146`) vs `w-72` = 288px (`:672`); Speichern 192/`w-48` und Werkzeuge 256/`w-64` stimmen überein. `tokens-v2.ts` (`themeColorsV2`, `breakpointsV2`, `controlSizesV2`) wird nur vom Kontrast-Test genutzt.

#### **Hinweis** 10.14 Sechs Ui-Bausteine ohne Verwendung

`UiPanel`, `UiCallout`, `UiEmptyState`, `UiSegmentedControl`, `UiSelect`, `UiTextField` werden im Texteditor nicht importiert **[Annahme]** aus Import-Suche über `src/`. Die Formatleiste behält `.seg-btn` und `.fb-select` (bewusst, wegen `aria-pressed`, Anker-Refs und `@mousedown.prevent`, `ui/README.md:47-49`); die Link-Eingaben könnten `UiTextField` nutzen (`FormatBar.vue:683 · EditorArea.vue:136`).

## 11 Methodik & Quellen

- Stand `origin/main` = `0a9208b` (2026-10-06 18:03 +0200). Verglichen mit v1 (`f09f3b3`) per `git diff --stat`: 63 Dateien.
- Gelesen: `src/design-system/*` (README, tokens-v2.css/ts, JSON-Ausschnitte), `tailwind.config.js`, `src/style.css`, `index.html`, `src/styles/landing.css`, `features.css`, alle 11 Ui-Bausteine, alle SFCs unter `src/components` und `src/views` (Templates per Klassen-Grep, Style-Blöcke vollständig), `useTheme.ts`, `useDocumentTheme.ts`, `useAnchoredMenu.ts`, `App.vue`, `main.ts`, `eslint.config.js`, `tests/designTokens.spec.ts`, `tests/buttonContrast.spec.ts`, `exportHtml.ts:90-120`, `partials/*.html` (nur Palette-Zeilen, unverändert seit v1).
- Zählungen (Token, Hex, rgba, Imports) per `grep` über `src/` und `index.html` ohne `src/design-system/` und Tests; als **[Annahme]** markiert.
- Tests `designTokens`, `buttonContrast`, `tokens-v2` auf `0a9208b` ausgeführt: 40/40 grün.
- Nicht im Browser gerendert; Aussagen zur Schriftsynthese (10.7) und zur Nutzung der Ui-Bausteine (10.14) sind aus dem Code abgeleitet.
- Partials sind nur die vendored Fallbacks; die Live-Version vom Server kann abweichen (`index.html:165-170`).

---

_Design-System-Extraktion · Repo KodiniTools/Text-Editor · Version 2 · Commit 0a9208b · 2026-10-12 · Neue Fassungen erscheinen unter demselben Artifact-Link. v1 (f09f3b3, 2026-10-06) beschrieb den Stand vor der Migration auf Tokens v2._
