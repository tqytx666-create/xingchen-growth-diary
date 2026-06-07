import { createRouter, createWebHashHistory } from 'vue-router'
import { session, currentUser, IS_DEMO } from '../lib/store.js'

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
  { path: '/family/childview', component: () => import('../pages/family/ChildView.vue'), meta: { role: 'family' } },
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
  // Demo:免登录,任何入口都进孩子端
  if (IS_DEMO) return (to.meta.role && to.meta.role !== 'child') || to.path === '/login' || to.path === '/' ? '/child/today' : true
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

// 兜底:用户 app 开着时正好发版,点进未加载过的懒加载页会拿不到旧 chunk(404)。
// 这种动态导入失败时自动整页刷新一次(拿到最新版),避免白屏;每次成功跳转后清标记,允许下次发版再兜底。
router.onError((err) => {
  const msg = (err && err.message) || ''
  if (/dynamically imported module|Importing a module script|Failed to fetch dynamically|error loading dynamically/i.test(msg)) {
    if (!sessionStorage.getItem('xc_chunk_reload')) {
      sessionStorage.setItem('xc_chunk_reload', '1')
      location.reload()
    }
  }
})
router.afterEach(() => { sessionStorage.removeItem('xc_chunk_reload') })

export default router
