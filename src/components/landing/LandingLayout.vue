<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { useI18n } from '@/i18n'
import '@/styles/landing.css'

/**
 * Rahmen fuer Startseite und Blog: klebende Hero-Navigation (Start, Anwendung,
 * FAQ, Anleitung, Blog) + Seiteninhalt. Optik 1:1 aus der Visualizer-Landingpage.
 */
const { t } = useI18n()
const route = useRoute()

type NavKey = 'start' | 'app' | 'faq' | 'guide' | 'blog'

const items = computed<{ key: NavKey; to: RouteLocationRaw }[]>(() => [
  { key: 'start', to: { name: 'landing' } },
  { key: 'app', to: { name: 'editor' } },
  { key: 'faq', to: { name: 'landing', hash: '#faq' } },
  { key: 'guide', to: { name: 'landing', hash: '#anleitung' } },
  { key: 'blog', to: { name: 'blog' } },
])

const activeKey = computed<NavKey | null>(() => {
  if (route.name === 'blog') return 'blog'
  if (route.name !== 'landing') return null
  if (route.hash === '#faq') return 'faq'
  if (route.hash === '#anleitung') return 'guide'
  return 'start'
})

const isScrolled = ref(false)
function handleScroll(): void {
  isScrolled.value = window.scrollY > 50
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll))
</script>

<template>
  <div class="landing-page">
    <header class="landing-header" :class="{ scrolled: isScrolled }">
      <div class="header-content">
        <RouterLink :to="{ name: 'landing' }" class="header-logo">
          <span>Texteditor</span>
        </RouterLink>
        <nav class="header-nav" :aria-label="t.landing.nav.label">
          <RouterLink
            v-for="item in items"
            :key="item.key"
            :to="item.to"
            class="nav-link"
            :class="{ active: activeKey === item.key }"
            :aria-current="activeKey === item.key ? 'page' : undefined"
          >
            {{ t.landing.nav[item.key] }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="landing-main">
      <slot />
    </main>
  </div>
</template>
