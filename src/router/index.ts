import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import EditorView from '@/views/EditorView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'editor', component: EditorView },
  // Vollbild-Vorschau in eigenem Tab (lazy, damit die Startseite schlank bleibt).
  { path: '/preview', name: 'preview', component: () => import('@/views/PreviewView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
