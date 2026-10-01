<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import LandingLayout from '@/components/landing/LandingLayout.vue'
import LandingIcon from '@/components/landing/LandingIcon.vue'
import { formatBlogDate, getBlogArticlesNewestFirst } from '@/data/blogArticles'

/**
 * Blogseite: "Aus dem Blog" -- gleiches Muster wie der Blog-Abschnitt der
 * Visualizer-Landingpage (Karten mit Bild, Kategorie, Datum/Lesezeit, Titel,
 * Beschreibung, "Artikel lesen").
 */
const { t, locale } = useI18n()

const blogCards = computed(() => {
  const lang = locale.value
  return getBlogArticlesNewestFirst().map((article) => {
    const meta = [
      article.date ? formatBlogDate(article.date, lang) : '',
      article.minutes ? `${article.minutes} ${t.value.landing.blog.minutes}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      id: article.id,
      url: article.url[lang],
      image: article.image?.[lang] ?? '',
      tag: article.tag[lang],
      title: article.title[lang],
      description: article.description[lang],
      meta,
    }
  })
})
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
          v-for="article in blogCards"
          :key="article.id"
          :href="article.url"
          class="blog-card"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="blog-card-media">
            <img
              v-if="article.image"
              :src="article.image"
              alt=""
              width="640"
              height="360"
              loading="lazy"
            />
            <!-- Ohne Vorschaubild: stilisierte Dokumentseite im Theme. -->
            <div v-else class="blog-card-sheet" aria-hidden="true">
              <span class="sheet-heading"></span>
              <span v-for="n in 6" :key="n" class="sheet-line"></span>
            </div>
          </div>
          <div class="blog-card-body">
            <div class="blog-card-header">
              <span class="blog-card-tag">{{ article.tag }}</span>
              <span v-if="article.meta" class="blog-card-meta">{{ article.meta }}</span>
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
