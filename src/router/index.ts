import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import EditorView from '@/views/EditorView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'editor', component: EditorView },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
