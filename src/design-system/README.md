# Design-System · Tokens v2

Design Tokens des Kodini Texteditors. Sie sind eine Kopie der v2-Tokens des Collage Makers
(`KodiniTools/Collage-Maker`, `src/design-system/`, Stand `9dc4eca`), die ihrerseits aus dem
Playlist Generator (`KodiniTools/Playlist-Generator`, Stand `89bb48e`) stammen, damit alle Apps auf
kodinitools.com dieselbe Palette, dieselben Radien und dieselbe Motion teilen. Werte werden dort
gepflegt und hierher übernommen; `tokens-v2.spec.ts` hält JSON und CSS konsistent und prüft den
Kontrast (WCAG AA).

## Dateien

| Datei                         | Zweck                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `tokens-v2.css`               | **Laufzeit-Quelle.** CSS Custom Properties `--ds-*`, Dark auf `:root`, Light auf `.light-theme` und `:root[data-theme='light']`. |
| `tokens-v2.json`              | Maschinenlesbare Fassung (W3C-Design-Tokens-nah), `$extensions.css` nennt die Variable.                                          |
| `tokens-v2.ts`                | Typisierter Zugriff für TS, z. B. `themeColorsV2('light')` für Canvas-Zeichnung.                                                 |
| `__tests__/tokens-v2.spec.ts` | Konsistenz JSON ↔ CSS, Light-Spiegelung, Namespace, Kontrast-Audit, Einbindung.                                                  |
| `__tests__/tokenTestUtils.ts` | CSS-Block-Parser, Token-Walker, Kontrastberechnung.                                                                              |

## Theme-Mechanik

`src/composables/useTheme.ts` setzt `html[data-theme]` (für Tokens und Partials), `body.light-theme`
(Parität zu Collage Maker und Playlist Generator) und weiterhin `html.dark` (Altbestand für externe
Skripte). Der Modus kommt aus `settings.theme` (`light | dark | system`); `system` folgt
`prefers-color-scheme`. Ein Inline-Skript in `index.html` setzt `data-theme` vor dem ersten Paint
aus `localStorage.theme` bzw. dem Systemschema, damit es keinen falschen Flash gibt.

## Tailwind-Brücke

Tailwind bleibt als Utility-Schicht für Layout. Farben, Radien, Schatten und Dauern kommen aus den
Tokens (`tailwind.config.js`), es gibt keine `dark:`-Varianten mehr:

| Rolle                        | Klasse                                                                                                          | Variable                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Seite, Panel, Eingabe, Hover | `bg-surface-0` … `bg-surface-3`                                                                                 | `--ds-surface-0…3`                        |
| Rahmen, Feldrahmen           | `border-line`, `border-line-strong` (auch nur `border`)                                                         | `--ds-border`, `--ds-border-strong`       |
| Text 1–3                     | `text-ink`, `text-ink-2`, `text-ink-3`                                                                          | `--ds-text`, `--ds-text-2`, `--ds-text-3` |
| Primäraktion                 | `bg-accent hover:bg-accent-hover text-on-accent`                                                                | `--ds-accent*`, `--ds-on-accent`          |
| Auswahl, aktive Fläche       | `bg-accent-soft border-accent`                                                                                  | `--ds-accent-soft`                        |
| Link, Status                 | `text-link`, `text-success`, `text-warning`, `text-danger`, `text-info`                                         | `--ds-link`, `--ds-success` … `--ds-info` |
| Radien                       | `rounded-sm` (6) · `rounded-md` (10) · `rounded-lg` (16) · `rounded-full`                                       | `--ds-radius-*`                           |
| Schatten                     | `shadow-overlay` (nur Dialog, Toast, Toolbar) · `shadow-focus`                                                  | `--ds-shadow-overlay`, `--ds-focus-ring`  |
| Motion                       | `transition-colors` (150 ms) · `duration-slow` (250 ms)                                                         | `--ds-duration*`, `--ds-ease`             |
| Schriftgrade                 | `text-xs` 12 · `text-sm` 13 · `text-md` 14 · `text-lg` 16 · `text-xl` 20 · `text-2xl` 24 · `text-3xl` 32 (Hero) | `--ds-text-xs…3xl`, `--ds-leading*`       |
| Schrift, Gewichte            | `font-sans`, `font-mono`, `font-medium` 500 · `font-semibold` 600 · `font-bold` 700                             | `--ds-font-*`, `--ds-weight-*`            |

Regeln wie im Playlist Generator: Gold ist Vollfläche nur für die Primäraktion, Fokus und aktive
Zustände. Ein Rahmen (1 px), drei Radien, Schatten nur für Overlays. Hover ändert Farbe, nie Größe.
Destruktive Aktionen sind textbasiert (`text-danger`) auf einer flachen Fläche.
`tests/designTokens.spec.ts` verhindert die Rückkehr der alten Palette, von `dark:`-Varianten,
Gradients, Blur und Karten-Schatten.
