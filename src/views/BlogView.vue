<script setup lang="ts">
import { useI18n } from '@/i18n'
import LandingLayout from '@/components/landing/LandingLayout.vue'
import LandingIcon from '@/components/landing/LandingIcon.vue'

const { t } = useI18n()
</script>

<template>
  <LandingLayout>
    <section id="blog" class="blog-section blog-page">
      <div class="section-header">
        <h1 class="section-title">{{ t.landing.blog.title }}</h1>
        <p class="section-subtitle">{{ t.landing.blog.subtitle }}</p>
      </div>
      <div class="blog-grid">
        <a
          v-for="article in t.landing.blog.articles"
          :key="article.url"
          :href="article.url"
          class="blog-card"
          target="_blank"
          rel="noopener noreferrer"
        >
          <!-- Kein entferntes Vorschaubild: stilisierte Dokumentseite im Theme. -->
          <div class="blog-card-media" aria-hidden="true">
            <div class="blog-card-sheet">
              <span class="sheet-heading"></span>
              <span v-for="n in 6" :key="n" class="sheet-line"></span>
            </div>
          </div>
          <div class="blog-card-body">
            <div class="blog-card-header">
              <span class="blog-card-tag">{{ article.tag }}</span>
              <span class="blog-card-meta">kodinitools.com/blog</span>
            </div>
            <h2 class="blog-card-title">{{ article.title }}</h2>
            <p class="blog-card-description">{{ article.description }}</p>
            <span class="blog-card-link">
              {{ t.landing.blog.readMore }}
              <LandingIcon name="arrow" :size="16" :stroke-width="2.5" />
            </span>
          </div>
        </a>
      </div>
    </section>
  </LandingLayout>
</template>
