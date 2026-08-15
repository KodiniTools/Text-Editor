/**
 * Uebersetzungen fuer Deutsch und Englisch.
 *
 * `de` ist die Referenz: `Messages = typeof de`. Dadurch erzwingt TypeScript,
 * dass `en` exakt dieselben Schluessel (und Funktionssignaturen) hat -- eine
 * vergessene oder zu viel uebersetzte Zeichenkette ist ein Compilerfehler.
 *
 * Werte sind meist Strings; wo Zahlen eingesetzt werden (Trefferzahl,
 * Lesezeit), stehen kleine Funktionen.
 */

export const de = {
  toolbar: {
    new: 'Neu',
    newTitle: 'Neu (Strg+M)',
    open: 'Oeffnen',
    openTitle: 'Datei oeffnen',
    save: 'Speichern',
    saveTitle: 'Herunterladen (Strg+S)',
    asTxt: 'Als .txt',
    asMd: 'Als .md',
    asPdf: 'Als PDF',
    copy: 'Kopieren',
    print: 'Drucken',
    printTitle: 'Drucken (Strg+P)',
    copyTitle: 'Alles kopieren',
    undoTitle: 'Rueckgaengig (Strg+Z)',
    redoTitle: 'Wiederholen (Strg+Y)',
    tools: 'Werkzeuge',
    find: 'Suchen',
    findTitle: 'Suchen & Ersetzen (Strg+F)',
    preview: 'Vorschau',
    previewTitle: 'Markdown-Vorschau',
    focus: 'Fokus',
    focusTitle: 'Fokus-Modus',
    format: 'Format',
    formatTitle: 'Format-Leiste ein-/ausblenden',
  },
  tabs: {
    closeTitle: 'Schliessen',
    newDocTitle: 'Neues Dokument (Strg+M)',
  },
  editor: {
    placeholder: 'Hier schreiben ...',
  },
  find: {
    searchPlaceholder: 'Suchen',
    replacePlaceholder: 'Ersetzen durch',
    prevTitle: 'Vorheriger (Shift+Enter)',
    nextTitle: 'Naechster (Enter)',
    closeTitle: 'Schliessen (Esc)',
    replace: 'Ersetzen',
    replaceAll: 'Alle',
    caseSensitive: 'Gross/Klein',
    wholeWord: 'Ganzes Wort',
    regex: 'Regex',
    matches: (n: number): string =>
      n === 0 ? 'Keine Treffer' : n === 1 ? '1 Treffer' : `${n} Treffer`,
  },
  status: {
    words: 'Woerter',
    characters: 'Zeichen',
    charactersNoSpaces: 'ohne Leerz.',
    lines: 'Zeilen',
    sentences: 'Saetze',
    paragraphs: 'Absaetze',
    readingTime: (n: number): string => (n === 0 ? '0 Min' : `${n} Min Lesezeit`),
    line: 'Z',
    col: 'Sp',
  },
  format: {
    font: 'Schrift',
    fontTitle: 'Schriftart',
    size: 'Groesse',
    sizeLabel: 'Schriftgroesse',
    lineHeight: 'Zeilen',
    lineHeightLabel: 'Zeilenabstand',
    letterSpacing: 'Laufweite',
    letterSpacingLabel: 'Laufweite',
    color: 'Farbe',
    colorAuto: 'Automatisch (Design)',
    colorBlack: 'Schwarz',
    colorGray: 'Grau',
    colorRed: 'Rot',
    colorOrange: 'Orange',
    colorGreen: 'Gruen',
    colorBlue: 'Blau',
    colorViolet: 'Violett',
    customColor: 'Eigene Textfarbe waehlen',
    align: 'Ausrichtung',
    alignLeft: 'Linksbuendig',
    alignCenter: 'Zentriert',
    alignRight: 'Rechtsbuendig',
    alignJustify: 'Blocksatz',
    theme: 'Design',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeAuto: 'Auto',
    wrap: 'Umbruch',
    wrapTitle: 'Lange Zeilen umbrechen',
    reset: 'Zuruecksetzen',
    resetTitle: 'Schrift, Groesse, Abstaende und Farbe zuruecksetzen',
    language: 'Sprache',
    page: 'Seite',
    pageScreen: 'Bildschirm',
    orientationPortrait: 'Hochformat',
    orientationLandscape: 'Querformat',
    pageDefaultHint: '(Standard)',
  },
  stepper: {
    decrease: (label: string): string => `${label} verkleinern`,
    increase: (label: string): string => `${label} vergroessern`,
  },
  focusOverlay: {
    exit: 'Fokus beenden',
  },
  transformMenu: {
    hint: 'Wird auf Auswahl oder ganzen Text angewendet',
  },
  transformGroups: {
    case: 'Gross-/Kleinschreibung',
    whitespace: 'Leerzeichen',
    lines: 'Zeilen',
    reverse: 'Umkehren',
    encoding: 'Kodierung',
  },
  transforms: {
    upper: 'GROSSBUCHSTABEN',
    lower: 'kleinbuchstaben',
    title: 'Titel Schreibweise',
    sentence: 'Satz-Schreibweise',
    toggle: 'gROSS/kLEIN umkehren',
    camel: 'camelCase',
    snake: 'snake_case',
    kebab: 'kebab-case',
    trim: 'Anfang/Ende trimmen',
    trimLines: 'Zeilen trimmen',
    removeEmpty: 'Leerzeilen entfernen',
    collapse: 'Mehrfach-Leerzeichen reduzieren',
    tidy: 'Whitespace aufraeumen',
    tab2space: 'Tabs -> Leerzeichen',
    space2tab: 'Leerzeichen -> Tabs',
    sortAsc: 'Sortieren A-Z',
    sortDesc: 'Sortieren Z-A',
    sortNum: 'Numerisch sortieren',
    reverseLines: 'Reihenfolge umkehren',
    shuffle: 'Zufaellig mischen',
    dedupe: 'Duplikate entfernen',
    numberLines: 'Zeilen nummerieren',
    reverseText: 'Zeichen umkehren',
    reverseWords: 'Woerter umkehren',
    b64enc: 'Base64 kodieren',
    b64dec: 'Base64 dekodieren',
    urlenc: 'URL kodieren',
    urldec: 'URL dekodieren',
    htmlenc: 'HTML kodieren',
    htmldec: 'HTML dekodieren',
  },
  doc: {
    untitled: 'Unbenannt',
    welcomeName: 'Willkommen',
    welcomeBody: `# Willkommen im Kodini Texteditor

Ein datenschutzfreundlicher Texteditor - alles laeuft **lokal im Browser**.
Keine Uploads, keine Server, keine Cookies.

## Funktionen
- Mehrere Dokumente (Tabs), automatisch lokal gespeichert
- Suchen & Ersetzen (inkl. Regex)
- Ueber 30 Text-Transformationen (Gross/Klein, Sortieren, Kodierung, ...)
- Live Markdown-Vorschau
- Statistik: Woerter, Zeichen, Lesezeit
- Hell/Dunkel, Fokus-Modus, Export als .txt/.md

Tipp: Strg+F zum Suchen, Strg+S zum Herunterladen.
`,
  },
}

