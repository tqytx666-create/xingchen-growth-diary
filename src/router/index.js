import { createRouter, createWebHashHistory } from 'vue-router'
import { session, currentUser } from '../lib/store.js'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../pages/Login.vue') },
  { path: '/preview', component: () => import('../pages/Preview.vue') },   // 效果预览(免登录,不碰真实数据)

  { path: '/child/today', component: () => import('../pages/child/Today.vue'), meta: { role: 'child' } },
  { path: '/child/pet', component: () => import('../pages/child/Pet.vue'), meta: { role: 'child' } },
  { path: '/child/streak', component: () => import('../pages/child/Streak.vue'), meta: { role: 'child' } },
  { path: '/child/calendar', component: () => import('../pages/child/Calendar.vue'), meta: { role: 'child' } },
  { path: '/child/bank', component: () => import('../pages/child/Bank.vue'), meta: { role: 'child' } },
  { path: '/child/rewards', component: () => import('../pages/child/Rewards.vue'), meta: { role: 'child' } },
  { path: '/child/shop', component: () => import('../pages/child/Shop.vue'), meta: { role: 'child' } },

  { path: '/family/dashboard', component: () => import('../pages/family/Dashboard.vue'), meta: { role: 'family' } },
  { path: '/family/checkins', component: () => import('../pages/family/Checkins.vue'), meta: { role: 'family' } },
  { path: '/family/calendar', component: () => import('../pages/family/CalendarView.vue'), meta: { role: 'family' } },
  { path: '/family/logs', component: () => import('../pages/family/Logs.vue'), meta: { role: 'family' } },
  { path: '/family/rewards', component: () => import('../pages/family/Rewards.vue'), meta: { role: 'family' } },

  { path: '/admin', component: () => import('../pages/admin/Config.vue'), meta: { role: 'admin' } },

  // 兜底:未知路由(旧书签 / 拼错 / PWA 缓存失效链接)不留空白页,按角色回到对应首页
  { path: '/:pathMatch(.*)*', redirect: () => {
    const u = currentUser()
    if (!u) return '/login'
    return u.role === 'child' ? '/child/today' : '/family/dashboard'
  } }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const u = currentUser()
  if (to.path === '/login' || to.path === '/preview') return true
  if (!u) return '/login'
  // 角色门:admin 可进 family + admin;family 进 family;child 进 child
  const need = to.meta.role
  if (!need) return true
  if (need === 'child' && u.role !== 'child') return '/family/dashboard'
  if (need === 'family' && u.role === 'child') return '/child/today'
  if (need === 'admin' && u.role !== 'admin') return '/family/dashboard'
  return true
})

export default router
