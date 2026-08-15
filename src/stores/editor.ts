import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'

export interface EditorDocument {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export type ThemeMode = 'light' | 'dark' | 'system'
export type FontFamily = 'sans' | 'serif' | 'mono'

export interface EditorSettings {
  theme: ThemeMode
  fontFamily: FontFamily
  fontSize: number
  lineHeight: number
  wordWrap: boolean
  showPreview: boolean
  focusMode: boolean
  autoSave: boolean
}

interface HistoryEntry {
  past: string[]
  future: string[]
}

const STORAGE_DOCS = 'kodini-editor-docs-v1'
const STORAGE_ACTIVE = 'kodini-editor-active-v1'
const STORAGE_SETTINGS = 'kodini-editor-settings-v1'
const HISTORY_LIMIT = 200
const TYPING_DEBOUNCE = 500

const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'system',
  fontFamily: 'sans',
  fontSize: 16,
  lineHeight: 1.7,
  wordWrap: true,
  showPreview: false,
  focusMode: false,
  autoSave: true,
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
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<EditorSettings>) }
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
    Object.assign(settings, patch)
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
  watch(
    settings,
    (s) => localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s)),
    { deep: true },
  )

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
