<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { currentUser } from './lib/store.js'
import { toastState } from './lib/toast.js'

const route = useRoute()
const user = computed(() => currentUser())
const role = computed(() => user.value?.role)

const childNav = [
  { to: '/child/today', ic: '📋', label: '今日' },
  { to: '/child/pet', ic: '🐾', label: '宠物' },
  { to: '/child/streak', ic: '🔥', label: '签到' },
  { to: '/child/bank', ic: '⏱️', label: '时间' },
  { to: '/child/rewards', ic: '🎁', label: '奖励' }
]
const familyNav = computed(() => {
  const base = [
    { to: '/family/dashboard', ic: '🏠', label: '概览' },
    { to: '/family/checkins', ic: '✅', label: '核验' },
    { to: '/family/logs', ic: '📒', label: '日志' },
    { to: '/family/rewards', ic: '🎁', label: '兑换' }
  ]
  if (role.value === 'admin') base.push({ to: '/admin', ic: '⚙️', label: '管理' })
  return base
})
const nav = computed(() => (role.value === 'child' ? childNav : familyNav.value))
const showNav = computed(() => route.path !== '/login' && !!user.value)
</script>

<template>
  <div>
    <router-view v-slot="{ Component }">
      <transition name="view" mode="out-in"><component :is="Component" /></transition>
    </router-view>

    <nav v-if="showNav" class="nav">
      <router-link v-for="n in nav" :key="n.to" :to="n.to" :class="{ active: route.path === n.to }">
        <span class="ic">{{ n.ic }}</span>{{ n.label }}
      </router-link>
    </nav>

    <div class="toast" :class="{ show: toastState.show }">{{ toastState.msg }}</div>
  </div>
</template>
