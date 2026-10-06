# Design-System des Kodini Texteditors

Extrahiert aus dem Repository `KodiniTools/Text-Editor`. Jeder Wert nennt seine Quelle als `datei:zeile`.
Werte, die nicht direkt im Code stehen, sondern abgeleitet sind, tragen die Markierung **[Annahme]**.

|         |                                           |
| ------- | ----------------------------------------- |
| Stand   | 2026-10-06                                |
| Commit  | `f09f3b3` (main, Merge #71)               |
| Stack   | Vue 3.4 · Tailwind 3.4 · Vite 5 · Pinia 2 |
| Version | 1 (Erstfassung)                           |

Inhalt:

1. [Überblick & Architektur](#1-überblick--architektur)
2. [Farben](#2-farben)
3. [Typografie](#3-typografie)
4. [Abstände](#4-abstände)
5. [Radien](#5-radien)
6. [Schatten](#6-schatten)
7. [Breakpoints & Media Queries](#7-breakpoints--media-queries)
8. [Ebenen (z-index)](#8-ebenen-z-index)
9. [Komponenten-Inventar](#9-komponenten-inventar)
10. [Hartkodierte & inkonsistente Werte](#10-hartkodierte--inkonsistente-werte)
11. [Methodik & Quellen](#11-methodik--quellen)

---

## 1 Überblick & Architektur

Die Oberfläche besteht aus **drei Stilwelten**, die unterschiedlich gebaut sind. Fast alle Inkonsistenzen in Abschnitt 10 folgen daraus.

| Kennzahl                                         | Wert                                     |
| ------------------------------------------------ | ---------------------------------------- |
| Stilwelten                                       | 3 (Editor · Landing/Features · Partials) |
| Farb-Token in `style.css`                        | 14 (3 Akzent + 11 Neutral)               |
| verschiedene Hex-Farben in `src/` + `index.html` | 32                                       |
| verschiedene `rgba()`-Literale in `src/`         | ~60                                      |
| Vue-SFCs im Inventar                             | 17                                       |
| Befunde                                          | 17 (3 kritisch, 9 Warnung, 5 Hinweis)    |

| Stilwelt                      | Technik                                                                                                                                   | Dateien                                                                                                                                  | Theme-Schalter                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Editor-App**                | Tailwind-Utilities + `@apply` in scoped Styles; Farben als CSS-Variablen (RGB-Tripel)                                                     | `tailwind.config.js`, `src/style.css`, alle `src/components/*.vue`, `src/views/EditorView.vue`, `PreviewView.vue`                        | `html.dark` (`tailwind.config.js:3`)                              |
| **Landing / Features / Blog** | Handgeschriebenes CSS, 1:1 vom Visualizer übernommen; Dunkel ist Standard, Hell per Attribut; Hex-/rgba-Literale                          | `src/styles/landing.css`, `src/styles/features.css`, `views/LandingView.vue`, `FeaturesView.vue`, `BlogView.vue`, `components/landing/*` | `[data-theme='light']` (`landing.css:724`, `features.css:663`)    |
| **Globale Partials**          | Vendored HTML mit eigenem `<style>`, zur Laufzeit vom Live-Server ersetzt (`index.html:150-156`); eigene CSS-Variablen und eigene Palette | `partials/nav.html`, `footer.html`, `cookie-banner.html`                                                                                 | `[data-theme="dark"]` + `prefers-color-scheme` (`nav.html:34,50`) |

### Theme-Mechanik

- `useTheme` setzt beide Schalter gleichzeitig: `classList.toggle('dark')` und `data-theme` (`src/composables/useTheme.ts:49-50`). Der Modus kommt aus `settings.theme` (`'light' | 'dark' | 'system'`) und wird mit der globalen Navigation über `localStorage['theme']` geteilt (`useTheme.ts:7,38,55`).
- Ein Wechsel aus der Navigation wird per `MutationObserver` auf `data-theme` zurückgespiegelt (`useTheme.ts:64-70`).
- Komponenten lesen das Theme über `useDocumentTheme()`; fehlendes Attribut gilt dort als dunkel (`src/composables/useDocumentTheme.ts:10`).
- Die Tailwind-Farbskala `zinc` ist komplett auf CSS-Variablen umgebogen, damit bestehende `zinc-*`-Klassen die Creme/Navy-Palette tragen (`tailwind.config.js:15-23`). `accent`, `accent-soft`, `accent-fg` ebenso (`tailwind.config.js:9-14`). Alle Werte sind RGB-Tripel, damit Opazitäts-Modifier wie `bg-zinc-900/80` funktionieren (`style.css:6-7`).
- Seiten mit scrollender Seite (Landing, Features, Blog) bekommen `html.ktx-scroll` vom Router (`src/router/index.ts:65`, `style.css:128-135`); die Editor-App ist eine nicht scrollende Flex-Spalte (`style.css:110-122`).

---

## 2 Farben

### 2.1 Token (Editor-App, `src/style.css`)

Quelle der Wahrheit für die Editor-Oberfläche. Hell in `:root` (`style.css:5-39`), Dunkel in `.dark` (`style.css:42-60`). Hex-Werte in Klammern sind aus den RGB-Tripeln umgerechnet, wo der Quellkommentar keinen Hex nennt.

| Token           | Hell    | Quelle       | Dunkel    | Quelle       | Rolle (laut Kommentar)                |
| --------------- | ------- | ------------ | --------- | ------------ | ------------------------------------- |
| `--accent`      | #014f99 | style.css:8  | #c9984d   | style.css:43 | Akzent (Blau / Gold)                  |
| `--accent-soft` | #f8e1a9 | style.css:9  | (#3c301e) | style.css:44 | Akzent-Fläche (Hover, aktiv)          |
| `--accent-fg`   | #f5f4d6 | style.css:10 | #091428   | style.css:45 | Text auf Akzentfläche                 |
| `--zinc-50`     | #f5f4d6 | style.css:12 | (#fdf8e4) | style.css:47 | Seitenhintergrund (hell)              |
| `--zinc-100`    | #f9f2d5 | style.css:13 | #f9f2d5   | style.css:48 | Haupttext (dunkel)                    |
| `--zinc-200`    | #f0e4be | style.css:14 | #f8e1a9   | style.css:49 | Rahmen, Trenner (hell)                |
| `--zinc-300`    | #e2cf9d | style.css:15 | (#e3cfa0) | style.css:50 | Rahmen                                |
| `--zinc-400`    | #7a8da0 | style.css:16 | #7a8da0   | style.css:51 | gedämpfter Text (dunkel), Platzhalter |
| `--zinc-500`    | #4d6d8e | style.css:17 | (#5c6f86) | style.css:52 | gedämpfter Text (hell)                |
| `--zinc-600`    | #2e5a86 | style.css:18 | (#34465e) | style.css:53 | Eingabe-Rahmen (dunkel)               |
| `--zinc-700`    | #0b467f | style.css:19 | (#1d3354) | style.css:54 | Hover/aktiv (dunkel)                  |
| `--zinc-800`    | #003971 | style.css:20 | #142640   | style.css:55 | Haupttext (hell) / Karten (dunkel)    |
| `--zinc-900`    | #002b57 | style.css:21 | #0e1c32   | style.css:56 | Leisten (dunkel)                      |
| `--zinc-950`    | #001d3d | style.css:22 | #091428   | style.css:57 | Hintergrund (dunkel)                  |

Dieselben Hintergrundfarben stehen als `theme-color` in `index.html:20-21` und als Prerender-Farben in `index.html:98-104` (dupliziert, nicht referenziert).

### 2.2 Semantische Farben (nicht tokenisiert)

| Bedeutung                     | Wert                                                | Verwendung                          | Quelle                                                                                           |
| ----------------------------- | --------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Destruktiv (Text)             | Tailwind `red-600` / `red-400` (dunkel)             | „Text löschen“, „Link entfernen“    | EditorToolbar.vue:382 · FormatBar.vue:691 · EditorArea.vue:296                                   |
| Destruktiv (Fläche)           | `rgb(220 38 38)`                                    | Bild-Löschknopf                     | EditorArea.vue:382                                                                               |
| Erfolg (Toast)                | `emerald-50/300/900`, dunkel `emerald-950/800/100`  | Toast „success“                     | ToastHost.vue:9-10                                                                               |
| Fehler (Toast)                | `red-50/300/900`, dunkel `red-950/800/100`          | Toast „error“                       | ToastHost.vue:12-13                                                                              |
| Info (Toast)                  | `zinc-300 / white / zinc-800`                       | Toast „info“                        | ToastHost.vue:11                                                                                 |
| Markierung (Textmarker)       | #fde68a auf #111827                                 | `.editor-rich mark`, HTML-Export    | style.css:273-274 · exportHtml.ts:111-112                                                        |
| Link im Dokument              | `rgb(var(--accent))`                                | `.editor-rich a`                    | style.css:279                                                                                    |
| Link im HTML-Export           | #1d4ed8                                             | `.kodini-doc a`                     | exportHtml.ts:117                                                                                |
| Zitat-Streifen                | `rgba(161,161,170,.6)` (Tailwind-Original zinc-400) | blockquote                          | style.css:265 · exportHtml.ts:107                                                                |
| Standard-Textfarbe Export/PDF | #111827                                             | wenn keine eigene Textfarbe gewählt | pageRenderOptions.ts:49 · useRichText.ts:311                                                     |
| Standard-Textfarbe Druck      | #000                                                | `#print-root`                       | style.css:187                                                                                    |
| Papier                        | #ffffff                                             | Seite im Editor, Druck, PDF, Export | EditorArea.vue:495 · style.css:188 · renderPages.ts:226 · exportPdf.ts:86,105 · exportHtml.ts:92 |

### 2.3 Textfarb-Schnellwahl im Editor

Sieben feste Hex-Werte plus „Auto“ (`src/components/FormatBar.vue:25-34`); sie werden in das Dokument geschrieben und sind damit Inhalt, nicht Oberfläche.

| Label-Key   | Wert             | Quelle           |
| ----------- | ---------------- | ---------------- |
| colorAuto   | '' (Theme-Farbe) | FormatBar.vue:26 |
| colorBlack  | #111827          | FormatBar.vue:27 |
| colorGray   | #6b7280          | FormatBar.vue:28 |
| colorRed    | #b91c1c          | FormatBar.vue:29 |
| colorOrange | #c2410c          | FormatBar.vue:30 |
| colorGreen  | #15803d          | FormatBar.vue:31 |
| colorBlue   | #1d4ed8          | FormatBar.vue:32 |
| colorViolet | #7e22ce          | FormatBar.vue:33 |

### 2.4 Landing / Features (Literale, `src/styles/landing.css`, `features.css`)

Die Landing-Welt nutzt keine Token. Die Werte entsprechen überwiegend der Token-Palette, aber als Literale; einige kommen nur hier vor.

| Wert                                                                      | Rolle                                                          | Im Token-Set?                           | Quelle (Beispiele)                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| #f8e1a9                                                                   | Gold hell: Logo, Nav-Links, Fließtext in Karten (29 Vorkommen) | ja (accent-soft hell / zinc-200 dunkel) | landing.css:68,80,335,419 · features.css:154,309     |
| #c9984d                                                                   | Gold: Akzent, Verläufe, Icons, Fokus-Outline (22)              | ja (accent dunkel)                      | landing.css:102,107,177,391 · features.css:35,83,141 |
| #014f99 / #003971                                                         | Hell-Theme: Akzent / Titel (21 + 17)                           | ja                                      | landing.css:740,764,779 · features.css:674,677,716   |
| #7a8da0                                                                   | gedämpfter Text dunkel (13)                                    | ja (zinc-400)                           | landing.css:159,266,553 · features.css:52,89         |
| #4d6d8e                                                                   | gedämpfter Text hell (9)                                       | ja (zinc-500 hell)                      | landing.css:744,776 · features.css:692               |
| #e9e9eb                                                                   | Überschriften/Text dunkel (11)                                 | **nein**                                | landing.css:16,146,260,328 · features.css:44,340     |
| #050c1e                                                                   | Hintergrund-Verlauf dunkel, Blog-Media                         | **nein**                                | landing.css:15,468                                   |
| #c5deb0                                                                   | Mint: Verlaufstext, Hero-Glow, Icon-Verläufe                   | **nein**                                | landing.css:131,150,510 · LandingView.vue:15,17      |
| #c8b89a                                                                   | Intro-Text Features (dunkel)                                   | **nein** (Einzelgänger)                 | features.css:282                                     |
| #3a7cc5                                                                   | TOC-CTA-Verlauf hell                                           | **nein** (Einzelgänger)                 | features.css:730                                     |
| #091428                                                                   | Text auf Gold-Verlauf, Hintergrund                             | ja (accent-fg dunkel / zinc-950)        | landing.css:15,178,317,545                           |
| `rgba(201,152,77, .07–.6)`                                                | Gold-Rahmen und -Flächen in 14 Abstufungen                     | Literale                                | landing.css:42,184,297 · features.css:22,31,68,121   |
| `rgba(20,38,64, .4–.95)`, `rgba(14,28,50,.5/.6)`, `rgba(10,16,30,.35–.5)` | Kartenflächen dunkel                                           | zinc-800/900 als Literal                | landing.css:296,355,448 · features.css:120,269,331   |
| `rgba(10,16,18,.8/.95)`                                                   | Hero-Navigation dunkel                                         | **nein**                                | landing.css:39,49                                    |

Verläufe:

- Gold-CTA: `linear-gradient(135deg, #c9984d 0%, #f8e1a9 100%)` (`landing.css:102,177`); hell: `#014f99 → #003971` (`landing.css:753,779`).
- Verlaufstext: `#f8e1a9 → #c9984d → #c5deb0` (`landing.css:150`); hell `#c9984d → #014f99 → #003971` (`landing.css:768`).
- Feature-Icon-Verläufe, vier feste Paare (`src/views/LandingView.vue:13-18`): `#f8e1a9→#f8e1a9`, `#C5DEB0→#f8e1a9`, `#c9984d→#f8e1a9`, `#7A8DA0→#C5DEB0`. Schreibweise gemischt (Groß-/Kleinbuchstaben).
- Seitenhintergrund: `180deg #050c1e → #091428 → #050c1e` (`landing.css:15`); hell `#f5f4d6 → #ffffff → #f5f4d6` (`landing.css:725`).

### 2.5 Partials (vendored, eigene Palette)

| Partial                | Hell                                                                            | Dunkel                                                                                | Quelle                                   |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| global-nav             | `--nav-bg rgba(249,242,213,.9)`, `--nav-text #003971`, `--accent-color #014f99` | `--nav-bg rgba(26,32,44,.9)`, `--nav-text #e2e8f0`, `--accent-color #6366f1` (Indigo) | nav.html:21-30 · 36-45 · 51-60 · 594-603 |
| site-footer            | bg #ffffff, Rahmen #d4c09a, Link #014f99, Hover #c9984d                         | bg #16161c, Rahmen #5E5F69, Link #AEAFB7, Hover #F2E28E                               | footer.html:6-7,14-15,35,47,51,55        |
| cookie-banner / -modal | bg #ffffff, Rahmen #d4c09a, Buttons #014f99/#003971                             | bg #1a1a1f, Text #fafafa, Link #F2E28E, Rahmen rgba(242,226,142,.2)                   | cookie-banner.html:11-12,21-23,69,89     |

---

## 3 Typografie

### 3.1 Schriftfamilien

| Rolle                                    | Stack                                                                                                        | Quelle                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| UI-Schrift (Tailwind `font-sans`)        | `'Supreme', ui-sans-serif, system-ui, sans-serif`                                                            | tailwind.config.js:27                                 |
| `@font-face Supreme`                     | nur **Regular 400**, `woff2`, zwei URLs (`/fonts/` und `/public/fonts/`), `font-display: swap`               | style.css:63-71                                       |
| Landing-Welt                             | `'Supreme', sans-serif` auf `.landing-page` und per `:where(h1,h2,h3,p,a,span,li,button)` erzwungen          | landing.css:17,25                                     |
| Partials                                 | `'Supreme', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`                               | nav.html:111 · footer.html:10 · cookie-banner.html:16 |
| Prerender-Skelett                        | `ui-sans-serif, system-ui, sans-serif` (ohne Supreme)                                                        | index.html:97                                         |
| Dokumentschrift (Tailwind `font-editor`) | `var(--editor-font)`; Standard `ui-sans-serif, system-ui, sans-serif`                                        | tailwind.config.js:28 · style.css:25                  |
| Eingebaute Dokumentschriften             | Sans / Serif (`ui-serif, Georgia, Cambria, serif`) / Mono (`ui-monospace, SFMono-Regular, Menlo, monospace`) | src/config/fonts.ts:51-53                             |
| Eigene Webfonts                          | Laufzeit-Discovery aus `fonts.json`, Basis `/public/fonts/`, jeder Schnitt ein Eintrag                       | fonts.ts:48,137-169,180                               |
| Tastenkürzel (Features)                  | `ui-monospace, monospace`                                                                                    | features.css:498                                      |

### 3.2 Dokument-Typografie (CSS-Variablen)

Editor, Vorschau, Druck und Export lesen dieselben Variablen; `useTheme.applyTypography` schreibt sie auf `<html>` (`useTheme.ts:72-96`).

| Variable                             | Standard                                      | Grenzen (`stores/editor.ts:69-76`) | Quelle Standard                                     |
| ------------------------------------ | --------------------------------------------- | ---------------------------------- | --------------------------------------------------- |
| `--editor-font`                      | Sans-Stack                                    | Auswahl aus Registry               | style.css:25 · fonts.ts:99 (DEFAULT_FONT_ID 'sans') |
| `--editor-size`                      | 16px                                          | 10 – 42 px, Schritt 1              | style.css:28 · editor.ts:162                        |
| `--editor-line-height`               | 1.7 → ganzzahlige px via pageLineStepPx       | 1.0 – 3.0, Schritt 0.1             | style.css:29 · editor.ts:163 · useTheme.ts:85-86    |
| `--editor-letter-spacing`            | 0px                                           | −1 – 8 px, Schritt 0.1             | style.css:30 · editor.ts:164                        |
| `--editor-weight` / `--editor-style` | 400 / normal                                  | vom gewählten Schnitt              | style.css:26-27 · useTheme.ts:77-78                 |
| `--editor-align`                     | left                                          | left/center/right/justify          | style.css:31                                        |
| `--editor-step`                      | `calc(size × line-height)`, Grundlinienraster | —                                  | style.css:35                                        |
| `--editor-color`                     | nicht gesetzt (Theme-Farbe)                   | beliebiger Hex                     | style.css:36 · useTheme.ts:91-92                    |
| Seiten-Zoom                          | 1.0                                           | 0.3 – 2.0                          | editor.ts:76                                        |

Überschriften und Blöcke im Dokument (`.editor-rich`):

| Element                    | Größe                      | Gewicht         | Zeilenhöhe / Abstand                                   | Quelle                      |
| -------------------------- | -------------------------- | --------------- | ------------------------------------------------------ | --------------------------- |
| h1                         | `min(1.6em, step × 0.98)`  | 700             | 1 Schritt; padding-top 1 Schritt                       | style.css:206-215           |
| h2                         | `min(1.3em, step × 0.98)`  | 700             | wie h1                                                 | style.css:217-219           |
| h3                         | `min(1.15em, step × 0.98)` | 600             | wie h1                                                 | style.css:220-223           |
| ul / ol                    | —                          | —               | Einzug 1.6em, verschachtelt 1.3em, Marker disc/decimal | style.css:224-248           |
| blockquote                 | —                          | kursiv          | padding-left 1em, 3px Streifen                         | style.css:261-268           |
| mark / a                   | —                          | —               | Radius 2px, padding 0 1px / unterstrichen              | style.css:272-286           |
| Markdown-Vorschau h1/h2/h3 | 1.6em / 1.3em / 1.15em     | 700 / 600 / 600 | 1.25 / 1.3 / 1.35                                      | MarkdownPreview.vue:101-115 |

### 3.3 UI-Typoskala (Editor, Tailwind)

| Stufe         | Größe                 | Verwendung                                                                                             | Quelle                                                                                      |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `text-[10px]` | 10px                  | „A“ im Auto-Farbswatch                                                                                 | FormatBar.vue:503                                                                           |
| `text-xs`     | 12px                  | Labels (`.fb-label`), Statusleiste, Menü-Hinweise, Chips, kbd, Gruppentitel (uppercase, tracking-wide) | FormatBar.vue:714 · StatusBar.vue:20 · TransformMenu.vue:36 · ShortcutHelp.vue:152,184      |
| `text-sm`     | 14px                  | Buttons (`.tb-btn`, `.fr-btn`, `.pv-btn`), Menüeinträge, Eingaben, Tabs, Toast-Text                    | EditorToolbar.vue:508,514 · FindReplace.vue:63,103 · DocumentTabs.vue:39 · ToastHost.vue:59 |
| `text-lg`     | 18px                  | Dialogtitel, Drop-Overlay-Titel, „+“-Tab, Toast-Schließen                                              | ShortcutHelp.vue:125 · EditorView.vue:445 · DocumentTabs.vue:86                             |
| Gewichte      | 400 / 500 / 600 / 700 | `font-medium` Buttons, `font-semibold` Labels/Titel, `font-bold` Fett-Knopf                            | EditorToolbar.vue:508 · FormatBar.vue:287,714                                               |

### 3.4 Landing-/Features-Typoskala (handgeschrieben)

| Element                                  | Größe                                     | Gewicht   | Zeilenhöhe                        | Quelle                           |
| ---------------------------------------- | ----------------------------------------- | --------- | --------------------------------- | -------------------------------- |
| Hero-Titel                               | `clamp(1.8rem, 4vw, 2.8rem)`; ≤600px 2rem | 700       | 1.15                              | landing.css:142-144,670          |
| Abschnittstitel                          | `clamp(1.8rem, 4vw, 2.5rem)`              | 700       | —                                 | landing.css:258                  |
| CTA-Titel                                | `clamp(2rem, 5vw, 3rem)`                  | 700       | —                                 | landing.css:595                  |
| Hero-/CTA-Untertitel                     | 1.15rem                                   | 400       | 1.7                               | landing.css:157,602              |
| Abschnitts-Untertitel                    | 1.1rem                                    | 400       | —                                 | landing.css:265                  |
| Feature-Titel / Blog-Titel / FAQ-Frage   | 1.25rem / 1.15rem / 1.05rem               | 600       | — / 1.4 / —                       | landing.css:326,557,376          |
| Fließtext Karten                         | 0.95rem                                   | 400       | 1.7                               | landing.css:333,417,565          |
| Nav-Link / Logo                          | 0.95rem / 1.1rem                          | 500 / 700 | —                                 | landing.css:83,67                |
| Buttons                                  | 1rem; btn-large 1.1rem                    | 600       | —                                 | landing.css:179,220              |
| Blog-Tag / Meta                          | 0.75rem / 0.85rem                         | 600 / 400 | uppercase, tracking .04em         | landing.css:541-544,552          |
| Features: Seitentitel                    | `clamp(2rem, 5vw, 3.2rem)`                | 700       | 1.15                              | features.css:42-45               |
| Features: Badge / TOC-Titel / Stat-Label | 0.8rem / 0.75rem / 0.75rem                | 600       | uppercase, tracking .05/.08/.04em | features.css:33-37,193-197,87-92 |
| Features: Abschnittstitel / Untertitel   | 1.4rem / 0.95rem                          | 700 / 600 | —                                 | features.css:306-310,337-341     |
| Features: Listen / Tags / Shortcuts      | 0.875rem / 0.78rem / 0.8–0.82rem          | 400       | 1.55                              | features.css:357,471,499,507     |
| Features: Stat-Zahl / Intro-Text         | 1.8rem / 1.05rem                          | 700 / 400 | 1 / 1.8                           | features.css:80-84,279-283       |
| Prerender h1 / p / Chips                 | 1.9rem / 1.05rem / 0.85rem                | 700 / 400 | 1.2 / 1.6                         | index.html:111-139               |

---

## 4 Abstände

### 4.1 Editor-App (Tailwind-Skala, 4px-Raster)

| Ort                                       | Werte                                                                                                          | Quelle                                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Leisten (Tabs, Werkzeuge, Format, Status) | `px-2 py-1.5 gap-1` (8/6/4px); Format `gap-x-3 gap-y-2`; Status `px-4 py-1.5 gap-x-4`; Tabs `px-2`             | EditorToolbar.vue:293 · FormatBar.vue:198 · StatusBar.vue:20 · DocumentTabs.vue:33                        |
| Buttons                                   | `.tb-btn px-3 py-1.5` · `.seg-btn h-7 px-2` · `.fr-btn px-2 py-1` · `.pv-btn px-3 py-1.5` · Primär `px-3 py-1` | EditorToolbar.vue:508 · FormatBar.vue:724 · FindReplace.vue:103 · PreviewView.vue:109 · FormatBar.vue:699 |
| Gruppen in der Formatleiste               | `.fb-group gap-1.5` (6px); Trenner `mx-0.5 h-6 w-px`                                                           | FormatBar.vue:711,720                                                                                     |
| Menüs / Popover                           | `p-1` (Speichern), `p-2` (Werkzeuge, Link, Bild-Link); Einträge `px-2 py-1.5`; Abstand zum Anker 4px, Rand 8px | EditorToolbar.vue:319,514 · TransformMenu.vue:31 · FormatBar.vue:671 · useAnchoredMenu.ts:21,30           |
| Menübreiten                               | w-48 (192) · w-64 (256) · w-72 (288 CSS vs 280 JS)                                                             | EditorToolbar.vue:92,319 · TransformMenu.vue:13,31 · FormatBar.vue:145,671                                |
| Suche/Ersetzen                            | `px-4 py-3 gap-2`; Optionen `gap-3`                                                                            | FindReplace.vue:55,87                                                                                     |
| Dialog (Shortcuts)                        | Kopf `px-5 py-4`; Inhalt `px-5 py-4 gap-x-8 gap-y-5`; Overlay `p-4`; `max-w-2xl`, `max-h-[85vh]`               | ShortcutHelp.vue:112,119,122,149                                                                          |
| Toasts                                    | `px-3 py-2.5 gap-2`; Stapel `bottom-4 right-4 gap-2`; Breite `min(22rem, 100vw − 2rem)`                        | ToastHost.vue:25,33                                                                                       |
| Editor-Textblock (Bildschirmmodus)        | `1.25rem max(1.5rem, calc((100% − 48rem)/2))`; Lesebreite 48rem                                                | EditorArea.vue:457-459                                                                                    |
| Seitenmodus                               | Backdrop `padding 1rem`; Vorschau-Bühne `py-4` + 32px                                                          | EditorArea.vue:478 · PagePreview.vue:164-165                                                              |
| Markdown-Vorschau                         | Kopf `px-3 py-1.5`; Inhalt `px-6 py-5`; Absätze `mb-3`, Listen `pl-6`                                          | MarkdownPreview.vue:42,82,117-127                                                                         |
| Fokus-Modus                               | Pills `right-4 top-4` / `bottom-4`; Scroll-Freiraum unten 84px (Konstante)                                     | EditorView.vue:458,483,93                                                                                 |
| Druck / PDF / HTML-Export                 | Seitenrand **18mm**; Seitenabstand PDF 16px; HTML-Wrapper `margin 2rem auto; padding 0 1rem`                   | EditorView.vue:267 · renderPages.ts:14,216 · exportHtml.ts:56                                             |
| Papierformate                             | A3 297×420 · A4 210×297 · A5 148×210 · Letter 216×279 · Legal 216×356 (mm)                                     | pageFormats.ts:21-25                                                                                      |

### 4.2 Landing / Features (px-Werte ohne Skala)

| Ort                | Werte                                                                                                                                                                                | Quelle                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Abschnitte Landing | Hero `60px 24px` (≥768: `80px 48px`); Features/Guide/FAQ/Blog `100px 24px` (≤600: `60px 20px`); CTA `120px 24px`                                                                     | landing.css:119,613,273,341,424,687,584                         |
| Container-Breiten  | 1200px (Header, Sections) · 800px (FAQ) · 700px (Hero-Text) · 600 / 550 / 500px (Untertitel)                                                                                         | landing.css:54,274,342,136,590,161,268                          |
| Hero-Navigation    | `16px 24px` (≤600: `12px 16px 4px`); Nav-Gap 24px (≤768: 20px)                                                                                                                       | landing.css:38,662,75,649                                       |
| Karten             | Feature-Card `36px 28px` (≤600: `28px 24px`); Grid-Gap 28px; FAQ `24px 28px`; Blog-Body `24px 28px 28px`                                                                             | landing.css:299,699,289,375,528                                 |
| Buttons            | `16px 32px gap 10px`; large `20px 44px`; Hero-Actions gap 16px                                                                                                                       | landing.css:176,219,166                                         |
| Features-Seite     | Hero `90px 24px 70px` (≤768: `50px 20px`); Content-Grid `220px 1fr`, gap 40px; Artikel-Abschnitt `32px` (≤768: `24px 18px`), Gap 32px; Karten 20px / 16px; Grids 16 / 14 / 24 / 10px | features.css:18,599,175-176,272,625,264,123,419,113,411,327,480 |
| Partials           | Footer `1.5rem 2rem`, gap 1rem/1.5rem; Cookie-Banner `1.25rem`                                                                                                                       | footer.html:8,24,28 · cookie-banner.html:13                     |

### 4.3 Touch-Ziele (`@media (pointer: coarse)`)

| Element                                          | Größe                                   | Quelle                 |
| ------------------------------------------------ | --------------------------------------- | ---------------------- |
| `.tb-btn .seg-btn .fr-btn .menu-item .fb-select` | min-height 40px; seg-btn min-width 40px | style.css:347-356      |
| `.stepper` / `.spin-btn`                         | 42px / min-width 30px                   | style.css:359-364      |
| Checkbox / Swatch / Farbwähler                   | 18×18 / 28×28 / 34×30                   | style.css:366-378      |
| Bild-Griff / -Knöpfe                             | 24×24 / 30×30                           | EditorArea.vue:428-447 |
| Formularfelder                                   | 16px Schrift (gegen iOS-Zoom)           | style.css:340-344      |

---

## 5 Radien

| Wert                          | Welt                        | Verwendung                                                                          | Quelle                                                                                                           |
| ----------------------------- | --------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 2px                           | Editor / Landing            | Blatt im Seitenmodus; `mark`; Nav-Unterstrich                                       | EditorArea.vue:497 · style.css:275 · landing.css:101                                                             |
| 3px                           | Editor / Landing            | Skalier-Griff; Blog-Sheet-Linien                                                    | EditorArea.vue:364 · landing.css:508,514                                                                         |
| 4px (`rounded`)               | Editor / Landing            | Swatches, Tab-Aktionen, Code, Chips (11×); Link-Badge; Fokusrahmen Nav              | FormatBar.vue:489 · DocumentTabs.vue:66 · EditorArea.vue:419 · landing.css:109                                   |
| 6px (`rounded-md`)            | Editor / Features           | **Standard** für Buttons, Eingaben, Selects (21×); Shortcut-Key                     | EditorToolbar.vue:508 · FormatBar.vue:717,724 · features.css:496                                                 |
| 8px (`rounded-lg`)            | Editor / Features           | Dropdowns, Popover, Toasts, Dialog-Schließen (7×); TOC-Link, TOC-CTA, Shortcut-Item | EditorToolbar.vue:319 · ToastHost.vue:33 · features.css:213,251,490                                              |
| 10px                          | Features                    | Abschnitts-Icon                                                                     | features.css:300                                                                                                 |
| 12px                          | Landing / Features          | Buttons; Blog-Sheet; Subsection, Highlight-Box, Kategorie, Tag-Box                  | landing.css:181,202,497 · features.css:333,404,418,456                                                           |
| 14px                          | Features                    | Übersichtskarte, TOC-Box                                                            | features.css:122,189                                                                                             |
| 16px (`rounded-2xl`)          | Editor / Landing / Features | Dialog, Drop-Overlay; Feature-Icon, FAQ-Item; Hero-Stats                            | ShortcutHelp.vue:119 · EditorView.vue:433 · landing.css:312,357 · features.css:69                                |
| 18px                          | Features                    | Artikel-Abschnitt                                                                   | features.css:271                                                                                                 |
| 20px                          | Landing / Features          | Feature-Card, Blog-Card, Hero-Bild; Badge, Tag-Pill                                 | landing.css:247,298,450 · features.css:32,470                                                                    |
| 999 / 9999px / `rounded-full` | alle                        | Pills (Fokus, Seitenzahl, Blog-Tag, Prerender-Chips), Bild-Knöpfe, Scrollbar-Daumen | EditorView.vue:458 · PagePreview.vue:171 · landing.css:548 · index.html:135 · EditorArea.vue:381 · style.css:297 |
| 0.5 / 0.75 / 1rem, 26px, 50%  | Partials                    | Cookie-Buttons, -Kategorien, -Modal, Toggle                                         | cookie-banner.html:79,216,155,269,281                                                                            |

---

## 6 Schatten

| Wert                                                                                | Verwendung                                                             | Quelle                                                                                                     |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `shadow-sm` (Tailwind)                                                              | kbd                                                                    | ShortcutHelp.vue:184                                                                                       |
| `shadow-lg`                                                                         | Toasts, Fokus-Pills, Seitenzahl-Badge                                  | ToastHost.vue:33 · EditorView.vue:458,483 · PagePreview.vue:171                                            |
| `shadow-xl`                                                                         | Dropdowns, Popover, Drop-Overlay                                       | EditorToolbar.vue:319 · TransformMenu.vue:31 · FormatBar.vue:671 · EditorArea.vue:270 · EditorView.vue:433 |
| `shadow-2xl`                                                                        | Dialog                                                                 | ShortcutHelp.vue:119                                                                                       |
| `0 4px 24px rgb(0 0 0 / .18)`                                                       | Blatt im Seitenmodus                                                   | EditorArea.vue:496                                                                                         |
| `0 1px 3px rgb(0 0 0 / .3)` · `0 1px 2px / .35`                                     | Bild-Griff, -Knöpfe; Link-Badge                                        | EditorArea.vue:367,386,402,422                                                                             |
| `0 4px 20px rgba(0,0,0,.3)`                                                         | Hero-Navigation (scrolled, dunkel)                                     | landing.css:50                                                                                             |
| `0 4px 20px rgba(201,152,77,.4)` → hover `0 8px 30px / .5`                          | Primär-Button dunkel                                                   | landing.css:184,189                                                                                        |
| `0 4px 20px rgba(1,79,153,.35)` → hover `0 8px 30px / .45`                          | Primär-Button hell                                                     | landing.css:781,785                                                                                        |
| `0 20px 40px rgba(0,0,0,.3)`                                                        | Karten-Hover, Hero-Bild (dunkel)                                       | landing.css:248,306,461                                                                                    |
| `0 4px 20px rgba(0,57,113,.05/.08)` · `0 20px 40px rgba(201,152,77,.15)`            | Karten, Header, Hover (hell)                                           | landing.css:736,819,867,805,824,873                                                                        |
| `0 -4px 20px rgba(0,0,0,.15)` · `0 20px 60px / .3` · `0 4px 12px rgba(1,79,153,.3)` | Cookie-Banner, -Modal, -Buttons                                        | cookie-banner.html:15,162,95                                                                               |
| `backdrop-filter: blur(12px)` / Tailwind `backdrop-blur`                            | Hero-Navigation; Toasts, Fokus-Pills, Seitenzahl, Drop-Overlay (`-sm`) | landing.css:40 · ToastHost.vue:33 · EditorView.vue:430,458                                                 |

---

## 7 Breakpoints & Media Queries

| Query                              | Welt                          | Wirkung                                                                                         | Quelle                                                                                          |
| ---------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tailwind `sm:` (≥640px)            | Editor                        | Format-Trenner sichtbar; Shortcut-Grid 2-spaltig                                                | FormatBar.vue:720 · ShortcutHelp.vue:149                                                        |
| Tailwind `md:` (≥768px)            | Editor                        | Markdown-Vorschau neben statt unter dem Editor                                                  | EditorView.vue:402,417                                                                          |
| `(max-width: 640px)`               | Editor                        | `.hbar-scroll`: Leisten werden eine horizontal scrollende Zeile                                 | style.css:319-334                                                                               |
| `(pointer: coarse)`                | Editor                        | Touch-Ziele, 16px Formularschrift, Tab-Aktionen sichtbar                                        | style.css:336-384 · EditorArea.vue:427-448                                                      |
| `print`                            | Editor                        | nur `#print-root` sichtbar; `@page { size; margin: 18mm }` dynamisch                            | style.css:155-190 · EditorView.vue:267                                                          |
| `(min-width: 768px)`               | Landing                       | Hero zweispaltig, Bild sichtbar                                                                 | landing.css:609-634                                                                             |
| `(max-width: 768px)`               | Landing / Features / Partials | Header gestapelt, Nav wischbar; Features-Hero/Grids 1-spaltig; Nav-Sprachbutton, Footer, Cookie | landing.css:641 · features.css:597 · nav.html:299,585 · footer.html:84 · cookie-banner.html:326 |
| `(max-width: 600px)`               | Landing                       | Hero-Titel 2rem, Buttons volle Breite, Sections 60px 20px                                       | landing.css:660-711                                                                             |
| `(max-width: 1100px)`              | Features                      | TOC ausgeblendet, Content 1-spaltig, Grids 2-spaltig                                            | features.css:582-595                                                                            |
| `(max-width: 480px)`               | Features / Footer             | Grids 1-spaltig, Stat-Trenner weg                                                               | features.css:640-653 · footer.html:96                                                           |
| `(prefers-reduced-motion: reduce)` | Landing / Features            | Transitions aus (Karten, Buttons, TOC-Links)                                                    | landing.css:713-720 · features.css:655-660                                                      |
| `(prefers-color-scheme: dark)`     | Partials / Prerender          | Nav-Variablen; Prerender-Farben                                                                 | nav.html:34,391,451 · index.html:101                                                            |

---

## 8 Ebenen (z-index)

| z                 | Element                                                                             | Quelle                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1                 | Hero-Inhalt über Glow                                                               | landing.css:138                                                                                                             |
| 5                 | Frei platzierte Bilder                                                              | EditorArea.vue:340                                                                                                          |
| 40                | Fokus-Modus-Pills (absolute im Editorbereich)                                       | EditorView.vue:458,483                                                                                                      |
| 50                | Dropdowns/Popover (Teleport, fixed); Drop-Overlay; Landing-Hero-Navigation (sticky) | EditorToolbar.vue:319 · TransformMenu.vue:31 · FormatBar.vue:671 · EditorArea.vue:270 · EditorView.vue:430 · landing.css:37 |
| 60                | Shortcut-Dialog (fixed inset-0)                                                     | ShortcutHelp.vue:112                                                                                                        |
| 100               | Toasts (fixed unten rechts) **und** globale Navigation (sticky oben)                | ToastHost.vue:25 · nav.html:79                                                                                              |
| 200 / 1000 / 1001 | Nav-Dropdowns, mobiles Nav-Menü                                                     | nav.html:200,342,257                                                                                                        |
| 10000 / 10001     | Cookie-Banner / Cookie-Modal                                                        | cookie-banner.html:14,147                                                                                                   |

---

## 9 Komponenten-Inventar

Alle Vue-SFCs unter `src/components` und `src/views` sowie die drei Partials. Varianten und Zustände sind aus Klassen und `:class`-Bindungen abgelesen. Mehrere Komponenten definieren Button-Klassen lokal in `<style scoped>`; es gibt keine gemeinsame Button-Komponente.

### 9.1 Editor-Shell

#### DocumentTabs (`src/components/DocumentTabs.vue`)

| Teil             | Beschreibung                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leiste           | `hbar-scroll`, `bg-zinc-100 dark:bg-zinc-950`, `border-b` (:33)                                                                                           |
| Tab              | `px-3 py-2 text-sm border-b-2`; Zustände: aktiv `border-accent text-accent` · inaktiv `border-transparent text-zinc-600` · hover `text-zinc-900` (:39-44) |
| Umbenennen-Input | `w-28 rounded border-accent text-sm` (:52)                                                                                                                |
| Tab-Aktion ✎ / ✕ | `.tab-action rounded px-1 text-xs opacity-0 group-hover:opacity-100`; auf Touch immer sichtbar (:66,75 · style.css:380-383)                               |
| Neu-Button „+“   | `px-3 py-2 text-lg text-zinc-500 hover:text-accent` (:86)                                                                                                 |

#### EditorToolbar (`src/components/EditorToolbar.vue`)

| Teil                 | Beschreibung                                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leiste               | `hbar-scroll flex-wrap gap-1 bg-white dark:bg-zinc-900 px-2 py-1.5 border-b` (:293)                                                                                                                                         |
| `.tb-btn`            | `rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700`; Zustände: hover `bg-zinc-100` · disabled `opacity-40, cursor-not-allowed` · aktiv (Toggle) `text-accent` · destruktiv `text-red-600` (:507-509,357,382,435,445) |
| `.tb-start`          | Outline-Variante: `border border-accent/40 font-semibold text-accent hover:bg-accent-soft` (:510-512)                                                                                                                       |
| Trenner              | `mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700` (:399,420,427)                                                                                                                                                                 |
| Dropdown „Speichern“ | Teleport in `body`, `fixed z-50 w-48 rounded-lg border bg-white p-1 shadow-xl`; Position via `useAnchoredMenu(192)` (:85-92,315-352)                                                                                        |
| `.menu-item`         | `block w-full rounded-md px-2 py-1.5 text-left text-sm`; Untertitel `text-xs text-zinc-400`; Trennlinie `my-1 h-px bg-zinc-200` (:513-515,330,341)                                                                          |
| Icon-Button          | Inline-SVG 20×14 (Tastatur), `h-4 w-6`, `stroke-width 1.2/1.6` (:459-475)                                                                                                                                                   |

#### TransformMenu (`src/components/TransformMenu.vue`)

| Teil    | Beschreibung                                                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger | eigene `.tb-btn`-Kopie mit `flex items-center gap-1` (:54-56)                                                                                              |
| Menü    | `fixed z-50 w-64 rounded-lg p-2 shadow-xl`, `useAnchoredMenu(256)`; Gruppentitel `text-xs font-semibold uppercase tracking-wide text-zinc-400` (:13,31,36) |
| Eintrag | eigene `.menu-item`-Kopie; hover `bg-accent-soft text-accent` (:43,57-59)                                                                                  |

#### FormatBar (`src/components/FormatBar.vue`)

| Teil                            | Beschreibung                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leiste                          | `hbar-scroll flex-wrap gap-x-3 gap-y-2 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1.5 border-b` (:198)                                                                                                                                                                                                               |
| `.fb-group` / `.fb-label`       | `flex items-center gap-1.5` / `text-xs font-semibold text-zinc-500` (:710-715)                                                                                                                                                                                                                                   |
| `.fb-select`                    | `h-7 rounded-md border border-zinc-300 bg-white px-2 text-xs`; focus `border-accent`; Schriftauswahl `min-w-[10rem]` mit Font-Preview per Inline-Style (:716-718,204-210)                                                                                                                                        |
| `.fb-divider`                   | `mx-0.5 hidden h-6 w-px bg-zinc-200 sm:block` (:719-721)                                                                                                                                                                                                                                                         |
| `.seg-btn`                      | `inline-flex h-7 rounded-md border border-zinc-300 px-2 text-xs text-zinc-600`; Icon-Variante `h-7 w-7` mit 16er-SVG `h-3.5 w-3.5`; Zustände: hover `bg-zinc-100` · `.seg-active` `border-accent bg-accent-soft text-accent dark:bg-zinc-700` · disabled (Link ohne Auswahl) · `aria-pressed` (:723-728,285-384) |
| Farb-Swatch `.fb-swatch`        | `h-5 w-5 rounded border hover:scale-110`; gewählt `border-accent ring-2 ring-accent/40`, sonst `border-zinc-300`; Auto-Swatch zeigt „A“ in `text-[10px]` (:485-504)                                                                                                                                              |
| `input[type=color]` `.fb-color` | `h-7 w-8 rounded-md border p-0.5` (:505-512)                                                                                                                                                                                                                                                                     |
| `.zoom-range`                   | `h-1 w-24 accent-[rgb(var(--accent))]`; Reset-Button zeigt Prozent in `tabular-nums` (:729-731,616-637)                                                                                                                                                                                                          |
| Checkbox                        | `accent-[rgb(var(--accent))]` (:646)                                                                                                                                                                                                                                                                             |
| Link-Popover                    | `fixed z-50 w-72 rounded-lg p-2 shadow-xl`, `useAnchoredMenu(280)`; Eingabe `rounded-md px-2 py-1.5 text-sm focus:border-accent`; **Primär-Button** `rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-fg hover:opacity-90`; **Destruktiv** `text-red-600 hover:bg-red-50` (:145,667-706)         |

#### NumberStepper (`src/components/NumberStepper.vue`)

| Teil              | Beschreibung                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Rahmen `.stepper` | `h-7 rounded-md border border-zinc-300 bg-white`; Wert `text-xs tabular-nums` mit Prop `width` (:48-57)                     |
| `.spin-btn`       | `w-5 bg-zinc-50 text-zinc-500`; hover `bg-zinc-100 text-zinc-800` · disabled `opacity-30`; 10×6-SVG-Pfeile (:102-104,59-96) |
| Props             | `min max step decimals unit width label`; Touch-Höhe 42px (FormatBar.vue:237-276 · style.css:359-364)                       |

#### FindReplace (`src/components/FindReplace.vue`)

| Teil              | Beschreibung                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Panel             | `bg-zinc-50 dark:bg-zinc-900 px-4 py-3 gap-2 border-b` (:55)                                                              |
| Eingabe           | `min-w-40 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm`; focus `border-accent` (:63,81)                     |
| `.fr-btn`         | `rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm`; hover `bg-zinc-100`; Textvariante `px-3` (:102-104,83-84) |
| Status / Optionen | `text-xs text-zinc-500`; Checkbox-Labels `text-xs gap-1` (:70,87-96)                                                      |

#### EditorArea (`src/components/EditorArea.vue`)

| Teil                     | Beschreibung                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modi                     | Bildschirm `.plain-scroll + .plain-pad` · Seite `.page-backdrop › .page-canvas › .page-sheet` (:159-163)                                                                                                                  |
| `.editor-text`           | alle `--editor-*`-Variablen; Platzhalter per `::before` in `rgb(161 161 170)` (:316-327,462-467)                                                                                                                          |
| Blatt                    | `#ffffff` / dunkel `zinc-900`, Schatten `0 4px 24px`, Radius 2px; Backdrop `zinc-200` / `zinc-950`; Umbruchlinie `1px dashed` (:473-513)                                                                                  |
| Bild-Rahmen `.img-frame` | `.img-selected` outline 2px accent · `.img-handle` 14px accent, 2px weiß · `.img-del` 20px rot · `.img-link-btn` 20px weiß / `.img-link-active` accent · `.img-linkbadge` 18px accent; Touch-Varianten 24/30px (:338-448) |
| Bild-Link-Popover        | identisches Muster wie Link-Popover der FormatBar (`w-64`) (:266-311)                                                                                                                                                     |

#### MarkdownPreview (`src/components/MarkdownPreview.vue`)

| Teil          | Beschreibung                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel         | `bg-white dark:bg-zinc-900`; Kopf `px-3 py-1.5 border-b`, Titel `text-xs font-semibold uppercase tracking-wide` (:38-46)                                                                                |
| Buttons       | Text-Button `rounded-md px-2 py-1 text-xs font-medium` (disabled `opacity-40`); Icon-Button `rounded-md p-1` (:50,59)                                                                                   |
| `.md-preview` | Typografie aus `--editor-*`; h1–h3, p, Listen, a (accent), hr, code (`bg-zinc-100`), pre (`bg-zinc-900 text-zinc-100 rounded-lg p-3`), blockquote (`border-l-4 border-accent`), Tabellen, img (:95-159) |

#### PagePreview (`src/components/PagePreview.vue`)

| Teil             | Beschreibung                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Viewport         | `bg-zinc-200 dark:bg-zinc-950 border-l`; Bühne `py-4` (:159-166)                                                                                   |
| Seitenzahl-Badge | `absolute bottom-3 right-3 rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur`; dunkel invertiert (:171) |

#### StatusBar (`src/components/StatusBar.vue`)

| Teil        | Beschreibung                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Leiste      | `hbar-scroll gap-x-4 gap-y-1 whitespace-nowrap border-t bg-zinc-50 px-4 py-1.5 text-xs text-zinc-500` (:20) |
| Format-Chip | `ml-auto rounded bg-zinc-200 px-2 py-0.5 font-medium text-zinc-600` mit 16er-SVG `h-3 w-3` (:30-46)         |

#### ToastHost (`src/components/ToastHost.vue`)

| Teil       | Beschreibung                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container  | `fixed bottom-4 right-4 z-[100] w-[min(22rem,calc(100vw-2rem))] gap-2`, `aria-live="polite"` (:25)                                                |
| Toast      | `rounded-lg border px-3 py-2.5 shadow-lg backdrop-blur`; Typen success (emerald) · info (zinc/white) · error (red); Pause bei Hover (:8-14,33-37) |
| Aktionen   | „Nicht mehr anzeigen“ `text-xs underline opacity-80`; Schließen „×“ `text-lg opacity-60` (:60-77)                                                 |
| Transition | `toast`: 0.2s ease, enter `translateY(0.5rem)`, leave `translateX(0.75rem)` (:84-102)                                                             |

#### ShortcutHelp (`src/components/ShortcutHelp.vue`)

| Teil      | Beschreibung                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overlay   | `fixed inset-0 z-[60] bg-black/50 p-4`, `role="dialog" aria-modal`, Klick außerhalb schließt (:111-117)                                                             |
| Panel     | `max-h-[85vh] max-w-2xl rounded-2xl border bg-white shadow-2xl`; Kopf `px-5 py-4 border-b`, Titel `text-lg font-semibold`, Intro `text-sm text-zinc-500` (:119-129) |
| Schließen | `rounded-lg p-2 text-zinc-500 hover:bg-zinc-100` (:132)                                                                                                             |
| `.kbd`    | `min-w-[1.5rem] rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium shadow-sm` (:183-185)                                                |

#### EditorView (`src/views/EditorView.vue`)

| Teil                   | Beschreibung                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seite                  | `relative flex h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`; Layout Editor \| Markdown ab `md:` (:373,402-420)                                                       |
| Drop-Overlay           | `absolute inset-0 z-50 bg-accent/10 backdrop-blur-sm`; Karte `rounded-2xl border-2 border-dashed border-accent bg-white/90 px-8 py-6 shadow-xl`, Icon 24er `h-9 w-9 text-accent` (:428-448)           |
| Fokus-Pill „Verlassen“ | `absolute right-4 top-4 z-40 rounded-full bg-zinc-800/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur hover:bg-zinc-700`; Esc-Chip `bg-white/20 px-1.5 py-0.5 text-xs` (:455-473) |
| Zoom-Pill              | `absolute bottom-4 left-1/2 z-40 rounded-full bg-zinc-800/90 px-2 py-1.5`; Icon-Buttons `h-8 w-8 rounded-full hover:bg-white/15 disabled:opacity-40`; Wert `min-w-[3.25rem] tabular-nums` (:481-546)  |
| `#print-root`          | versteckt, bei Druck einzig sichtbar; `@page` dynamisch (:555 · style.css:151-190)                                                                                                                    |

#### PreviewView (`src/views/PreviewView.vue`)

| Teil      | Beschreibung                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kopf      | `bg-white px-4 py-2 border-b border-zinc-300`; Titel `text-sm font-semibold`, Untertitel `text-xs text-zinc-500` (:81-90)                                                          |
| `.pv-btn` | `rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium`; hover `bg-zinc-100`; `.pv-btn-primary` `border-accent bg-accent text-accent-fg hover:bg-accent/90` (:108-113) |

### 9.2 Landing / Features / Blog

#### LandingLayout (`src/components/landing/LandingLayout.vue` · `landing.css:11-110`)

| Teil              | Beschreibung                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.landing-page`   | Verlauf-Hintergrund, Supreme, `overflow-x: clip` (landing.css:11-22)                                                                                           |
| `.landing-header` | `sticky top 0 z 50`, `rgba(10,16,18,.8)` + blur 12px, 1px Gold-Rahmen; `.scrolled` .95 + Schatten; hell `rgba(249,242,213,.9/.98)` (landing.css:34-51,729-737) |
| `.header-logo`    | `700 1.1rem #f8e1a9`, hell `#014f99` (landing.css:62-70,739)                                                                                                   |
| `.nav-link`       | `500 .95rem`; hover · `.active` 2px Verlaufs-Unterstrich (::after) · focus-visible 2px #c9984d outline, offset 4px · `aria-current=page` (landing.css:78-110)  |

#### LandingView (`src/views/LandingView.vue` · `landing.css:112-606`)

| Teil                               | Beschreibung                                                                                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.hero`                            | `min-height calc(100vh − 130px)`, drei radiale Glows, Hero-Bild je Theme aus `public/image/hero-{light,dark}.webp` (landing.css:113-133,230-249 · LandingView.vue:38-44)                                                                     |
| `.btn-primary`                     | Gold-Verlauf, `#091428`, `16px 32px`, Radius 12px, Schatten; hover translateY(−2px) + größerer Schatten · focus-visible 2px #f8e1a9 · `.btn-large`; hell Blau-Verlauf (landing.css:172-221,778-801)                                          |
| `.btn-secondary`                   | transparent, `2px rgba(248,225,169,.3)`; hover Rahmen #f8e1a9 + Fläche .1 (landing.css:192-210,788-796)                                                                                                                                      |
| `.feature-card`                    | Verlaufsfläche, 1px Gold-Rahmen .15, Radius 20px, `36px 28px`; hover translateY(−4px), Rahmen .4, Schatten; Icon-Box 60px / Radius 16px mit 4 festen Verläufen; Step-Variante zeigt Nummer (landing.css:295-337 · LandingView.vue:13-18,110) |
| `.faq-item`                        | `rgba(20,38,64,.8)`, Radius 16px; hover Rahmen .3 · `.active` Rahmen .4, Icon 180°, Antwort max-height 300px · focus-visible Outline innen (landing.css:354-420)                                                                             |
| `.section-header` / `.cta-section` | zentriert, `margin-bottom 60px`; CTA `120px 24px` mit radialem Glow (landing.css:252-269,583-606)                                                                                                                                            |

#### BlogView (`src/views/BlogView.vue` · `landing.css:422-580`)

| Teil               | Beschreibung                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `.blog-grid`       | `repeat(auto-fit, minmax(300px, 560px))` zentriert, gap 28px (landing.css:436-443)                                           |
| `.blog-card`       | wie Feature-Card, `overflow hidden`; hover/focus-visible Lift + Bild/Sheet scale(1.03) (landing.css:445-503)                 |
| `.blog-card-media` | 16:9, radialer Glow auf `#050c1e`; Fallback `.blog-card-sheet` (stilisiertes Blatt mit Verlaufslinien) (landing.css:465-522) |
| `.blog-card-tag`   | Pill 999px, Gold-Verlauf, `.75rem 600 uppercase` (landing.css:540-549)                                                       |

#### FeaturesView (`src/views/FeaturesView.vue` · `features.css`)

| Teil                                              | Beschreibung                                                                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.blog-badge`                                     | Pill 20px, `rgba(201,152,77,.15)`, `.8rem 600 uppercase` (features.css:27-39)                                                                                                                                             |
| `.hero-stats`                                     | Zeile mit `.stat-item` (1.8rem Gold-Zahl, .75rem Label) und 1px-Trennern, Radius 16px (features.css:58-99)                                                                                                                |
| `.overview-card`                                  | 4-spaltig → 2 → 1; `rgba(20,38,64,.5)`, Radius 14px; hover/focus-visible Rahmen .3, translateY(−2px) (features.css:110-163)                                                                                               |
| `.toc-link`                                       | `6px 8px`, Radius 8px, .8rem; hover Fläche .1, #f8e1a9 · `.active` Fläche .12, Gold, 600; `.toc-cta` Gold-Verlauf-Button (features.css:208-258)                                                                           |
| `.article-section`                                | `rgba(14,28,50,.6)`, Radius 18px, 32px; Varianten `.intro-section` · `.unique-section` (Verlauf, Rahmen .2) · `.summary-section` (Verlauf, Rahmen .25); Kopf mit 42px Icon-Box Radius 10px (features.css:268-322,512-521) |
| `.feature-list`                                   | 5px Gold-Punkt; Varianten `--grid` · `--inline` · `--spaced` · `--highlight` (6px heller Punkt) (features.css:345-397)                                                                                                    |
| `.category-card` / `.tag-pill` / `.shortcut-item` | Radius 12 / 20 / 8px; Shortcut-Key Mono .8rem Radius 6px (features.css:415-509)                                                                                                                                           |
| Hell-Theme                                        | vollständige Override-Liste, weiß-transparente Flächen, Blau statt Gold (features.css:663-802)                                                                                                                            |

#### LandingIcon (`src/components/landing/LandingIcon.vue`)

| Teil              | Beschreibung                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System            | 15 Inline-SVG-Icons im 24er-Raster, `stroke currentColor`, `stroke-width 2`, `round` caps/joins; Props `size` (Standard 24) und `strokeWidth` (:6-27,30-41) |
| Namen             | type · file · tools · lock · play · chevron · arrow (Fallback) · write · format · page · image · export · markdown · keyboard · check                       |
| Verwendete Größen | 14 · 16 · 20 · 22 · 24 · 28 (FeaturesView.vue:87,112,118,137,212 · LandingView.vue:62,94,140,155)                                                           |

### 9.3 Globale Partials (vendored)

| Teil                   | Beschreibung                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Einbindung             | Build-Zeit über `<!--INJECT:name-->` (vite.config.ts:14-21 · index.html:147,156,204-205); Nav zur Laufzeit durch Live-Version ersetzt (index.html:150-156) |
| global-nav             | eigene `--nav-*`-Variablen, Supreme, `sticky z 100`, Dropdowns z 200/1000, Sprach- und Theme-Umschalter (nav.html:20-60,79,200,342)                        |
| site-footer            | weiß / `#16161c`, Links `.85rem`, Hover Gold (footer.html:5-56)                                                                                            |
| cookie-banner / -modal | `fixed bottom z 10000`; Modal z 10001, Radius 1rem, Toggle-Switch 26px (cookie-banner.html:8-17,143-162,268-291)                                           |

---

## 10 Hartkodierte & inkonsistente Werte

Sortiert nach Schwere. „Kritisch“ heißt: sichtbar für Nutzer oder bricht die Token-Idee an zentraler Stelle. „Warnung“ heißt: Wartungsrisiko. „Hinweis“ heißt: kosmetisch oder leicht zu beheben.

### Kritisch

**K1 · Drei Farbsysteme nebeneinander, Partials mit fremder Dunkel-Palette.**
Editor nutzt Token, Landing/Features Literale (≈130 Hex/rgba), die Partials eigene Variablen. Die dunkle Navigation ist Slate/Indigo statt Navy/Gold.

- Nav dunkel: `--accent-color #6366f1`, `--nav-text #e2e8f0`, `--nav-bg rgba(26,32,44,.9)` (partials/nav.html:36-45, 51-60)
- Footer dunkel: `#16161c`, `#5E5F69`, `#AEAFB7`, `#F2E28E` (partials/footer.html:14-15,47,55); Cookie dunkel `#1a1a1f`, `#fafafa` (cookie-banner.html:21-23)
- Landing-Grundfarben ohne Token-Entsprechung: `#e9e9eb` (11×, landing.css:16), `#050c1e` (landing.css:15), `rgba(10,16,18,.8)` (landing.css:39)

**K2 · Tailwind-Originalgraus als Literal mit irreführendem Kommentar.**
Die Skala `zinc` ist auf Creme/Navy umgebogen, aber an sieben Stellen steht der ursprüngliche Tailwind-Grauwert hart und ist als „zinc-400/700/900“ kommentiert. Diese Elemente folgen dem Theme nicht.

- `rgb(161 161 170 / .6)` Zitatstreifen (style.css:265) und Export (exportHtml.ts:107)
- `#111827` „zinc-900“ auf Marker (style.css:274; tatsächlich Tailwind gray-900)
- `rgb(161 161 170 / .4)` Scrollbar-Daumen (style.css:296), überschreibt die Akzent-Scrollbar aus style.css:74-97 für `textarea` und `.overflow-y-auto`
- `rgb(161 161 170)` Platzhalter (EditorArea.vue:465) und Umbruchlinie hell (EditorArea.vue:508)
- `rgb(63 63 70)` „zinc-700“ Bild-Link-Knopf (EditorArea.vue:401)

**K3 · Ebenen: Modal liegt unter der globalen Navigation. [Annahme]**
Der Shortcut-Dialog nutzt `z-[60]` (ShortcutHelp.vue:112), die sticky Navigation `z-index: 100` (nav.html:79) und ihre Dropdowns 200/1000. Das Backdrop deckt die Navigation damit nicht ab; sie bleibt über dem Modal bedienbar. Nicht im Browser verifiziert, aus den Werten abgeleitet. Toasts (`z-[100]`, ToastHost.vue:25) teilen sich die Ebene mit der Navigation.

### Warnung

**W1 · Fünf lokale Button-Definitionen, zwei davon dupliziert.**

- `.tb-btn` in EditorToolbar.vue:507 und TransformMenu.vue:54 (zweite Kopie mit `flex gap-1`, ohne `disabled`-Zustand)
- `.menu-item` in EditorToolbar.vue:513 und TransformMenu.vue:57 (zweite ohne Hover; Hover wird im Template ergänzt, :43)
- Höhen/Padding uneinheitlich: `.tb-btn py-1.5`, `.seg-btn h-7`, `.fr-btn py-1`, `.pv-btn py-1.5`, Primär-Button `py-1` (FindReplace.vue:102 · PreviewView.vue:108 · FormatBar.vue:699,723)
- Primär-Button dreimal mit leicht anderen Klassen: FormatBar.vue:699, EditorArea.vue:304 (`hover:opacity-90`) vs PreviewView.vue:112 (`hover:bg-accent/90`)

**W2 · Link- und Standardfarben weichen zwischen Editor, Export und Druck ab.**

- Link: Editor `rgb(var(--accent))` (style.css:279) vs HTML-Export `#1d4ed8` (exportHtml.ts:117)
- Standard-Text: Export/PDF `#111827` (pageRenderOptions.ts:49, useRichText.ts:311) vs Druck `#000` (style.css:187) vs Store-Kommentar `#1f2937` (stores/editor.ts:53)
- Zitat im Export hat `margin: 0.2em 0` (exportHtml.ts:105), im Editor `margin: 0` (style.css:262); das verschiebt das Grundlinienraster im Export

**W3 · Supreme nur als Regular geladen, Landing nutzt 500/600/700.**
`@font-face` deklariert einen Schnitt (style.css:63-71); landing.css setzt 13-mal `font-weight` 500–700, features.css ebenso. Browser synthetisieren Fettschnitte (Faux Bold). Fallback-Stacks differieren: `ui-sans-serif, system-ui` (tailwind.config.js:27) vs `sans-serif` (landing.css:17) vs `-apple-system, …, Roboto` (nav.html:111). Das Prerender-Skelett lädt Supreme gar nicht (index.html:97).

**W4 · Semantische Farben (Fehler, Erfolg, Markierung) ohne Token.**

- Rot: `text-red-600` (EditorToolbar.vue:382 · FormatBar.vue:691 · EditorArea.vue:296), `rgb(220 38 38)` (EditorArea.vue:382), Toast-Rot (ToastHost.vue:12-13)
- Grün: Toast-Emerald (ToastHost.vue:9-10)
- Marker-Gelb `#fde68a` doppelt (style.css:273 · exportHtml.ts:111)

**W5 · Breakpoints streuen über sechs Werte.**
480 · 600 · 640 · 768 · 1100 px plus Tailwind `sm/md` (640/768). 600 (landing.css:660) und 640 (style.css:319) liegen dicht beieinander; 1100 (features.css:582) hat kein Tailwind-Pendant (lg = 1024).

**W6 · Radien ohne Skala.**
Editor: 2/3/4/6/8/16/9999 px. Landing: 2/4/12/16/20/999. Features: 6/8/10/12/14/16/18/20. Partials: 0.5rem/0.75rem/1rem/26px/50%. Insgesamt 14 verschiedene Werte (Abschnitt 5).

**W7 · Schatten ohne Skala.**
Neben vier Tailwind-Stufen gibt es neun handgeschriebene Schatten mit drei verschiedenen Tönungen (Schwarz, Gold, Navy); siehe Abschnitt 6.

**W8 · Theme-Logik an vier Orten.**

- `.dark` (Tailwind) und `[data-theme]` (Landing/Partials) werden beide gesetzt (useTheme.ts:49-50)
- `useDocumentTheme` wertet fehlendes Attribut als dunkel (useDocumentTheme.ts:10), Tailwind-Standard ohne Klasse ist hell
- Nav reagiert zusätzlich auf `prefers-color-scheme` (nav.html:34), was `[data-theme="light"]` erst in nav.html:593 wieder überstimmt
- Prerender hat eigene Farbkopien (index.html:98-104)

**W9 · Menübreite doppelt gepflegt (JS und CSS).**
Link-Popover: `useAnchoredMenu(280)` (FormatBar.vue:145) vs `w-72` = 288px (FormatBar.vue:671). Speichern-Menü 192/`w-48` und Werkzeuge 256/`w-64` stimmen überein (EditorToolbar.vue:92,319 · TransformMenu.vue:13,31).

### Hinweis

**H1 · Magische Zahlen.**

- `FOCUS_BAR_INSET = 84` (Leiste ~44 + 16 + Luft) (EditorView.vue:91-93)
- Hero `calc(100vh − 130px)` für Nav + Hero-Nav (landing.css:115); `scroll-margin-top 80px` (landing.css:283); TOC `top 90px` (features.css:183)
- FAQ-Antwort `max-height 300px` (landing.css:411)
- Bühnenhöhe `scaledHeight + 32` (PagePreview.vue:165)

**H2 · Tailwind-Arbitrary-Values statt Theme-Erweiterung.**
`text-[10px]` (FormatBar.vue:503), `z-[60]`, `z-[100]`, `min-w-[10rem]`, `min-w-[3.25rem]`, `min-w-[1.5rem]`, `max-h-[85vh]`, `w-[min(22rem,calc(100vw-2rem))]`, `accent-[rgb(var(--accent))]` (2×). Alle wären in `tailwind.config.js` als Token abbildbar.

**H3 · Touch-Ziele unter 44px und uneinheitlich.**
40 (Buttons), 42 (Stepper), 30 (Spin), 28 (Swatch), 34×30 (Farbwähler), 18 (Checkbox), 24/30 (Bild-Griffe) (style.css:347-378 · EditorArea.vue:428-447). Die 44px-Empfehlung (Apple HIG / WCAG 2.5.5 AAA) wird nicht erreicht.

**H4 · Doppelte Font-URL und gemischte Hex-Schreibweise.**
`@font-face` listet `/fonts/` und `/public/fonts/` (style.css:66-67); Deploy-Pfad ist `/public/fonts/` (fonts.ts:45-48). Verläufe mischen `#C5DEB0`/`#7A8DA0` mit Kleinschreibung (LandingView.vue:15,17); Partials nutzen `#AEAFB7`, `#F2E28E`, `#5E5F69`, `#0C0C10`.

**H5 · Features-Einzelgänger.**
`#c8b89a` (features.css:282) und `#3a7cc5` (features.css:730) kommen je genau einmal vor und haben keine Entsprechung in Token oder Landing.

---

## 11 Methodik & Quellen

- Gelesen: `tailwind.config.js`, `postcss.config.js`, `src/style.css`, `src/styles/landing.css`, `src/styles/features.css`, `index.html`, alle 17 SFCs unter `src/components` und `src/views`, `src/composables/useTheme.ts`, `useDocumentTheme.ts`, `useAnchoredMenu.ts`, `src/config/fonts.ts`, `src/stores/editor.ts` (LIMITS/Defaults), `src/utils/exportHtml.ts`, `pageRenderOptions.ts`, `renderPages.ts`, `pageFormats.ts`, `partials/*.html`.
- Zählungen (Hex, rgba, Klassen) per `grep` über `src/` und `index.html`; Partials separat.
- Hex-Umrechnungen aus RGB-Tripeln ohne Quellkommentar sind rechnerisch, nicht aus dem Code zitiert.
- Nicht im Browser gerendert; der z-index-Befund K3 ist deshalb als Annahme markiert.
- Partials sind nur die vendored Fallbacks; die Live-Version vom Server kann abweichen (index.html:150-156).
- Zeilenangaben gelten für Commit `f09f3b3`. Bei Änderungen an den Quelldateien verschieben sie sich; diese Doku dann neu erzeugen statt von Hand nachziehen.
