import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_FONT_ID } from '@/config/fonts'

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

interface HistoryEntry {
  past: string[]
  future: string[]
}

const STORAGE_DOCS = 'kodini-editor-docs-v1'
const STORAGE_ACTIVE = 'kodini-editor-active-v1'
const STORAGE_SETTINGS = 'kodini-editor-settings-v1'
const HISTORY_LIMIT = 200
const TYPING_DEBOUNCE = 500

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

function createDocument(name = 'Unbenannt', content = ''): EditorDocument {
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

  /* ---------- Init ---------- */
  if (documents.value.length === 0) {
    documents.value.push(createDocument('Willkommen', WELCOME_TEXT))
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
  function pushPast(id: string, value: string): void {
    const h = ensureHistory(id)
    h.past.push(value)
    if (h.past.length > HISTORY_LIMIT) h.past.shift()
    touch()
  }

  function flushTyping(): void {
    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }
    const doc = activeDoc.value
    if (doc && typingBase !== null && typingBase !== doc.content) {
      pushPast(doc.id, typingBase)
      ensureHistory(doc.id).future = []
    }
    typingBase = null
  }

  /* ---------- Actions: Inhalt ---------- */

  /** Wird beim Tippen (v-model) aufgerufen. Sammelt History debounced. */
  function updateContent(content: string): void {
    const doc = activeDoc.value
    if (!doc || doc.content === content) return
    if (typingBase === null) typingBase = doc.content
    doc.content = content
    doc.updatedAt = Date.now()
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = setTimeout(() => {
      if (typingBase !== null && typingBase !== doc.content) {
        pushPast(doc.id, typingBase)
        ensureHistory(doc.id).future = []
      }
      typingBase = null
      typingTimer = null
    }, TYPING_DEBOUNCE)
  }

  /** Ersetzt den Inhalt in einem Schritt (Transform / Paste / Import) -> eine History-Stufe. */
  function replaceContent(content: string): void {
    const doc = activeDoc.value
    if (!doc || doc.content === content) return
    flushTyping()
    pushPast(doc.id, doc.content)
    ensureHistory(doc.id).future = []
    doc.content = content
    doc.updatedAt = Date.now()
  }

  function undo(): void {
    flushTyping()
    const doc = activeDoc.value
    if (!doc) return
    const h = ensureHistory(doc.id)
    const prev = h.past.pop()
    if (prev === undefined) return
    h.future.push(doc.content)
    doc.content = prev
    doc.updatedAt = Date.now()
    touch()
  }

  function redo(): void {
    flushTyping()
    const doc = activeDoc.value
    if (!doc) return
    const h = ensureHistory(doc.id)
    const next = h.future.pop()
    if (next === undefined) return
    h.past.push(doc.content)
    doc.content = next
    doc.updatedAt = Date.now()
    touch()
  }

  /* ---------- Actions: Dokumente ---------- */

  function newDocument(name = 'Unbenannt'): string {
    flushTyping()
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
    flushTyping()
    const doc = createDocument(uniqueName(name || 'Import'), content)
    documents.value.push(doc)
    activeId.value = doc.id
    return doc.id
  }

  function switchDocument(id: string): void {
    if (documents.value.some((d) => d.id === id)) {
      flushTyping()
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
  function updateSettings(patch: Partial<EditorSettings>): void {
    Object.assign(settings, normalizeSettings({ ...settings, ...patch }))
  }

  /** Setzt nur die Darstellung zurueck -- Design und Dokumente bleiben. */
  function resetFormatting(): void {
    updateSettings({
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      fontSize: DEFAULT_SETTINGS.fontSize,
      lineHeight: DEFAULT_SETTINGS.lineHeight,
      letterSpacing: DEFAULT_SETTINGS.letterSpacing,
      textColor: DEFAULT_SETTINGS.textColor,
      textAlign: DEFAULT_SETTINGS.textAlign,
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

const WELCOME_TEXT = `# Willkommen im Kodini Texteditor

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
`
