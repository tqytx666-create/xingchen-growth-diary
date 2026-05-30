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