// Kein `as const`: die Werte sollen als `string` (bzw. Funktion) typisiert sein,
// nicht als die konkreten deutschen Literale -- sonst muesste `en` Wort fuer Wort
// dem deutschen Text gleichen. Die Schluesselstruktur erzwingt `en` trotzdem.
export type Messages = typeof de

export const en: Messages = {
  toolbar: {
    new: 'New',
    newTitle: 'New (Ctrl+M)',
    open: 'Open',
    openTitle: 'Open file',
    save: 'Save',
    saveTitle: 'Download (Ctrl+S)',
    asTxt: 'As .txt',
    asMd: 'As .md',
    asPdf: 'As PDF',
    copy: 'Copy',
    print: 'Print',
    printTitle: 'Print (Ctrl+P)',
    copyTitle: 'Copy all',
    undoTitle: 'Undo (Ctrl+Z)',
    redoTitle: 'Redo (Ctrl+Y)',
    tools: 'Tools',
    find: 'Find',
    findTitle: 'Find & Replace (Ctrl+F)',
    preview: 'Preview',
    previewTitle: 'Markdown preview',
    focus: 'Focus',
    focusTitle: 'Focus mode',
    format: 'Format',
    formatTitle: 'Toggle format bar',
  },
  tabs: {
    closeTitle: 'Close',
    newDocTitle: 'New document (Ctrl+M)',
  },
  editor: {
    placeholder: 'Write here ...',
  },
  find: {
    searchPlaceholder: 'Search',
    replacePlaceholder: 'Replace with',
    prevTitle: 'Previous (Shift+Enter)',
    nextTitle: 'Next (Enter)',
    closeTitle: 'Close (Esc)',
    replace: 'Replace',
    replaceAll: 'All',
    caseSensitive: 'Case',
    wholeWord: 'Whole word',
    regex: 'Regex',
    matches: (n: number): string => (n === 0 ? 'No matches' : n === 1 ? '1 match' : `${n} matches`),
  },
  status: {
    words: 'words',
    characters: 'characters',
    charactersNoSpaces: 'without spaces',
    lines: 'lines',
    sentences: 'sentences',
    paragraphs: 'paragraphs',
    readingTime: (n: number): string => (n === 0 ? '0 min' : `${n} min read`),
    line: 'Ln',
    col: 'Col',
  },
  format: {
    font: 'Font',
    fontTitle: 'Font family',
    size: 'Size',
    sizeLabel: 'Font size',
    lineHeight: 'Line',
    lineHeightLabel: 'Line height',
    letterSpacing: 'Spacing',
    letterSpacingLabel: 'Letter spacing',
    color: 'Color',
    colorAuto: 'Automatic (theme)',
    colorBlack: 'Black',
    colorGray: 'Gray',
    colorRed: 'Red',
    colorOrange: 'Orange',
    colorGreen: 'Green',
    colorBlue: 'Blue',
    colorViolet: 'Violet',
    customColor: 'Choose custom text color',
    align: 'Alignment',
    alignLeft: 'Left',
    alignCenter: 'Center',
    alignRight: 'Right',
    alignJustify: 'Justify',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'Auto',
    wrap: 'Wrap',
    wrapTitle: 'Wrap long lines',
    reset: 'Reset',
    resetTitle: 'Reset font, size, spacing and color',
    language: 'Language',
    page: 'Page',
    pageScreen: 'Screen',
    orientationPortrait: 'Portrait',
    orientationLandscape: 'Landscape',
    pageDefaultHint: '(default)',
  },
  stepper: {
    decrease: (label: string): string => `Decrease ${label.toLowerCase()}`,
    increase: (label: string): string => `Increase ${label.toLowerCase()}`,
  },
  focusOverlay: {
    exit: 'Exit focus',
  },
  transformMenu: {
    hint: 'Applies to selection or whole text',
  },
  transformGroups: {
    case: 'Case',
    whitespace: 'Whitespace',
    lines: 'Lines',
    reverse: 'Reverse',
    encoding: 'Encoding',
  },
  transforms: {
    upper: 'UPPERCASE',
    lower: 'lowercase',
    title: 'Title Case',
    sentence: 'Sentence case',
    toggle: 'tOGGLE cASE',
    camel: 'camelCase',
    snake: 'snake_case',
    kebab: 'kebab-case',
    trim: 'Trim start/end',
    trimLines: 'Trim lines',
    removeEmpty: 'Remove blank lines',
    collapse: 'Collapse multiple spaces',
    tidy: 'Tidy whitespace',
    tab2space: 'Tabs -> spaces',
    space2tab: 'Spaces -> tabs',
    sortAsc: 'Sort A-Z',
    sortDesc: 'Sort Z-A',
    sortNum: 'Sort numerically',
    reverseLines: 'Reverse order',
    shuffle: 'Shuffle randomly',
    dedupe: 'Remove duplicates',
    numberLines: 'Number lines',
    reverseText: 'Reverse characters',
    reverseWords: 'Reverse words',
    b64enc: 'Base64 encode',
    b64dec: 'Base64 decode',
    urlenc: 'URL encode',
    urldec: 'URL decode',
    htmlenc: 'HTML encode',
    htmldec: 'HTML decode',
  },
  doc: {
    untitled: 'Untitled',
    welcomeName: 'Welcome',
    welcomeBody: `# Welcome to the Kodini Text Editor

A privacy-friendly text editor - everything runs **locally in your browser**.
No uploads, no servers, no cookies.

## Features
- Multiple documents (tabs), saved locally and automatically
- Find & Replace (incl. regex)
- Over 30 text transformations (case, sorting, encoding, ...)
- Live Markdown preview
- Statistics: words, characters, reading time
- Light/Dark, focus mode, export as .txt/.md

Tip: Ctrl+F to search, Ctrl+S to download.
`,
  },
}

export const MESSAGES = { de, en } as const
