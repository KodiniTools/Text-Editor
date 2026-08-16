import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_FONT_ID } from '@/config/fonts'
import { messages } from '@/i18n'
import { MESSAGES } from '@/i18n/messages'
import { contentToHtml, contentToPlain } from '@/utils/richText'
import {
  isOrientation,
  isPageFormatId,
  type PageFormatId,
  type PageOrientation,
} from '@/utils/pageFormats'

/**
 * Ein frei platziertes Bild. Position/Groesse sind content-relativ in px bei
 * 96 dpi -- also im selben Koordinatensystem wie der Textbereich einer Seite
 * (Breite = Papierbreite minus Rand). Dadurch stimmen Editor, Vorschau und PDF
 * exakt ueberein. `y` laeuft ueber mehrere Seiten hinweg durch (Content-Hoehe).
 */
export interface ImagePlacement {
  id: string
  /** Bildquelle als data:-URL. */
  src: string
  x: number
  y: number
  w: number
  h: number
}

export interface EditorDocument {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
  images?: ImagePlacement[]
}

export type ThemeMode = 'light' | 'dark' | 'system'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface EditorSettings {
  theme: ThemeMode
  /** ID aus @/config/fonts (z. B. 'sans' oder eine eigene Schrift). */
  fontFamily: string
  fontSize: number
  lineHeight: number
  /** Laufweite in px. 0 = normal. */
  letterSpacing: number
  /** Textfarbe als Hex ('#1f2937'). Leer = Farbe des Designs. */
  textColor: string
  textAlign: TextAlign
  wordWrap: boolean
  /** Papierformat der Seiten-Ansicht ('none' = bildschirmfuellend). */
  pageFormat: PageFormatId
  pageOrientation: PageOrientation
  /** Zoom der Seiten-Ansicht (1 = 100 %). Nur Darstellung, nicht im Export. */
  pageZoom: number
  showPreview: boolean
  showFormatBar: boolean
  focusMode: boolean
  autoSave: boolean
}

/** Grenzen der Format-Einstellungen -- auch von der Format-Leiste genutzt. */
export const LIMITS = {
  fontSize: { min: 10, max: 42, step: 1 },
  lineHeight: { min: 1, max: 3, step: 0.1 },
  letterSpacing: { min: -1, max: 8, step: 0.1 },
  zoom: { min: 0.5, max: 2, step: 0.1 },
} as const

/** Die Darstellungs-Einstellungen, die per Undo/Redo erfasst werden. */
export type FormatState = Pick<
  EditorSettings,
  | 'fontFamily'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'textColor'
  | 'textAlign'
  | 'wordWrap'
>

export const FORMAT_KEYS: (keyof FormatState)[] = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'textColor',
  'textAlign',
  'wordWrap',
]

/**
 * Ein Zustand fuer die History: Inhalt UND Darstellung. Beide teilen sich eine
 * Zeitachse, damit sowohl Tippen als auch Aenderungen in der Format-Leiste mit
 * demselben Undo/Redo zurueckgenommen werden koennen.
 */
interface Snapshot {
  content: string
  format: FormatState
  images: ImagePlacement[]
}

/** Tiefe (flache) Kopie der Bildliste fuer die History. */
function cloneImages(images?: ImagePlacement[]): ImagePlacement[] {
  return (images ?? []).map((i) => ({ ...i }))
}

/** Vergleicht zwei Bildlisten nach Position/Groesse (nicht der Quelle). */
function sameImages(a: ImagePlacement[], b: ImagePlacement[]): boolean {
  if (a.length !== b.length) return false
  return a.every((img, i) => {
    const o = b[i]!
    return img.id === o.id && img.x === o.x && img.y === o.y && img.w === o.w && img.h === o.h
  })
}

interface HistoryEntry {
  past: Snapshot[]
  future: Snapshot[]
}

const STORAGE_DOCS = 'kodini-editor-docs-v1'
const STORAGE_ACTIVE = 'kodini-editor-active-v1'
const STORAGE_SETTINGS = 'kodini-editor-settings-v1'
const HISTORY_LIMIT = 200

/** Format der Sicherungsdatei (alle Dokumente + Einstellungen als JSON). */
export const BACKUP_VERSION = 1
export const BACKUP_APP_ID = 'kodini-texteditor'

