import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { loadGlobalNav } from './utils/globalNav'
import './style.css'

createApp(App).use(createPinia()).use(router).mount('#app')

// Globale Navigation immer frisch vom Live-Server uebernehmen (ersetzt den
// eingebackenen Offline-Fallback, sobald verfuegbar). Bewusst nach dem Mount und
// ohne await -- die App startet unabhaengig davon.
void loadGlobalNav()
