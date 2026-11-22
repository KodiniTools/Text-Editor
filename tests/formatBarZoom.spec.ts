import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import FormatBar from '@/components/FormatBar.vue'
import { LIMITS, useEditorStore } from '@/stores/editor'
import { setLocale } from '@/i18n'
import type { SelectionFormat } from '@/types'

/**
 * Zoom in der Format-Leiste: duenner Schieberegler plus Zahlenfeld mit Spinner.
 * Beide schreiben denselben Wert (settings.pageZoom), Doppelklick auf den
 * Regler setzt auf 100 % zurueck.
 */
const selection: SelectionFormat = {
  hasSelection: false,
  allSelected: false,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  highlight: false,
  link: false,
  linkHref: '',
  color: '',
  block: 'p',
  quote: false,
  bulletList: false,
  numberedList: false,
}

function mountBar() {
  return mount(FormatBar, {
    props: { editor: null, selection },
    global: { stubs: { teleport: true } },
  })
}

describe('FormatBar: Zoom', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setLocale('de')
    localStorage.clear()
  })

  it('zeigt Regler und Spinner nur im Seitenmodus', async () => {
    const store = useEditorStore()
    const wrapper = mountBar()
    expect(wrapper.find('.zoom-range').exists()).toBe(false)
    store.updateSettings({ pageFormat: 'a4' })
    await nextTick()
    expect(wrapper.find('.zoom-range').exists()).toBe(true)
    expect(wrapper.find('.stepper[aria-label="Zoom"]').exists()).toBe(true)
  })

  it('Spinner zeigt Prozent und schreibt in 10%-Schritten in den Store', async () => {
    const store = useEditorStore()
    store.updateSettings({ pageFormat: 'a4', pageZoom: 0.85 })
    const wrapper = mountBar()
    await nextTick()
    const stepper = wrapper.find('.stepper[aria-label="Zoom"]')
    expect(stepper.text()).toContain('85%')
    const [up, down] = stepper.findAll('button')
    await up.trigger('click')
    expect(store.settings.pageZoom).toBeCloseTo(0.95)
    await down.trigger('click')
    await down.trigger('click')
    expect(store.settings.pageZoom).toBeCloseTo(0.75)
  })

  it('Spinner bleibt innerhalb von LIMITS.zoom', async () => {
    const store = useEditorStore()
    store.updateSettings({ pageFormat: 'a4', pageZoom: LIMITS.zoom.max })
    const wrapper = mountBar()
    await nextTick()
    const [up] = wrapper.find('.stepper[aria-label="Zoom"]').findAll('button')
    expect(up.attributes('disabled')).toBeDefined()
    await up.trigger('click')
    expect(store.settings.pageZoom).toBe(LIMITS.zoom.max)
  })

  it('Regler schreibt den Wert, Doppelklick setzt auf 100 %', async () => {
    const store = useEditorStore()
    store.updateSettings({ pageFormat: 'a4', pageZoom: 1 })
    const wrapper = mountBar()
    await nextTick()
    const range = wrapper.find<HTMLInputElement>('.zoom-range')
    range.element.value = '0.6'
    await range.trigger('input')
    expect(store.settings.pageZoom).toBeCloseTo(0.6)
    await range.trigger('dblclick')
    expect(store.settings.pageZoom).toBe(1)
  })
})
