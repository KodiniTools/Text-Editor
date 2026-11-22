import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import PrintRoot from '@/components/PrintRoot.vue'
import PreviewView from '@/views/PreviewView.vue'
import { routes } from '@/router'
import { useEditorStore } from '@/stores/editor'

/**
 * Der Browser-Druck blendet per @media print alles ausser #print-root aus.
 * Jede Ansicht mit "Drucken" muss den Container deshalb rendern -- die
 * Vorschau hatte ihn nicht und druckte leere Seiten.
 */
describe('PrintRoot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('rendert den aktiven Dokumenttext in #print-root', async () => {
    const store = useEditorStore()
    store.updateContent('Hallo Druck')
    const wrapper = mount(PrintRoot)
    await nextTick()
    const root = wrapper.find('#print-root')
    expect(root.exists()).toBe(true)
    expect(root.text()).toContain('Hallo Druck')
  })

  it('die Vorschau-Ansicht enthaelt #print-root', async () => {
    const store = useEditorStore()
    store.updateContent('Vorschau druckt')
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/preview')
    await router.isReady()
    const wrapper = mount(PreviewView, { global: { plugins: [router] } })
    await nextTick()
    expect(wrapper.find('#print-root').text()).toContain('Vorschau druckt')
  })
})
