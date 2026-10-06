# UI-Komponenten

Bausteine des Design-Systems v2, übernommen aus dem Collage Maker
(`KodiniTools/Collage-Maker`, `src/components/ui/`, Stand `9dc4eca`), der sie seinerseits aus dem
Playlist Generator (`89bb48e`) übernommen hat. Dort werden sie gepflegt; Änderungen hier bleiben
minimal und werden zurückgespielt. Nicht übernommen: `UiFileList`
(Wiedergabeliste, hier ohne Verwendung). Ergänzt: `UiDialog` kennt `size="lg"` (720 px) für
Übersichten wie die Tastaturkürzel.

Alle Komponenten:

- `<script setup lang="ts">` mit typisierten Props, Vue 3.5 (`defineModel`, `useId`).
- Styling ausschließlich über `--ds-*` Tokens aus `src/design-system/tokens-v2.css`, scoped CSS.
- Native Elemente (`<button>`, `<input>`, `<label>`, `<section>`), Fokus-Ring statt Glow.
- Icons kommen über Slots als Inline-SVG (Lucide-Stil, Stroke 1.75).
- Je ein Vitest unter `__tests__/`.

```ts
import { UiButton, UiPanel, UiTextField } from '@/components/ui'
```

| Komponente           | Zweck                                           | Wichtige Props / Events                                                                                                   |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `UiButton`           | Textbutton; `to` = RouterLink, `href` = a       | `variant` primary · secondary · ghost · danger, `size` sm · md · lg, `block`, Slot `icon`                                 |
| `UiIconButton`       | Quadratischer Icon-Button                       | `label` (Pflicht, wird aria-label und title), `variant` ghost · secondary · primary, `size` sm · md, `round`, `pressed`   |
| `UiPanel`            | Flache Fläche mit Kopfzeile                     | `title`, `headingLevel` 2 · 3, `count`, `padded`, Slot `actions`                                                          |
| `UiCallout`          | Ruhiger Hinweis im Textfluss                    | `type` info · success · warning · danger, `title`, Slot default                                                           |
| `UiEmptyState`       | Leerzustand                                     | `title`, `text`, Slots `icon` · `action`                                                                                  |
| `UiSegmentedControl` | Eine Option aus wenigen, Radiogroup-Muster      | `v-model` (string), `options` `{ value, label, disabled? }`, `label`, `size`; Pfeiltasten wechseln                        |
| `UiSelect`           | Natives Select im System-Look                   | `v-model` (string), `options`, `label` (Pflicht), `inline`, `labelHidden`, `size`; Attrs → select                         |
| `UiTextField`        | Einzeiliges Textfeld mit Label                  | `v-model`, `label`, `hint`, `error` (aria-invalid, role=alert), `required`, `disabled`, Attrs → input                     |
| `UiDialog`           | Modaler Dialog (Teleport, hier `#modal-portal`) | `open`, `title`, `description`, `closeLabel`, `size` md · lg, `teleportTo`, `id`, Slots default · `footer`; Event `close` |
| `UiToast`            | Benachrichtigung                                | `message`, `type` success · error · info, `actionLabel`, `dismissLabel`, `dismissOnClick`; Events `action`, `dismiss`     |
| `UiKbd`              | Tastenkombination                               | `keys: string[]`                                                                                                          |

## Einsatz im Texteditor

| Stelle                                           | Komponente                                                |
| ------------------------------------------------ | --------------------------------------------------------- |
| Tastaturkürzel (`ShortcutHelp`)                  | `UiDialog size="lg"` (Teleport `#modal-portal`), `UiKbd`  |
| Toasts (`ToastHost`)                             | `UiToast` (Teleport, z-toast)                             |
| Suchen/Ersetzen                                  | `UiButton variant="secondary" size="sm"`, `UiIconButton`  |
| Link-Popover (Formatleiste, Bild)                | `UiButton` primary / danger                               |
| Vorschau-Kopf (`PreviewView`), Markdown-Vorschau | `UiButton` secondary / primary / ghost, `UiIconButton`    |
| Zoom-Pill und Fokus-Modus (`EditorView`)         | `UiIconButton size="sm" round`, `UiButton ghost`, `UiKbd` |

Werkzeug-, Format- und Tab-Leiste bleiben eigenes Markup auf denselben Tokens (`.tb-btn`,
`.seg-btn`, `.menu-item`, `.fb-select`): sie tragen `aria-pressed`, Anker-Refs für
`useAnchoredMenu` und `@mousedown.prevent`, damit die Textauswahl beim Klick erhalten bleibt.
Dropdowns und Popover teleportieren nach `#modal-portal` (siehe `style.css`).

## Regeln

- Keine Gradients, kein Glow, keine Scale-Hover. Hover ändert nur Farbe, 150 ms.
- Ein Rahmen (1 px), drei Radien (`--ds-radius-sm | -md | -lg`), Schatten nur in Toast und Dialog.
- Primär ist die einzige Goldfläche pro Ansicht; Umschalter zeigen „an“ als primär.
- Danger ist textbasiert (`variant="danger"`), Vollfläche nie.
