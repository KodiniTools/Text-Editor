<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import LandingLayout from '@/components/landing/LandingLayout.vue'
import LandingIcon, { type LandingIconName } from '@/components/landing/LandingIcon.vue'
import { useDocumentTheme } from '@/composables/useDocumentTheme'

const { t } = useI18n()

// Icons fest je Karte (Reihenfolge = messages.landing.features.cards).
// Die Icon-Box ist einheitlich akzentfarben (Tokens), siehe .feature-icon in landing.css.
const FEATURE_ICONS: LandingIconName[] = ['type', 'file', 'tools', 'lock']

const featureCards = computed(() =>
  t.value.landing.features.cards.map((card, index) => ({
    ...card,
    icon: FEATURE_ICONS[index % FEATURE_ICONS.length],
  })),
)

const guideSteps = computed(() => t.value.landing.guide.steps)

// Hero-Bild je Theme aus public/image (zum Austauschen nur die Dateien ersetzen).
// Fehlt eine Datei, wird der Bildbereich ausgeblendet statt ein kaputtes Bild zu zeigen.
const { isDark } = useDocumentTheme()
const heroSrc = computed(
  () => `${import.meta.env.BASE_URL}image/hero-${isDark.value ? 'dark' : 'light'}.webp`,
)
const heroFailed = ref(false)
watch(heroSrc, () => (heroFailed.value = false))

const activeFaq = ref<number | null>(null)
function toggleFaq(index: number): void {
  activeFaq.value = activeFaq.value === index ? null : index
}
</script>

<template>
  <LandingLayout>
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          {{ t.landing.hero.title }}
          <span class="hero-highlight">{{ t.landing.hero.highlight }}</span>
        </h1>
        <p class="hero-subtitle">{{ t.landing.hero.subtitle }}</p>
        <div class="hero-actions">
          <RouterLink :to="{ name: 'editor' }" class="btn-primary">
            <span class="btn-icon"><LandingIcon name="play" :size="20" /></span>
            {{ t.landing.hero.cta }}
          </RouterLink>
          <a href="#features" class="btn-secondary">{{ t.landing.hero.learnMore }}</a>
        </div>
      </div>
      <div v-if="!heroFailed" class="hero-visual">
        <div class="hero-image-frame">
          <img
            :key="heroSrc"
            :src="heroSrc"
            :alt="t.landing.hero.imageAlt"
            class="hero-image"
            width="832"
            height="1248"
            fetchpriority="high"
            decoding="async"
            @error="heroFailed = true"
          />
        </div>
      </div>
    </section>

    <!-- Funktionen -->
    <section id="features" class="features">
      <div class="section-header">
        <h2 class="section-title">{{ t.landing.features.title }}</h2>
        <p class="section-subtitle">{{ t.landing.features.subtitle }}</p>
      </div>
      <div class="features-grid">
        <div v-for="card in featureCards" :key="card.title" class="feature-card">
          <div class="feature-icon">
            <LandingIcon :name="card.icon" :size="28" />
          </div>
          <h3 class="feature-title">{{ card.title }}</h3>
          <p class="feature-description">{{ card.description }}</p>
        </div>
      </div>
    </section>

    <!-- Anleitung -->
    <section id="anleitung" class="guide-section">
      <div class="section-header">
        <h2 class="section-title">{{ t.landing.guide.title }}</h2>
        <p class="section-subtitle">{{ t.landing.guide.subtitle }}</p>
      </div>
      <ol class="guide-grid">
        <li v-for="(step, index) in guideSteps" :key="step.title" class="feature-card">
          <div class="feature-icon step-number">
            {{ index + 1 }}
          </div>
          <h3 class="feature-title">{{ step.title }}</h3>
          <p class="feature-description">{{ step.description }}</p>
        </li>
      </ol>
    </section>

    <!-- FAQ -->
    <section id="faq" class="faq-section">
      <div class="section-header">
        <h2 class="section-title">{{ t.landing.faq.title }}</h2>
        <p class="section-subtitle">{{ t.landing.faq.subtitle }}</p>
      </div>
      <div class="faq-list">
        <div
          v-for="(faq, index) in t.landing.faq.items"
          :key="index"
          class="faq-item"
          :class="{ active: activeFaq === index }"
        >
          <button
            type="button"
            class="faq-question"
            :aria-expanded="activeFaq === index"
            :aria-controls="`faq-answer-${index}`"
            @click="toggleFaq(index)"
          >
            <span>{{ faq.question }}</span>
            <LandingIcon name="chevron" :size="20" class="faq-icon" />
          </button>
          <div :id="`faq-answer-${index}`" class="faq-answer" role="region">
            <p>{{ faq.answer }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="cta-content">
        <h2 class="cta-title">{{ t.landing.cta.title }}</h2>
        <p class="cta-subtitle">{{ t.landing.cta.subtitle }}</p>
        <RouterLink :to="{ name: 'editor' }" class="btn-primary btn-large">
          <span class="btn-icon"><LandingIcon name="play" :size="24" /></span>
          {{ t.landing.cta.button }}
        </RouterLink>
      </div>
    </section>
  </LandingLayout>
</template>
