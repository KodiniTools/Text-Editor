import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import { messages } from '@/i18n'

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
    meta: { metaKey: 'app', canonical: 'app', robots: 'noindex, follow' },
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

router.afterEach((to) => {
  if (typeof document === 'undefined') return
  // Die App-Shell (Editor) scrollt nicht als Seite; Landing/Blog schon.
  document.documentElement.classList.toggle('ktx-scroll', to.meta.scroll === true)

  const key = to.meta.metaKey
  if (!key) return
  const meta = messages().landing.meta[key]
  document.title = meta.title
  setMeta('description', meta.description)
  if (to.meta.robots) setMeta('robots', to.meta.robots)
  if (to.meta.canonical !== undefined) {
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', SITE_URL + to.meta.canonical)
  }
})

function setMeta(name: string, content: string): void {
  document.querySelector(`meta[name="${name}"]`)?.setAttribute('content', content)
}
