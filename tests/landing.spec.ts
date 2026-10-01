import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { router as appRouter, routes } from '@/router'
import { setLocale } from '@/i18n'
import LandingView from '@/views/LandingView.vue'
import BlogView from '@/views/BlogView.vue'

const BLOG_URL = 'https://kodinitools.com/blog/texteditor-online/'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

async function mountAt(path: string, component: typeof LandingView) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  return mount(component, { global: { plugins: [router] } })
}

// jsdom kennt kein scrollTo (scrollBehavior des Routers).
beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

beforeEach(() => {
  localStorage.clear()
  setLocale('de')
})

describe('Routen', () => {
  it('Startseite unter /, Editor unter /app, Blog unter /blog', () => {
    const byName = Object.fromEntries(routes.map((r) => [r.name, r.path]))
    expect(byName.landing).toBe('/')
    expect(byName.editor).toBe('/app')
    expect(byName.blog).toBe('/blog')
    expect(byName.preview).toBe('/preview')
  })

  it('setzt Scroll-Klasse und Titel nur fuer Landing/Blog', async () => {
    await appRouter.push('/blog')
    expect(document.documentElement.classList.contains('ktx-scroll')).toBe(true)
    expect(document.title).toBe('Blog – Kodini Texteditor')
    await appRouter.push('/preview')
    expect(document.documentElement.classList.contains('ktx-scroll')).toBe(false)
  })
})

describe('LandingView', () => {
  it('zeigt die Hero-Navigation mit Start, Anwendung, FAQ, Anleitung, Blog', async () => {
    const wrapper = await mountAt('/', LandingView)
    const links = wrapper.findAll('.header-nav a')
    expect(links.map((a) => a.text())).toEqual(['Start', 'Anwendung', 'FAQ', 'Anleitung', 'Blog'])
    expect(links.map((a) => a.attributes('href'))).toEqual([
      '/',
      '/app',
      '/#faq',
      '/#anleitung',
      '/blog',
    ])
    expect(wrapper.find('.header-nav a.active').text()).toBe('Start')
    // Anker-Ziele existieren
    expect(wrapper.find('section#faq').exists()).toBe(true)
    expect(wrapper.find('section#anleitung').exists()).toBe(true)
  })

  it('markiert FAQ als aktiv, wenn der Hash #faq ist', async () => {
    const wrapper = await mountAt('/#faq', LandingView)
    expect(wrapper.find('.header-nav a.active').text()).toBe('FAQ')
  })

  it('klappt FAQ-Eintraege auf und zu', async () => {
    const wrapper = await mountAt('/', LandingView)
    const button = wrapper.find('.faq-question')
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.faq-item').classes()).toContain('active')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('false')
  })

  it('folgt dem Sprachwechsel', async () => {
    const wrapper = await mountAt('/', LandingView)
    setLocale('en')
    await flushPromises()
    expect(wrapper.find('.header-nav a').text()).toBe('Home')
  })
})

describe('BlogView', () => {
  it('verlinkt den Blogbeitrag in neuem Tab', async () => {
    const wrapper = await mountAt('/blog', BlogView)
    const card = wrapper.find('a.blog-card')
    expect(card.attributes('href')).toBe(BLOG_URL)
    expect(card.attributes('target')).toBe('_blank')
    expect(card.attributes('rel')).toContain('noopener')
    expect(wrapper.find('.header-nav a.active').text()).toBe('Blog')
  })
})

describe('EditorToolbar', () => {
  it('verlinkt mit "Start" zur Startseite', async () => {
    const { createPinia, setActivePinia } = await import('pinia')
    const { default: EditorToolbar } = await import('@/components/EditorToolbar.vue')
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/app')
    await router.isReady()
    const wrapper = mount(EditorToolbar, {
      props: { editor: null, selection: {} as never },
      global: { plugins: [router, pinia] },
    })
    const start = wrapper.find('a.tb-start')
    expect(start.text()).toBe('Start')
    expect(start.attributes('href')).toBe('/')
    expect(start.attributes('title')).toBe('Zur Startseite')
  })
})
