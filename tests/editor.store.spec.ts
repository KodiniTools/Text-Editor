import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('editor store - Dokumente', () => {
  it('startet mit einem Willkommensdokument', () => {
    const store = useEditorStore()
    expect(store.documents.length).toBe(1)
    expect(store.activeDoc).toBeDefined()
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
