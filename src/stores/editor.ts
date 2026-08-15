import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_FONT_ID } from '@/config/fonts'
import { messages } from '@/i18n'

export interface EditorDocument {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
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
}

interface HistoryEntry {
  past: Snapshot[]
  future: Snapshot[]
}

const STORAGE_DOCS = 'kodini-editor-docs-v1'
const STORAGE_ACTIVE = 'kodini-editor-active-v1'
const STORAGE_SETTINGS = 'kodini-editor-settings-v1'
const HISTORY_LIMIT = 200
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
  }
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
    if (raw) return normalizeSettings(JSON.parse(raw) as Partial<EditorSettings>)
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

  /* ---------- Init ---------- */
  if (documents.value.length === 0) {
    documents.value.push(createDocument(messages().doc.welcomeName, messages().doc.welcomeBody))
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
      pushPast(doc.id, { content: typingBase, format: captureFormat() })
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
      pushPast(doc.id, { content: doc.content, format: formatBase })
    }
    formatBase = null
    formatKeys = null
  }

  /** Committet alles Offene (vor Undo/Redo, Dokumentwechsel, ...). */
  function flushPending(): void {
    flushTyping()
    flushFormat()
  }

  /* ---------- Actions: Inhalt ---------- */

  /** Wird beim Tippen (v-model) aufgerufen. Sammelt History debounced. */
  function updateContent(content: string): void {
    const doc = activeDoc.value
    if (!doc || doc.content === content) return
    // Eine offene Format-Aenderung zuerst festschreiben, damit die Zeitachse
    // linear bleibt (erst formatieren, dann tippen = zwei getrennte Stufen).
    flushFormat()
    if (typingBase === null) typingBase = doc.content
    doc.content = content
    doc.updatedAt = Date.now()
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = setTimeout(flushTyping, TYPING_DEBOUNCE)
  }

  /** Ersetzt den Inhalt in einem Schritt (Transform / Paste / Import) -> eine History-Stufe. */
  function replaceContent(content: string): void {
    const doc = activeDoc.value
    if (!doc || doc.content === content) return
    flushPending()
    pushPast(doc.id, { content: doc.content, format: captureFormat() })
    doc.content = content
    doc.updatedAt = Date.now()
  }

  /** Aenderung der Darstellung (Format-Leiste) -> debounced eine History-Stufe. */
  function recordFormatChange(patch: Partial<FormatState>): void {
    const doc = activeDoc.value
    if (!doc) {
      Object.assign(settings, normalizeSettings({ ...settings, ...patch }))
      return
    }
    // Offene Tipp-Sequenz zuerst festschreiben (siehe updateContent).
    flushTyping()
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
    h.future.push({ content: doc.content, format: captureFormat() })
    doc.content = prev.content
    doc.updatedAt = Date.now()
    applyFormat(prev.format)
    touch()
  }

  function redo(): void {
    flushPending()
    const doc = activeDoc.value
    if (!doc) return
    const h = ensureHistory(doc.id)
    const next = h.future.pop()
    if (next === undefined) return
    h.past.push({ content: doc.content, format: captureFormat() })
    doc.content = next.content
    doc.updatedAt = Date.now()
    applyFormat(next.format)
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

  return {
    documents,
    settings,
    activeId,
    activeDoc,
    activeContent,
    canUndo,
    canRedo,
    updateContent,
    replaceContent,
    undo,
    redo,
    newDocument,
    openDocument,
    switchDocument,
    renameDocument,
    closeDocument,
    updateSettings,
    resetFormatting,
  }
})
