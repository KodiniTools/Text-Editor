import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { documentTitle, useEditorStore } from '@/stores/editor'
import { messages } from '@/i18n'

function doc(name: string, content: string) {
  return { id: 'x', name, content, createdAt: 0, updatedAt: 0 }
}

describe('documentTitle', () => {
  it('leitet bei "Unbenannt" den Titel aus der ersten Zeile ab', () => {
    expect(documentTitle(doc('Unbenannt', '<div>Mein Brief</div><div>...</div>'))).toBe(
      'Mein Brief',
    )
    expect(documentTitle(doc('Unbenannt 3', 'Erste Zeile\nzweite'))).toBe('Erste Zeile')
  })

  it('behaelt einen bewusst vergebenen Namen', () => {
    expect(documentTitle(doc('Vertrag', '<div>Text</div>'))).toBe('Vertrag')
    expect(documentTitle(doc('Brief an Anna', '# Ueberschrift\nText'))).toBe('Brief an Anna')
  })

  it('faellt bei leerem Inhalt auf "Unbenannt" zurueck', () => {
    expect(documentTitle(doc('Unbenannt', ''))).toBe('Unbenannt')
    expect(documentTitle(doc('Unbenannt 2', '<div><br></div>'))).toBe('Unbenannt 2')
  })

  it('entfernt Markdown-Rauten und kuerzt lange Titel', () => {
    expect(documentTitle(doc('Unbenannt', '## Kapitel eins'))).toBe('Kapitel eins')
    expect(documentTitle(doc('Unbenannt', 'a'.repeat(100))).length).toBe(60)
  })
})

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('editor store - Dokumente', () => {
  it('startet mit einem leeren, unbenannten Dokument', () => {
    const store = useEditorStore()
    expect(store.documents.length).toBe(1)
    expect(store.activeDoc).toBeDefined()
    expect(store.activeContent).toBe('')
    expect(store.activeDoc?.name).toBe(messages().doc.untitled)
  })

  it('legt neues Dokument an und aktiviert es', () => {
    const store = useEditorStore()
    const id = store.newDocument('Notiz')
    expect(store.activeId).toBe(id)
    expect(store.activeDoc?.name).toBe('Notiz')
    expect(store.activeContent).toBe('')
  })

  it('vergibt eindeutige Namen', () => {
    const store = useEditorStore()
    store.newDocument('Notiz')
    store.newDocument('Notiz')
    const names = store.documents.map((d) => d.name)
    expect(names).toContain('Notiz')
    expect(names).toContain('Notiz 2')
  })

  it('schliesst Dokument und behaelt mind. eines', () => {
    const store = useEditorStore()
    const id = store.newDocument('Weg')
    store.closeDocument(id)
    expect(store.documents.some((d) => d.id === id)).toBe(false)
    expect(store.documents.length).toBeGreaterThanOrEqual(1)
  })
})