export interface BackupFile {
  app: typeof BACKUP_APP_ID
  type: 'backup'
  version: number
  exportedAt: number
  documents: EditorDocument[]
  activeId?: string
  settings?: Partial<EditorSettings>
}
const TYPING_DEBOUNCE = 500
const FORMAT_DEBOUNCE = 400

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'system',
  fontFamily: DEFAULT_FONT_ID,
  fontSize: 16,
  lineHeight: 1.7,
  letterSpacing: 0,
  textColor: '',
  textAlign: 'left',
  wordWrap: true,
  pageFormat: 'none',
  pageOrientation: 'portrait',
  pageZoom: 1,
  showPreview: false,
  showFormatBar: true,
  focusMode: false,
  autoSave: true,
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/**
 * Bringt geladene Settings auf gueltige Werte.
 *
 * Noetig, weil im localStorage Staende aus aelteren Versionen liegen koennen
 * (fehlende Felder, entfernte Schrift-IDs) und weil textColor als Inline-Style
 * verwendet wird -- dort landet nur validiertes Hex.
 */
export function normalizeSettings(raw: Partial<EditorSettings>): EditorSettings {
  const s: EditorSettings = { ...DEFAULT_SETTINGS, ...raw }
  return {
    ...s,
    // Bewusst nicht gegen die Schriftenliste geprueft: die Schriften vom Server
    // kommen erst nach dem Laden der Settings dazu. Eine unbekannte ID faellt
    // beim Anzeigen ueber findFont auf die Standardschrift zurueck.
    fontFamily:
      typeof s.fontFamily === 'string' && s.fontFamily ? s.fontFamily : DEFAULT_SETTINGS.fontFamily,
    fontSize: clamp(
      s.fontSize,
      LIMITS.fontSize.min,
      LIMITS.fontSize.max,
      DEFAULT_SETTINGS.fontSize,
    ),
    lineHeight: clamp(
      s.lineHeight,
      LIMITS.lineHeight.min,
      LIMITS.lineHeight.max,
      DEFAULT_SETTINGS.lineHeight,
    ),
    letterSpacing: clamp(
      s.letterSpacing,
      LIMITS.letterSpacing.min,
      LIMITS.letterSpacing.max,
      DEFAULT_SETTINGS.letterSpacing,
    ),
    textColor: HEX_COLOR.test(String(s.textColor)) ? s.textColor : '',
    textAlign: (['left', 'center', 'right', 'justify'] as const).includes(s.textAlign)
      ? s.textAlign
      : DEFAULT_SETTINGS.textAlign,
    pageFormat: isPageFormatId(s.pageFormat) ? s.pageFormat : DEFAULT_SETTINGS.pageFormat,
    pageOrientation: isOrientation(s.pageOrientation)
      ? s.pageOrientation
      : DEFAULT_SETTINGS.pageOrientation,
    pageZoom: clamp(s.pageZoom, LIMITS.zoom.min, LIMITS.zoom.max, DEFAULT_SETTINGS.pageZoom),
  }
}

/** Standard-"Unbenannt"-Namen beider Sprachen (auch "Unbenannt 2", "Untitled 3", ...). */
const UNTITLED_NAMES = [MESSAGES.de.doc.untitled, MESSAGES.en.doc.untitled]

function isUntitledName(name: string): boolean {
  return UNTITLED_NAMES.some(
    (u) => name === u || (name.startsWith(`${u} `) && /^\d+$/.test(name.slice(u.length + 1))),
  )
}

/** Erste nicht-leere Zeile als Titel (ohne Markdown-Rautezeichen, gekuerzt). */
function firstContentLine(content: string): string {
  const plain = contentToPlain(content)
  const line = plain
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.length > 0)
  if (!line) return ''
  return line.replace(/^#+\s*/, '').slice(0, 60)
}

/**
 * Anzeigename eines Dokuments. Solange es "Unbenannt" heisst (nie umbenannt),
 * wird der Titel aus der ersten Textzeile abgeleitet -- so unterscheiden sich
 * die Tabs von allein, ohne dass der Nutzer etwas tun muss. Ein bewusst
 * vergebener Name (Umbenennen, Import) bleibt unveraendert.
 */
