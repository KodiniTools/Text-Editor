import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiKbd from '../UiKbd.vue'

describe('UiKbd', () => {
  it('rendert jede Taste als kbd-Element', () => {
    const wrapper = mount(UiKbd, { props: { keys: ['Strg', 'S'] } })
    expect(wrapper.findAll('kbd').map((key) => key.text())).toEqual(['Strg', 'S'])
  })
})
