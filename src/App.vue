<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { currentUser, syncState, IS_DEMO } from './lib/store.js'
import { toastState } from './lib/toast.js'

const route = useRoute()
const user = computed(() => currentUser())
const role = computed(() => user.value?.role)

const childNav = [
  { to: '/child/today', ic: '📋', label: '今日' },
  { to: '/child/pet', ic: '🐾', label: '宠物' },
  { to: '/child/streak', ic: '🔥', label: '签到' },
  { to: '/child/shop', ic: '🛍️', label: '商城' },
  { to: '/child/rewards', ic: '🎁', label: '奖励' }
]
const familyNav = computed(() => {
  const base = [
    { to: '/family/dashboard', ic: '🏠', label: '概览' },
    { to: '/family/checkins', ic: '✅', label: '核验' },
    { to: '/family/calendar', ic: '📅', label: '日历' },
    { to: '/family/logs', ic: '📒', label: '日志' },
    { to: '/family/rewards', ic: '🎁', label: '兑换' }
  ]
  if (role.value === 'admin') base.push({ to: '/admin', ic: '⚙️', label: '管理' })
  return base
})
const nav = computed(() => (role.value === 'child' ? childNav : familyNav.value))
const showNav = computed(() => route.path !== '/login' && !!user.value)
function refresh() { location.reload() }
</script>

<template>
  <div class="app-root">
    <!-- 全局星空背景:视差星点 + 流星 -->
    <div class="sky-bg" aria-hidden="true">
      <div class="stars-layer stars-far"></div>
      <div class="stars-layer stars-near"></div>
      <span class="shoot shoot-1"></span>
      <span class="shoot shoot-2"></span>
      <span class="shoot shoot-3"></span>
    </div>
    <router-view v-slot="{ Component }">
      <transition name="view" mode="out-in"><component :is="Component" /></transition>
    </router-view>

    <nav v-if="showNav" class="nav">
      <router-link v-for="n in nav" :key="n.to" :to="n.to" :class="{ active: route.path === n.to }">
        <span class="ic">{{ n.ic }}</span>{{ n.label }}
      </router-link>
    </nav>

    <!-- 全局刷新按钮(桌面PWA更新不及时时手动刷新) -->
    <button v-if="showNav" class="refresh-fab" title="刷新" @click="refresh">🔄</button>

    <!-- 云同步状态小指示 -->
    <transition name="view">
      <div v-if="!IS_DEMO && showNav && syncState.syncing" class="sync-chip">☁️ 同步中…</div>
      <div v-else-if="!IS_DEMO && showNav && !syncState.online" class="sync-chip offline">📴 离线(本地保存)</div>
    </transition>

    <div class="toast" :class="{ show: toastState.show }">{{ toastState.msg }}</div>
  </div>
</template>

<style scoped>
/* 顶部安全区:站立式 PWA 从桌面打开时,把内容压到状态栏(时间/刘海)下面 */
.app-root { padding-top: env(safe-area-inset-top); }
/* 全局刷新按钮:右下角浮标,在底部导航之上 */
.refresh-fab {
  position: fixed; right: 14px; z-index: 65;
  bottom: calc(72px + env(safe-area-inset-bottom));
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(20,16,32,.72); border: 1px solid rgba(255,255,255,.2);
  color: #fff; font-size: 18px; line-height: 1; cursor: pointer;
  backdrop-filter: blur(8px); box-shadow: 0 4px 14px rgba(0,0,0,.4);
}
.refresh-fab:active { transform: scale(.9); }
.sync-chip {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(64px + env(safe-area-inset-bottom)); z-index: 60;
  background: rgba(0,0,0,.7); border: 1px solid rgba(255,255,255,.15);
  color: rgba(255,255,255,.85); font-size: 11px; padding: 4px 12px; border-radius: 999px;
  backdrop-filter: blur(8px); pointer-events: none;
}
.sync-chip.offline { color: #ffd0a0; }
</style>