export function documentTitle(doc: EditorDocument): string {
  if (!isUntitledName(doc.name)) return doc.name
  return firstContentLine(doc.content) || doc.name
}

function uid(): string {
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function createDocument(name = messages().doc.untitled, content = ''): EditorDocument {
  const now = Date.now()
  return { id: uid(), name, content, createdAt: now, updatedAt: now }
}

function loadDocs(): EditorDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_DOCS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EditorDocument[]
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    /* ignore korrupte Daten */
  }
  return []
}

function loadSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS)
    if (raw) {
      const s = normalizeSettings(JSON.parse(raw) as Partial<EditorSettings>)
      // Fokus-Modus ist ein Sitzungszustand -- beim Laden nie aktiv, damit ein
      // Neustart immer aus dem Fokus herausfuehrt (kein Steckenbleiben).
      s.focusMode = false
      return s
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS }
}

export const useEditorStore = defineStore('editor', () => {
  /* ---------- State ---------- */
  const documents = ref<EditorDocument[]>(loadDocs())
  const settings = reactive<EditorSettings>(loadSettings())
  const activeId = ref<string>('')

  // History nur im Speicher (nicht persistiert)
  const history = new Map<string, HistoryEntry>()
  // Reaktiver Zaehler: die Map selbst ist nicht reaktiv, daher triggern wir
  // canUndo/canRedo ueber diese Version bei jeder History-Aenderung.
  const historyVersion = ref(0)
  const touch = (): void => {
    historyVersion.value++
  }
  let typingTimer: ReturnType<typeof setTimeout> | null = null
  let typingBase: string | null = null
  // Ausstehende Format-Aenderung: der Zustand VOR der ersten Aenderung eines
  // Schubs. Schnell aufeinanderfolgende Aenderungen (Stepper-Klicks,
  // Farbwaehler-Ziehen) werden so zu einer Undo-Stufe zusammengefasst.
  let formatTimer: ReturnType<typeof setTimeout> | null = null
  let formatBase: FormatState | null = null
  // Welche Felder der offene Format-Schub betrifft. Nur gleiche Felder werden
  // zusammengefasst (viele Stepper-Klicks, Farbwaehler-Ziehen = eine Stufe);
  // ein Wechsel auf ein anderes Feld schliesst die offene Stufe ab.
  let formatKeys: string | null = null
  // Zustand VOR einer Bild-Geste (Ziehen/Skalieren). Die ganze Geste wird zu
  // EINER Undo-Stufe zusammengefasst (Start bei pointerdown, Ende bei pointerup).
  let imageBase: { docId: string; images: ImagePlacement[] } | null = null

  /* ---------- Init ---------- */
  // Ohne gespeicherte Dokumente mit einem leeren, unbenannten Blatt starten.
  if (documents.value.length === 0) {
    documents.value.push(createDocument())
  }
  const storedActive = localStorage.getItem(STORAGE_ACTIVE)
  activeId.value =
    storedActive && documents.value.some((d) => d.id === storedActive)
      ? storedActive
      : documents.value[0]!.id

  /* ---------- Getter ---------- */
  const activeDoc = computed<EditorDocument | undefined>(() =>
    documents.value.find((d) => d.id === activeId.value),
  )
  const activeContent = computed(() => activeDoc.value?.content ?? '')
  /** Inhalt als bereinigtes HTML (Editor, Vorschau, PDF, Druck). */
  const activeHtml = computed(() => contentToHtml(activeContent.value))
  /** Inhalt als reiner Text (Statistik, .txt/.md, Kopieren, Suchen). */
  const activePlain = computed(() => contentToPlain(activeContent.value))
  /** Frei platzierte Bilder des aktiven Dokuments. */
  const activeImages = computed<ImagePlacement[]>(() => activeDoc.value?.images ?? [])
  /** Anzeigename des aktiven Dokuments (fuer Download-/PDF-Dateinamen). */
  const activeTitle = computed(() =>
    activeDoc.value ? documentTitle(activeDoc.value) : messages().doc.untitled,
  )

  function ensureHistory(id: string): HistoryEntry {
    let h = history.get(id)
    if (!h) {
      h = { past: [], future: [] }
      history.set(id, h)
    }
    return h
  }

  const canUndo = computed(() => {
    void historyVersion.value
    return ensureHistory(activeId.value).past.length > 0
  })
  const canRedo = computed(() => {
    void historyVersion.value
    return ensureHistory(activeId.value).future.length > 0
  })

  /* ---------- History-Helfer ---------- */
  function captureFormat(): FormatState {
    const f = {} as FormatState
    for (const key of FORMAT_KEYS) (f[key] as EditorSettings[typeof key]) = settings[key]
    return f
  }

  function applyFormat(format: FormatState): void {
    Object.assign(settings, normalizeSettings({ ...settings, ...format }))
  }

  function sameFormat(a: FormatState, b: FormatState): boolean {
    return FORMAT_KEYS.every((k) => a[k] === b[k])
  }

  function pushPast(id: string, snap: Snapshot): void {
    const h = ensureHistory(id)
    h.past.push(snap)
    if (h.past.length > HISTORY_LIMIT) h.past.shift()
    h.future = []
    touch()
  }

  /** Committet eine offene Tipp-Sequenz als eine History-Stufe. */
  function flushTyping(): void {
    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }
    const doc = activeDoc.value
    if (doc && typingBase !== null && typingBase !== doc.content) {
      // Tippen aendert keine Bilder -> aktuelle Bildliste uebernehmen.
      pushPast(doc.id, {
        content: typingBase,
        format: captureFormat(),
        images: cloneImages(doc.images),
      })
    }
    typingBase = null
  }

  /** Committet eine offene Format-Sequenz als eine History-Stufe. */
  function flushFormat(): void {
    if (formatTimer) {
      clearTimeout(formatTimer)
      formatTimer = null
    }
    const doc = activeDoc.value
    if (doc && formatBase !== null && !sameFormat(formatBase, captureFormat())) {
      pushPast(doc.id, {
        content: doc.content,
        format: formatBase,
        images: cloneImages(doc.images),
      })
    }
    formatBase = null
    formatKeys = null
  }

  /** Committet eine offene Bild-Geste (Ziehen/Skalieren) als eine History-Stufe. */
  function flushImage(): void {
    if (imageBase === null) return
    const doc = documents.value.find((d) => d.id === imageBase!.docId)
    if (doc && !sameImages(imageBase.images, doc.images ?? [])) {
      pushPast(doc.id, {
        content: doc.content,
        format: captureFormat(),
        images: imageBase.images,
      })
    }
    imageBase = null
  }

  /** Committet alles Offene (vor Undo/Redo, Dokumentwechsel, ...). */
  function flushPending(): void {
    flushTyping()
    flushFormat()
    flushImage()
  }

  /* ---------- Actions: Inhalt ---------- */

  /** Wird beim Tippen (v-model) aufgerufen. Sammelt History debounced. */
  function updateContent(content: string): void {
    const doc = activeDoc.value
    if (!doc || doc.content === content) return
    // Offene Format-/Bild-Aenderung zuerst festschreiben, damit die Zeitachse
    // linear bleibt (erst formatieren, dann tippen = zwei getrennte Stufen).
    flushFormat()
    flushImage()
    if (typingBase === null) typingBase = doc.content
    doc.content = content
    doc.updatedAt = Date.now()
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = setTimeout(flushTyping, TYPING_DEBOUNCE)
  }

  /** Leert das aktive Dokument -- eine Undo-Stufe, per Undo wiederherstellbar. */
  function clearActiveDocument(): void {
    replaceContent('')
  }

  /* ---------- Bilder ---------- */
  const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,/i

  /** Fuegt ein Bild hinzu (nur gueltige Bild-data-URLs) -> eine Undo-Stufe. */
  function addImage(image: Omit<ImagePlacement, 'id'>): string | null {
    const doc = activeDoc.value
    if (!doc || !DATA_IMAGE.test(image.src)) return null
    flushPending()
    pushPast(doc.id, {
      content: doc.content,
      format: captureFormat(),
      images: cloneImages(doc.images),
    })
    if (!doc.images) doc.images = []
    const id = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    doc.images.push({ id, ...image })
    doc.updatedAt = Date.now()
    return id
  }

  /**
   * Beginnt eine Bild-Geste (Ziehen/Skalieren). Merkt den Zustand VOR der Geste,
   * damit die anschliessenden updateImage-Aufrufe zu EINER Undo-Stufe werden.
   * Der Editor ruft das bei pointerdown, commitImageChange bei pointerup.
   */
  function beginImageChange(): void {
    const doc = activeDoc.value
    if (!doc || imageBase !== null) return
    flushTyping()
    flushFormat()
    imageBase = { docId: doc.id, images: cloneImages(doc.images) }
  }

  /** Schliesst die Bild-Geste ab (schreibt bei Aenderung eine Undo-Stufe). */
  function commitImageChange(): void {
    flushImage()
  }

  /** Aendert Position/Groesse eines Bildes (History via begin/commitImageChange). */
  function updateImage(id: string, patch: Partial<Omit<ImagePlacement, 'id' | 'src'>>): void {
    const img = activeDoc.value?.images?.find((i) => i.id === id)
    if (!img) return
    Object.assign(img, patch)
    if (activeDoc.value) activeDoc.value.updatedAt = Date.now()
  }

  /** Entfernt ein Bild -> eine Undo-Stufe (per Undo wiederherstellbar). */
  function removeImage(id: string): void {
    const doc = activeDoc.value
    if (!doc?.images) return
    const idx = doc.images.findIndex((i) => i.id === id)
    if (idx === -1) return
    flushPending()
    pushPast(doc.id, {
      content: doc.content,
      format: captureFormat(),
      images: cloneImages(doc.images),
    })
    doc.images.splice(idx, 1)
    doc.updatedAt = Date.now()
  }

  /** Ersetzt den Inhalt in einem Schritt (Transform / Paste / Import) -> eine History-Stufe. */
  function replaceContent(content: string): void {
    const doc = activeDoc.value
    if (!doc || doc.content === content) return
    flushPending()
    pushPast(doc.id, {
      content: doc.content,
      format: captureFormat(),
      images: cloneImages(doc.images),
    })
    doc.content = content
    doc.updatedAt = Date.now()
  }

  /**
   * Wandelt den aktiven Inhalt einmalig in HTML um, falls er noch als reiner
   * Text vorliegt (aeltere Staende). Ohne History-Eintrag --
   * es ist nur ein Formatwechsel des Speicherwerts, keine inhaltliche Aenderung.
   * Der Editor ruft das beim Oeffnen/Doc-Wechsel auf, damit sein innerHTML dem
   * gespeicherten Wert 1:1 entspricht (sonst wuerde der Editor bei jedem Tippen
   * neu gerendert und der Cursor spraenge).
   */
  function normalizeActiveToHtml(): void {
    const doc = activeDoc.value
    if (!doc) return
    const html = contentToHtml(doc.content)
    if (html !== doc.content) doc.content = html
  }

  /** Aenderung der Darstellung (Format-Leiste) -> debounced eine History-Stufe. */
  function recordFormatChange(patch: Partial<FormatState>): void {
    const doc = activeDoc.value
    if (!doc) {
      Object.assign(settings, normalizeSettings({ ...settings, ...patch }))
      return
    }
    // Offene Tipp-/Bild-Sequenz zuerst festschreiben (siehe updateContent).
    flushTyping()
    flushImage()
    const keys = Object.keys(patch).sort().join(',')
    // Betrifft die Aenderung andere Felder als der offene Schub, diesen zuerst
    // als eigene Stufe abschliessen.
    if (formatBase !== null && keys !== formatKeys) flushFormat()
    if (formatBase === null) {
      formatBase = captureFormat()
      formatKeys = keys
    }
    Object.assign(settings, normalizeSettings({ ...settings, ...patch }))
    if (formatTimer) clearTimeout(formatTimer)
    formatTimer = setTimeout(flushFormat, FORMAT_DEBOUNCE)
  }

  function undo(): void {
    flushPending()
    const doc = activeDoc.value
    if (!doc) return
    const h = ensureHistory(doc.id)
    const prev = h.past.pop()
    if (prev === undefined) return
    h.future.push({
      content: doc.content,
      format: captureFormat(),
      images: cloneImages(doc.images),
    })
    doc.content = prev.content
    doc.updatedAt = Date.now()
    applyFormat(prev.format)
    doc.images = cloneImages(prev.images)
    touch()
  }

  function redo(): void {
    flushPending()
    const doc = activeDoc.value
    if (!doc) return
    const h = ensureHistory(doc.id)
    const next = h.future.pop()
    if (next === undefined) return
    h.past.push({ content: doc.content, format: captureFormat(), images: cloneImages(doc.images) })
    doc.content = next.content
    doc.updatedAt = Date.now()
    applyFormat(next.format)
    doc.images = cloneImages(next.images)
    touch()
  }

  /* ---------- Actions: Dokumente ---------- */

  function newDocument(name = messages().doc.untitled): string {
    flushPending()
    const doc = createDocument(uniqueName(name))
    documents.value.push(doc)
    activeId.value = doc.id
    return doc.id
  }

  function uniqueName(base: string): string {
    const names = new Set(documents.value.map((d) => d.name))
    if (!names.has(base)) return base
    let i = 2
    while (names.has(`${base} ${i}`)) i++
    return `${base} ${i}`
  }

  function openDocument(name: string, content: string): string {
    flushPending()
    const doc = createDocument(uniqueName(name || messages().doc.untitled), content)
    documents.value.push(doc)
    activeId.value = doc.id
    return doc.id
  }

  function switchDocument(id: string): void {
    if (documents.value.some((d) => d.id === id)) {
      flushPending()
      activeId.value = id
    }
  }

  function renameDocument(id: string, name: string): void {
    const doc = documents.value.find((d) => d.id === id)
    if (doc) doc.name = name.trim() || doc.name
  }

  function closeDocument(id: string): void {
    const idx = documents.value.findIndex((d) => d.id === id)
    if (idx === -1) return
    documents.value.splice(idx, 1)
    history.delete(id)
    touch()
    if (documents.value.length === 0) {
      documents.value.push(createDocument())
    }
    if (activeId.value === id) {
      const fallback = documents.value[Math.max(0, idx - 1)]!
      activeId.value = fallback.id
    }
  }

  /* ---------- Settings ---------- */
  /**
   * Aendert Einstellungen. Aenderungen an der Textdarstellung (FORMAT_KEYS)
   * landen in der Undo/Redo-Historie; App-Zustand wie Theme, Vorschau oder
   * Fokus-Modus wird direkt und ohne History uebernommen.
   */
  function updateSettings(patch: Partial<EditorSettings>): void {
    const formatPatch: Partial<FormatState> = {}
    const otherPatch: Partial<EditorSettings> = {}
    let hasFormat = false
    let hasOther = false
    for (const key of Object.keys(patch) as (keyof EditorSettings)[]) {
      if ((FORMAT_KEYS as string[]).includes(key)) {
        ;(formatPatch as Record<string, unknown>)[key] = patch[key]
        hasFormat = true
      } else {
        ;(otherPatch as Record<string, unknown>)[key] = patch[key]
        hasOther = true
      }
    }
    if (hasOther) Object.assign(settings, normalizeSettings({ ...settings, ...otherPatch }))
    if (hasFormat) recordFormatChange(formatPatch)
  }

  /** Setzt nur die Textdarstellung zurueck -- eine Undo-Stufe; Rest bleibt. */
  function resetFormatting(): void {
    recordFormatChange({
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      fontSize: DEFAULT_SETTINGS.fontSize,
      lineHeight: DEFAULT_SETTINGS.lineHeight,
      letterSpacing: DEFAULT_SETTINGS.letterSpacing,
      textColor: DEFAULT_SETTINGS.textColor,
      textAlign: DEFAULT_SETTINGS.textAlign,
      wordWrap: DEFAULT_SETTINGS.wordWrap,
    })
  }

  /* ---------- Sicherung (Backup / Restore) ---------- */
  /**
   * Erstellt eine vollstaendige Sicherung: alle Dokumente (inkl. Bilder), das
   * aktive Dokument und die Einstellungen. Reines JSON-taugliches Objekt.
   */
  function exportBackup(): BackupFile {
    flushPending()
    return {
      app: BACKUP_APP_ID,
      type: 'backup',
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      documents: documents.value.map((d) => ({
        ...d,
        images: cloneImages(d.images),
      })),
      activeId: activeId.value,
      settings: { ...settings },
    }
  }

  /** Prueft und bereinigt ein einzelnes Dokument aus einer Fremddatei. */
  function sanitizeImportedDoc(d: Partial<EditorDocument>): EditorDocument {
    const now = Date.now()
    const name =
      typeof d.name === 'string' && d.name.trim() ? d.name.slice(0, 200) : messages().doc.untitled
    const images = Array.isArray(d.images)
      ? d.images
          .filter((im) => im && DATA_IMAGE.test(String(im.src)))
          .map((im) => ({
            id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            src: String(im.src),
            x: Number.isFinite(im.x) ? Math.round(im.x) : 0,
            y: Number.isFinite(im.y) ? Math.round(im.y) : 0,
            w: Number.isFinite(im.w) ? Math.max(1, Math.round(im.w)) : 1,
            h: Number.isFinite(im.h) ? Math.max(1, Math.round(im.h)) : 1,
          }))
      : []
    return {
      id: uid(),
      name,
      // Inhalt ueber contentToHtml -> immer bereinigtes, sicheres HTML.
      content: contentToHtml(typeof d.content === 'string' ? d.content : ''),
      createdAt: typeof d.createdAt === 'number' ? d.createdAt : now,
      updatedAt: now,
      ...(images.length ? { images } : {}),
    }
  }

  /**
   * Stellt eine Sicherung wieder her, indem ihre Dokumente **hinzugefuegt**
   * werden (nicht ersetzt) -- so gehen vorhandene Dokumente nie verloren. Jedes
   * importierte Dokument bekommt eine neue ID. Gibt die Anzahl importierter
   * Dokumente zurueck (0 = keine gueltige Sicherung).
   */
  function importBackup(raw: unknown): number {
    const data = raw as Partial<BackupFile> | null
    if (!data || data.app !== BACKUP_APP_ID || !Array.isArray(data.documents)) return 0
    const incoming = data.documents.filter((d) => d && typeof d === 'object')
    if (incoming.length === 0) return 0
    flushPending()
    let firstNewId = ''
    for (const d of incoming) {
      const doc = sanitizeImportedDoc(d)
      documents.value.push(doc)
      if (!firstNewId) firstNewId = doc.id
    }
    if (firstNewId) activeId.value = firstNewId
    return incoming.length
  }

  /* ---------- Persistenz ---------- */
  watch(
    documents,
    (docs) => {
      if (settings.autoSave) localStorage.setItem(STORAGE_DOCS, JSON.stringify(docs))
    },
    { deep: true },
  )
  watch(activeId, (id) => localStorage.setItem(STORAGE_ACTIVE, id))
  watch(settings, (s) => localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s)), { deep: true })

  /**
   * Schreibt den aktuellen Stand sofort in den localStorage. Wird gebraucht,
   * bevor die Vorschau in einem neuen Tab geoeffnet wird: der neue Tab liest
   * Dokumente und Einstellungen beim Start aus dem localStorage, deshalb muss
   * der zuletzt getippte Stand dort schon liegen (die Watcher schreiben zwar
   * ohnehin, aber erst nach dem naechsten Tick).
   */
  function persistNow(): void {
    flushPending()
    localStorage.setItem(STORAGE_DOCS, JSON.stringify(documents.value))
    localStorage.setItem(STORAGE_ACTIVE, activeId.value)
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings))
  }

  return {
    documents,
    settings,
    activeId,
    activeDoc,
    activeContent,
    activeHtml,
    activePlain,
    activeImages,
    activeTitle,
    documentTitle,
    canUndo,
    canRedo,
    normalizeActiveToHtml,
    updateContent,
    replaceContent,
    clearActiveDocument,
    addImage,
    updateImage,
    removeImage,
    beginImageChange,
    commitImageChange,
    undo,
    redo,
    newDocument,
    openDocument,
    switchDocument,
    renameDocument,
    closeDocument,
    updateSettings,
    resetFormatting,
    exportBackup,
    importBackup,
    persistNow,
  }
})
