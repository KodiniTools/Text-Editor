import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { router as appRouter, routes } from '@/router'
import { setLocale } from '@/i18n'
import LandingView from '@/views/LandingView.vue'
import BlogView from '@/views/BlogView.vue'
import FeaturesView from '@/views/FeaturesView.vue'

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
    expect(byName.features).toBe('/funktionen')
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
  it('zeigt die Hero-Navigation mit Start, Anwendung, Funktionen, FAQ, Anleitung, Blog', async () => {
    const wrapper = await mountAt('/', LandingView)
    const links = wrapper.findAll('.header-nav a')
    expect(links.map((a) => a.text())).toEqual([
      'Start',
      'Anwendung',
      'Funktionen',
      'FAQ',
      'Anleitung',
      'Blog',
    ])
    expect(links.map((a) => a.attributes('href'))).toEqual([
      '/',
      '/app',
      '/funktionen',
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

  it('zeigt "Aus dem Blog" mit Karte (Bild, Kategorie, Datum, Titel, Artikel lesen)', async () => {
    const wrapper = await mountAt('/blog', BlogView)
    expect(wrapper.find('h1.section-title').text()).toBe('Aus dem Blog')
    const card = wrapper.find('a.blog-card')
    expect(card.find('.blog-card-media img').attributes('src')).toBe(
      'https://kodinitools.com/image/texteditor-de.png',
    )
    expect(card.find('.blog-card-tag').text()).toBe('Text')
    expect(card.find('.blog-card-meta').text()).toBe('16. September 2026 · 5 Min.')
    expect(card.find('.blog-card-link').text()).toBe('Artikel lesen')
  })

  it('nutzt auf Englisch den englischen Artikel und das englische Bild', async () => {
    const wrapper = await mountAt('/blog', BlogView)
    setLocale('en')
    await flushPromises()
    const card = wrapper.find('a.blog-card')
    expect(card.attributes('href')).toBe('https://kodinitools.com/en/blog/online-text-editor/')
    expect(card.find('img').attributes('src')).toBe(
      'https://kodinitools.com/image/texteditor-en.png',
    )
    expect(card.find('.blog-card-meta').text()).toBe('September 16, 2026 · 5 min')
  })
})

describe('FeaturesView', () => {
  it('folgt dem Aufbau der Visualizer-Funktionsseite (Hero, Uebersicht, TOC, Abschnitte)', async () => {
    const wrapper = await mountAt('/funktionen', FeaturesView)
    expect(wrapper.find('.header-nav a.active').text()).toBe('Funktionen')
    expect(wrapper.find('.blog-hero h1').text()).toBe('Alles, was der Kodini Texteditor kann')
    expect(wrapper.findAll('.stat-item')).toHaveLength(4)
    expect(wrapper.findAll('.overview-card')).toHaveLength(4)
    const tocIds = wrapper.findAll('.toc-link').map((a) => a.attributes('href')!.slice(1))
    expect(tocIds.length).toBeGreaterThan(5)
    for (const id of tocIds) expect(wrapper.find(`section#${id}`).exists()).toBe(true)
    for (const card of wrapper.findAll('.overview-card')) {
      expect(wrapper.find(`section${card.attributes('href')}`).exists()).toBe(true)
    }
    expect(wrapper.find('.toc-cta').attributes('href')).toBe('/app')
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

describe('Hero-Bild', () => {
  it('waehlt das Bild passend zum Theme und wechselt mit', async () => {
    document.documentElement.setAttribute('data-theme', 'light')
    const wrapper = await mountAt('/', LandingView)
    const img = () => wrapper.find('img.hero-image')
    expect(img().attributes('src')).toBe('/texteditor/image/hero-light.webp')
    document.documentElement.setAttribute('data-theme', 'dark')
    await flushPromises()
    expect(img().attributes('src')).toBe('/texteditor/image/hero-dark.webp')
    wrapper.unmount()
  })

  it('blendet den Bildbereich aus, wenn die Datei fehlt', async () => {
    const wrapper = await mountAt('/', LandingView)
    await wrapper.find('img.hero-image').trigger('error')
    expect(wrapper.find('.hero-visual').exists()).toBe(false)
  })
})

describe('blogArticles', () => {
  it('formatiert Datum je Sprache und sortiert neueste zuerst', async () => {
    const { formatBlogDate, getBlogArticlesNewestFirst } = await import('@/data/blogArticles')
    expect(formatBlogDate('2026-09-21', 'de')).toBe('21. September 2026')
    expect(formatBlogDate('2026-09-21', 'en')).toBe('September 21, 2026')
    expect(formatBlogDate('kein-datum', 'de')).toBe('kein-datum')
    expect(getBlogArticlesNewestFirst()[0]!.url.de).toBe(BLOG_URL)
  })
})