describe('editor store - Undo/Redo', () => {
  it('Tippen -> undo -> redo', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.updateContent('hallo')
    expect(store.activeContent).toBe('hallo')
    store.undo()
    expect(store.activeContent).toBe('')
    store.redo()
    expect(store.activeContent).toBe('hallo')
  })

  it('replaceContent (Transform) ist eine Undo-Stufe', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.replaceContent('abc')
    store.replaceContent('ABC')
    expect(store.canUndo).toBe(true)
    store.undo()
    expect(store.activeContent).toBe('abc')
    store.undo()
    expect(store.activeContent).toBe('')
  })

  it('fuegt Bilder hinzu, aendert und entfernt sie', () => {
    const store = useEditorStore()
    store.newDocument('X')
    const okSrc = 'data:image/png;base64,AAAA'
    const id = store.addImage({ src: okSrc, x: 10, y: 20, w: 100, h: 50 })
    expect(id).not.toBeNull()
    expect(store.activeImages.length).toBe(1)
    expect(store.activeImages[0]!.x).toBe(10)
    store.updateImage(id!, { x: 42, w: 200, h: 100 })
    expect(store.activeImages[0]!.x).toBe(42)
    expect(store.activeImages[0]!.w).toBe(200)
    store.removeImage(id!)
    expect(store.activeImages.length).toBe(0)
  })

  it('lehnt ungueltige Bildquellen ab (kein data:image)', () => {
    const store = useEditorStore()
    store.newDocument('X')
    expect(store.addImage({ src: 'https://example.com/x.png', x: 0, y: 0, w: 1, h: 1 })).toBeNull()
    expect(store.addImage({ src: 'javascript:alert(1)', x: 0, y: 0, w: 1, h: 1 })).toBeNull()
    expect(store.activeImages.length).toBe(0)
  })

  it('clearActiveDocument leert und ist per Undo wiederherstellbar', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.replaceContent('<div>etwas Text</div>')
    store.clearActiveDocument()
    expect(store.activeContent).toBe('')
    expect(store.canUndo).toBe(true)
    store.undo()
    expect(store.activeContent).toBe('<div>etwas Text</div>')
  })

  it('canRedo wird nach neuer Aenderung geleert', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.replaceContent('a')
    store.undo()
    expect(store.canRedo).toBe(true)
    store.replaceContent('b')
    expect(store.canRedo).toBe(false)
  })
})

describe('editor store - Undo/Redo der Format-Leiste', () => {
  it('macht eine Schriftgroessen-Aenderung rueckgaengig', () => {
    const store = useEditorStore()
    store.newDocument('X')
    expect(store.settings.fontSize).toBe(16)
    store.updateSettings({ fontSize: 24 })
    expect(store.settings.fontSize).toBe(24)
    store.undo()
    expect(store.settings.fontSize).toBe(16)
    store.redo()
    expect(store.settings.fontSize).toBe(24)
  })

  it('erfasst Farbe, Ausrichtung und Schrift', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.updateSettings({ textColor: '#b91c1c' })
    store.updateSettings({ textAlign: 'center' })
    store.updateSettings({ fontFamily: 'mono' })
    expect(store.settings.fontFamily).toBe('mono')
    store.undo() // Schrift zurueck
    expect(store.settings.fontFamily).toBe('sans')
    expect(store.settings.textAlign).toBe('center')
    store.undo() // Ausrichtung zurueck
    expect(store.settings.textAlign).toBe('left')
    store.undo() // Farbe zurueck
    expect(store.settings.textColor).toBe('')
  })

  it('haelt Inhalt und Format als getrennte, geordnete Stufen', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.replaceContent('Text')
    store.updateSettings({ fontSize: 30 })
    // Zuerst die zuletzt gemachte Aenderung (Format) zuruecknehmen.
    store.undo()
    expect(store.settings.fontSize).toBe(16)
    expect(store.activeContent).toBe('Text')
    // Dann den Inhalt.
    store.undo()
    expect(store.activeContent).toBe('')
  })

  it('setzt die Darstellung als eine Undo-Stufe zurueck', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.updateSettings({ fontSize: 28 })
    store.updateSettings({ textColor: '#15803d' })
    store.resetFormatting()
    expect(store.settings.fontSize).toBe(16)
    expect(store.settings.textColor).toBe('')
    // Ein Undo stellt den kompletten Stand vor dem Zuruecksetzen wieder her.
    store.undo()
    expect(store.settings.fontSize).toBe(28)
    expect(store.settings.textColor).toBe('#15803d')
  })

  it('nimmt Theme-Wechsel NICHT in die History (steuert die globale Navigation)', () => {
    const store = useEditorStore()
    store.newDocument('X')
    store.replaceContent('a')
    store.updateSettings({ theme: 'dark' })
    expect(store.settings.theme).toBe('dark')
    // Undo betrifft den Inhalt, nicht das Theme.
    store.undo()
    expect(store.activeContent).toBe('')
    expect(store.settings.theme).toBe('dark')
  })
})
