import { watch } from 'vue'
import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import { messages, useI18n, type Locale } from '@/i18n'

declare module 'vue-router' {
  interface RouteMeta {
    /** Seite scrollt als Ganzes (Landing/Blog) statt der festen App-Shell. */
    scroll?: boolean
    /** Schluessel in `messages().landing.meta` fuer Titel/Beschreibung. */
    metaKey?: 'start' | 'app' | 'features' | 'blog'
    /** Pfad relativ zu SITE_URL fuer das Canonical. */
    canonical?: string
    robots?: string
  }
}

const SITE_URL = 'https://kodinitools.com/texteditor/'

/** Absolute URL einer Seite: Deutsch ohne Parameter, Englisch mit ?lang=en. */
export function localizedUrl(path: string, locale: Locale): string {
  return `${SITE_URL}${path}${locale === 'en' ? '?lang=en' : ''}`
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: LandingView,
    meta: { scroll: true, metaKey: 'start', canonical: '', robots: 'index, follow' },
  },
  // Editor und Blog lazy: die Startseite bleibt schlank, der Editor-Chunk wird
  // erst beim Oeffnen der Anwendung geladen (und vom Service Worker vorab gecacht).
  {
    path: '/app',
    name: 'editor',
    component: () => import('@/views/EditorView.vue'),
    meta: { metaKey: 'app', canonical: 'app', robots: 'index, follow' },
  },
  {
    path: '/funktionen',
    name: 'features',
    component: () => import('@/views/FeaturesView.vue'),
    meta: { scroll: true, metaKey: 'features', canonical: 'funktionen', robots: 'index, follow' },
  },
  {
    path: '/blog',
    name: 'blog',
    component: () => import('@/views/BlogView.vue'),
    meta: { scroll: true, metaKey: 'blog', canonical: 'blog', robots: 'index, follow' },
  },
  // Vollbild-Vorschau in eigenem Tab.
  { path: '/preview', name: 'preview', component: () => import('@/views/PreviewView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    // `top`: Abstand zur klebenden Hero-Navigation (der Router ignoriert scroll-margin).
    if (to.hash) return { el: to.hash, top: 80, behavior: 'smooth' }
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

/** Titel, Beschreibung, robots, Canonical und hreflang einer Route in der aktiven Sprache. */
function applyRouteHead(to: RouteLocationNormalized): void {
  const key = to.meta.metaKey
  if (!key) return
  const meta = messages().landing.meta[key]
  const locale = useI18n().locale.value
  document.title = meta.title
  setMeta('description', meta.description)
  if (to.meta.robots) setMeta('robots', to.meta.robots)
  if (to.meta.canonical !== undefined) {
    const path = to.meta.canonical
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', localizedUrl(path, locale))
    // hreflang nur auf indexierbaren Seiten (auf noindex ohne Wirkung)
    const indexable = !/\bnoindex\b/.test(to.meta.robots ?? '')
    setAlternate('de', indexable ? localizedUrl(path, 'de') : null)
    setAlternate('en', indexable ? localizedUrl(path, 'en') : null)
    setAlternate('x-default', indexable ? localizedUrl(path, 'de') : null)
  }
}

router.afterEach((to) => {
  if (typeof document === 'undefined') return
  // Die App-Shell (Editor) scrollt nicht als Seite; Landing/Blog schon.
  document.documentElement.classList.toggle('ktx-scroll', to.meta.scroll === true)
  applyRouteHead(to)
})

// Sprachwechsel: Titel, Canonical usw. der aktuellen Route neu setzen
watch(useI18n().locale, () => {
  if (typeof document !== 'undefined') applyRouteHead(router.currentRoute.value)
})

/** Setzt/entfernt <link rel="alternate" hreflang>; href = null entfernt den Link. */
function setAlternate(hreflang: string, href: string | null): void {
  let el = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'alternate')
    el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setMeta(name: string, content: string): void {
  document.querySelector(`meta[name="${name}"]`)?.setAttribute('content', content)
}
