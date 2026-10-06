# UI-Komponenten

Bausteine des Design-Systems v2, übernommen aus dem Playlist Generator
(`KodiniTools/Playlist-Generator`, `src/components/ui/`, Stand `89bb48e`). Dort werden sie
gepflegt; Änderungen hier bleiben minimal und werden zurückgespielt. Nicht übernommen: `UiFileList`
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

## Einsatz im Collage Maker

| Stelle                                        | Komponente                                        |
| --------------------------------------------- | ------------------------------------------------- |
| Werkzeug- und Inspektor-Panels                | `UiPanel` (Titel, Zähler, Aktion rechts)          |
| Kopfzeile, Zoom-Pill, Quick-Action-Toolbar    | `UiIconButton`, `UiButton variant="secondary"`    |
| Inspektor-Reiter, Vorlagen-Filter, Textausr.  | `UiSegmentedControl` (Proxy für Union-Typen)      |
| Exportformat, Rahmenstil, Hintergrund-Fit     | `UiSelect`                                        |
| Wiederherstellen, Dateiname, Löschen, Vorlage | `UiDialog` + `UiButton` im Footer                 |
| Tastaturkürzel                                | `UiDialog size="lg"`, `UiKbd`, `UiCallout`        |
| Toasts                                        | `UiToast` in `ToastContainer` (Teleport, z-toast) |
| Hinweise, Warnungen                           | `UiCallout`                                       |
| Leere Listen, keine Auswahl                   | `UiEmptyState`                                    |
| Zurücksetzen neben Slidern                    | `ResetButton` (Hülle um `UiIconButton size="sm"`) |

Union-typisierte Zustände (`'png' | 'jpeg' | …`) binden an `UiSegmentedControl`/`UiSelect` über
einen `computed`-Proxy mit `get`/`set`, damit der Store seinen engen Typ behält.

Breite Modale (Vorlagenbibliothek, Bild- und Exportvorschau) bleiben eigenes Markup auf denselben
Tokens, weil `UiDialog` auf 440/720 px ausgelegt ist.

## Regeln

- Keine Gradients, kein Glow, keine Scale-Hover. Hover ändert nur Farbe, 150 ms.
- Ein Rahmen (1 px), drei Radien (`--ds-radius-sm | -md | -lg`), Schatten nur in Toast und Dialog.
- Primär ist die einzige Goldfläche pro Ansicht; Umschalter zeigen „an“ als primär.
- Danger ist textbasiert (`variant="danger"`), Vollfläche nie.
