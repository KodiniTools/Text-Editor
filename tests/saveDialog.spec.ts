import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { _resetSaveDialogForTests, useSaveDialog } from '@/composables/useSaveDialog'
import SaveDialog from '@/components/SaveDialog.vue'
import * as saveFile from '@/utils/saveFile'
import { setLocale } from '@/i18n'

/**
 * Prueft den "Speichern unter"-Ablauf: Dialog -> Dateiname -> (System-Dialog)
 * -> Ziel. Der System-Dialog selbst ist gemockt (jsdom kennt ihn nicht).
 */
vi.mock('@/utils/saveFile', async (importOriginal) => {
  const actual = await importOriginal<typeof saveFile>()
  return { ...actual, pickSaveTarget: vi.fn(), supportsSavePicker: vi.fn(() => false) }
})

const pickSaveTarget = vi.mocked(saveFile.pickSaveTarget)
const supportsSavePicker = vi.mocked(saveFile.supportsSavePicker)

beforeEach(() => {
  setLocale('de')
  _resetSaveDialogForTests()
  pickSaveTarget.mockReset()
  supportsSavePicker.mockReset().mockReturnValue(false)
})
afterEach(() => _resetSaveDialogForTests())

function mountDialog() {
  return mount(SaveDialog, { global: { stubs: { teleport: true } } })
}

describe('useSaveDialog', () => {
  it('liefert ohne System-Dialog ein Download-Ziel mit bereinigtem Namen', async () => {
    pickSaveTarget.mockResolvedValue('unsupported')
    const { requestSave, confirm, pending } = useSaveDialog()
    const promise = requestSave({ base: 'Mein Text', ext: 'txt', type: 'text/plain' })
    expect(pending.value?.base).toBe('Mein Text')
    expect(await confirm(' Neuer: Name.TXT ')).toBe('done')
    expect(await promise).toEqual({ fileName: 'Neuer Name.txt', handle: null })
    expect(pending.value).toBeNull()
  })

  it('reicht das Handle des System-Dialogs durch', async () => {
    const handle = {
      createWritable: async () => ({ write: async () => {}, close: async () => {} }),
    }
    pickSaveTarget.mockResolvedValue({ fileName: 'a.pdf', handle })
    const { requestSave, confirm } = useSaveDialog()
    const promise = requestSave({ base: 'a', ext: 'pdf', type: 'application/pdf' })
    await confirm('a')
    expect(pickSaveTarget).toHaveBeenCalledWith('a.pdf', 'application/pdf', 'pdf')
    expect(await promise).toEqual({ fileName: 'a.pdf', handle })
  })

  it('haelt den Dialog offen, wenn der System-Dialog abgebrochen wird', async () => {
    pickSaveTarget.mockResolvedValue('cancelled')
    const { requestSave, confirm, pending, cancel } = useSaveDialog()
    const promise = requestSave({ base: 'a', ext: 'md', type: 'text/markdown' })
    expect(await confirm('a')).toBe('cancelled')
    expect(pending.value).not.toBeNull()
    cancel()
    expect(await promise).toBeNull()
  })

  it('bricht eine offene Anfrage ab, wenn eine neue kommt', async () => {
    const { requestSave } = useSaveDialog()
    const first = requestSave({ base: 'a', ext: 'txt', type: 'text/plain' })
    requestSave({ base: 'b', ext: 'txt', type: 'text/plain' })
    expect(await first).toBeNull()
  })
})

describe('SaveDialog', () => {
  it('ist ohne Anfrage geschlossen', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('zeigt Dateiname, Hinweis auf Download und bestaetigt per Formular', async () => {
    pickSaveTarget.mockResolvedValue('unsupported')
    const wrapper = mountDialog()
    const { requestSave } = useSaveDialog()
    const promise = requestSave({ base: 'Brief', ext: 'txt', type: 'text/plain' })
    await nextTick()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.find('.ui-callout').exists()).toBe(true)
    expect(wrapper.get('.ui-button--primary').text()).toBe('Herunterladen')
    const input = wrapper.get<HTMLInputElement>('input')
    expect(input.element.value).toBe('Brief')
    await input.setValue('Brief an Anna')
    expect(wrapper.get('.ui-field__hint').text()).toContain('Brief an Anna.txt')
    await wrapper.get('form').trigger('submit')
    expect(await promise).toEqual({ fileName: 'Brief an Anna.txt', handle: null })
  })

  it('bietet mit File System Access API die Speicherort-Wahl an', async () => {
    supportsSavePicker.mockReturnValue(true)
    const wrapper = mountDialog()
    useSaveDialog().requestSave({ base: 'a', ext: 'html', type: 'text/html' })
    await nextTick()
    expect(wrapper.find('.ui-callout').exists()).toBe(false)
    expect(wrapper.get('.ui-button--primary').text()).toBe('Speicherort wählen …')
  })

  it('sperrt die Bestaetigung bei leerem Namen', async () => {
    const wrapper = mountDialog()
    const promise = useSaveDialog().requestSave({ base: 'a', ext: 'txt', type: 'text/plain' })
    await nextTick()
    await wrapper.get('input').setValue('  ')
    expect(wrapper.find('.ui-field__error').exists()).toBe(true)
    expect(wrapper.get('.ui-button--primary').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(pickSaveTarget).not.toHaveBeenCalled()
    useSaveDialog().cancel()
    expect(await promise).toBeNull()
  })

  it('schliesst per Abbrechen ohne Ziel', async () => {
    const wrapper = mountDialog()
    const promise = useSaveDialog().requestSave({ base: 'a', ext: 'txt', type: 'text/plain' })
    await nextTick()
    await wrapper.get('.ui-button--ghost').trigger('click')
    expect(await promise).toBeNull()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
