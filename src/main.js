import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import { initSync } from './lib/store.js'
import { settleInterest } from './services/timeBankService.js'

createApp(App).use(router).mount('#app')

// 后台拉云端数据 + 开启全家实时同步;完成后结算每日利息
initSync().finally(() => {
  try { settleInterest() } catch (e) { /* ignore */ }
})

// 注册 service worker(PWA 可添加到主屏幕、离线可开)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: './' }).catch(() => {})
  })
}
