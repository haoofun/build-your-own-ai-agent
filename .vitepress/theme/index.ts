import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './fonts/ibm-plex-sans-sc.css'   // 手动自托管的 SC（@ibm/plex-sans-sc，unicode-range 分块）
import './custom.css'
import './home.css'                      // 首页 token 桥 + 落地页布局（纯网站地盘）
import HomePage from './components/HomePage.vue'
import OutlinePage from './components/OutlinePage.vue'
import AboutPage from './components/AboutPage.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('OutlinePage', OutlinePage)
    app.component('AboutPage', AboutPage)
  },
} satisfies Theme
