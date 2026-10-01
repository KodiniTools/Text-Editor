<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import LandingLayout from '@/components/landing/LandingLayout.vue'
import LandingIcon, { type LandingIconName } from '@/components/landing/LandingIcon.vue'
import '@/styles/features.css'

/**
 * Funktionsseite. Aufbau wie die Funktionsseite des Visualizers (Route /blog dort)
 * (Hero mit Kennzahlen, Uebersichtskarten, klebendes Inhaltsverzeichnis,
 * Abschnitte, Zusammenfassung, CTA). Inhalte vollstaendig aus i18n.
 */
const { t } = useI18n()

/** Abstand zur klebenden Hero-Navigation beim Springen/Erkennen. */
const SCROLL_OFFSET = 90

const page = computed(() => t.value.landing.featuresPage)

const tocEntries = computed(() =>
  page.value.sections.map((s) => ({ id: s.id, nav: s.nav, icon: s.icon as LandingIconName })),
)

/** Icon je Uebersichtskarte = Icon des verlinkten Abschnitts. */
function sectionIcon(id: string): LandingIconName {
  return (page.value.sections.find((s) => s.id === id)?.icon ?? 'file') as LandingIconName
}

const activeSection = ref('')

function handleScroll(): void {
  const ids = tocEntries.value.map((e) => e.id)
  for (let i = ids.length - 1; i >= 0; i--) {
    const el = document.getElementById(ids[i]!)
    if (el && el.getBoundingClientRect().top <= SCROLL_OFFSET + 30) {
      activeSection.value = ids[i]!
      return
    }
  }
  activeSection.value = ''
}

function scrollToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  const top = window.scrollY + el.getBoundingClientRect().top - SCROLL_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll))
</script>

<template>
  <LandingLayout>
    <div class="features-page">
      <!-- Hero -->
      <section class="blog-hero">
        <div class="blog-badge">{{ page.hero.badge }}</div>
        <h1 class="blog-title">{{ page.hero.title }}</h1>
        <p class="blog-subtitle">{{ page.hero.subtitle }}</p>
        <div class="hero-stats">
          <template v-for="(stat, i) in page.stats" :key="stat.label">
            <div v-if="i > 0" class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-number">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </template>
        </div>
      </section>

      <!-- Uebersichtskarten -->
      <section class="overview-section">
        <div class="overview-grid">
          <a
            v-for="card in page.overview"
            :key="card.id"
            :href="`#${card.id}`"
            class="overview-card"
            @click.prevent="scrollToSection(card.id)"
          >
            <span class="overview-icon"
              ><LandingIcon :name="sectionIcon(card.id)" :size="28"
            /></span>
            <span class="overview-card-content">
              <span class="overview-card-title">{{ card.title }}</span>
              <span class="overview-card-desc">{{ card.desc }}</span>
            </span>
          </a>
        </div>
      </section>

      <!-- Inhalt -->
      <div class="blog-content">
        <div class="content-layout">
          <aside class="toc-sidebar">
            <div class="toc-inner">
              <h2 class="toc-title">{{ page.toc }}</h2>
              <nav class="toc-nav" :aria-label="page.toc">
                <a
                  v-for="entry in tocEntries"
                  :key="entry.id"
                  :href="`#${entry.id}`"
                  class="toc-link"
                  :class="{ active: activeSection === entry.id }"
                  @click.prevent="scrollToSection(entry.id)"
                >
                  <span class="toc-icon"><LandingIcon :name="entry.icon" :size="14" /></span>
                  {{ entry.nav }}
                </a>
              </nav>
              <RouterLink :to="{ name: 'editor' }" class="toc-cta">
                {{ page.startEditor }}
                <LandingIcon name="arrow" :size="14" :stroke-width="2.5" />
              </RouterLink>
            </div>
          </aside>

          <article class="blog-article">
            <section class="article-section intro-section">
              <p class="intro-text">{{ page.intro }}</p>
            </section>

            <section
              v-for="section in page.sections"
              :id="section.id"
              :key="section.id"
              class="article-section"
              :class="{ 'unique-section': section.variant === 'unique' }"
            >
              <div class="article-section-header">
                <div class="article-section-icon">
                  <LandingIcon :name="section.icon as LandingIconName" :size="22" />
                </div>
                <h2 class="article-section-title">{{ section.title }}</h2>
              </div>
              <p v-if="section.intro" class="article-section-intro">{{ section.intro }}</p>

              <div v-if="section.tags" class="tag-box">
                <h3 class="subsection-title">{{ section.tags.title }}</h3>
                <div class="tag-grid">
                  <span v-for="tag in section.tags.items" :key="tag" class="tag-pill">{{
                    tag
                  }}</span>
                </div>
              </div>

              <div v-if="section.categories" class="category-grid">
                <div
                  v-for="category in section.categories"
                  :key="category.name"
                  class="category-card"
                >
                  <h3 class="category-title">{{ category.name }}</h3>
                  <ul class="category-list">
                    <li v-for="item in category.items" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>

              <div v-if="section.groups" class="subsection-grid">
                <div v-for="group in section.groups" :key="group.title" class="subsection-block">
                  <h3 class="subsection-title">{{ group.title }}</h3>
                  <ul class="feature-list">
                    <li v-for="item in group.items" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>

              <div v-if="section.highlight" class="highlight-box">
                <h3 class="subsection-title">{{ section.highlight.title }}</h3>
                <ul class="feature-list feature-list--inline">
                  <li v-for="item in section.highlight.items" :key="item">{{ item }}</li>
                </ul>
              </div>

              <div v-if="section.shortcuts" class="shortcuts-grid">
                <div
                  v-for="shortcut in section.shortcuts"
                  :key="shortcut.key"
                  class="shortcut-item"
                >
                  <kbd class="shortcut-key">{{ shortcut.key }}</kbd>
                  <span class="shortcut-action">{{ shortcut.action }}</span>
                </div>
              </div>

              <ul
                v-if="section.items"
                class="feature-list"
                :class="{
                  'feature-list--grid': section.variant === 'grid' || section.variant === 'unique',
                  'feature-list--highlight': section.variant === 'unique',
                  'feature-list--spaced': section.tags,
                }"
              >
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
            </section>

            <!-- Zusammenfassung -->
            <section class="article-section summary-section">
              <h2 class="article-section-title">{{ page.summary.title }}</h2>
              <p class="article-section-intro">{{ page.summary.text }}</p>
              <ul class="summary-list">
                <li v-for="item in page.summary.items" :key="item">
                  <span class="summary-check"
                    ><LandingIcon name="check" :size="16" :stroke-width="3"
                  /></span>
                  {{ item }}
                </li>
              </ul>
              <p class="summary-cta-text">{{ page.summary.cta }}</p>
            </section>
          </article>
        </div>
      </div>

      <!-- CTA -->
      <section class="cta-section">
        <div class="cta-content">
          <h2 class="cta-title">{{ page.cta.title }}</h2>
          <p class="cta-subtitle">{{ page.cta.subtitle }}</p>
          <RouterLink :to="{ name: 'editor' }" class="btn-primary btn-large">
            <span class="btn-icon"><LandingIcon name="play" :size="24" /></span>
            {{ page.cta.button }}
          </RouterLink>
        </div>
      </section>
    </div>
  </LandingLayout>
</template>
