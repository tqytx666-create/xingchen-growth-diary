import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import { bank } from './lib/store.js'
import { settleInterest } from './services/timeBankService.js'

// 启动结算利息(每日 1%)
try { settleInterest() } catch (e) { /* ignore */ }

createApp(App).use(router).mount('#app')
