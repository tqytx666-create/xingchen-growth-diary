import { reactive, watch, ref } from 'vue'
import { buildSeed, buildDemoSeed, SEED_VERSION } from './seed.js'
import { nowISO } from './util.js'
import { supabase } from './supabase.js'

// Demo 模式:URL 带 ?demo —— 全解锁、本地独立数据、绝不连真实云端(防污染小鱼数据)
export const IS_DEMO = (typeof location !== 'undefined') && new URLSearchParams(location.search).has('demo')

/*
  数据层:reactive db 为唯一数据源(所有 service/组件同步读写)。
  - 本地:localStorage 缓存,离线/首屏可用。
  - 云端:整个 db 存在 Supabase 的 xc_state 单行 jsonb,配合 Realtime 实现全家多端同步。
  写流程: db 变化 → 防抖 → upsert 到 xc_state。
  读流程: 启动拉 xc_state 覆盖本地;Realtime 收到别端更新 → 覆盖本地。
  last-write-wins(家庭低并发场景足够)。
*/

const LS_KEY = IS_DEMO ? 'xingchen_demo_db' : 'xingchen_growth_db'
const SESSION_KEY = 'xingchen_session'
const STATE_ID = 1

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.meta && parsed.meta.version === SEED_VERSION && (!IS_DEMO || parsed.meta.demo)) return parsed
    }
  } catch (e) { /* ignore */ }
  return IS_DEMO ? buildDemoSeed() : buildSeed()
}

export const db = reactive(loadLocal())
export const session = reactive({ userId: localStorage.getItem(SESSION_KEY) || null })
// Demo:免登录,自动以星晨(孩子)身份进入
if (IS_DEMO) { const c = db.users.find(u => u.role === 'child'); if (c) session.userId = c.id }
export const syncState = reactive({ online: false, syncing: false })

// ---- 同步内部状态 ----
let lastSerialized = JSON.stringify(db)   // 最近一次与云端一致的快照(抑制回声)
let suppress = false                       // 应用远端数据时,暂停本地→云端回推
let pushTimer = null

function serialize() { return JSON.stringify(stripVolatile(db)) }
// 不参与同步比较的易变字段可在此剔除(目前无)
function stripVolatile(o) { return o }

function applyRemote(obj) {
  suppress = true
  Object.keys(db).forEach(k => { if (!(k in obj)) delete db[k] })
  Object.assign(db, obj)
  // 兜底:远端快照若缺某些(新加的)顶层字段(coins/owned_*/items/boxes/reward_requests 等),
  // 用种子默认补上,避免后续 .unshift/.find/.includes 在 undefined 上崩溃。
  const fresh = buildSeed()
  for (const k in fresh) if (db[k] === undefined) db[k] = fresh[k]
  lastSerialized = JSON.stringify(stripVolatile(db))
  localStorage.setItem(LS_KEY, lastSerialized)
  setTimeout(() => { suppress = false }, 0)
}

async function pushNow() {
  if (IS_DEMO) return        // demo 只存本地,绝不写云端
  if (suppress) return
  const json = serialize()
  if (json === lastSerialized) return
  lastSerialized = json
  syncState.syncing = true
  try {
    // upsert:云端行不存在时也能创建(update 匹配 0 行会静默丢数据);并检查 error 不再吞掉
    const { error } = await supabase.from('xc_state').upsert({ id: STATE_ID, data: JSON.parse(json), updated_at: nowISO() })
    if (error) console.warn('[sync] push error', error)
  } catch (e) {
    console.warn('[sync] push failed', e)
  } finally {
    syncState.syncing = false
  }
}

// 本地任何变化 → 写 localStorage + 防抖推云端
watch(db, () => {
  const json = serialize()
  localStorage.setItem(LS_KEY, json)
  if (suppress) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(pushNow, 500)
}, { deep: true })

function onRemote(payload) {
  const remote = payload.new && payload.new.data
  if (!remote || !remote.meta) return
  if (remote.meta.version !== SEED_VERSION) return
  const json = JSON.stringify(stripVolatile(remote))
  if (json === lastSerialized) return // 自己的回声
  applyRemote(remote)
}

export async function initSync() {
  if (IS_DEMO) { syncState.online = false; return }   // demo 不连云端,纯本地
  try {
    const { data, error } = await supabase.from('xc_state').select('data').eq('id', STATE_ID).maybeSingle()
    if (error) throw error
    const remote = data && data.data
    if (remote && remote.meta && remote.meta.version === SEED_VERSION) {
      applyRemote(remote)        // 云端已有数据 → 以云端为准
    } else {
      lastSerialized = null       // 云端空或版本不符 → 上传本地种子
      await pushNow()
    }
    supabase.channel('xc_state_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'xc_state', filter: `id=eq.${STATE_ID}` }, onRemote)
      .subscribe()
    syncState.online = true
  } catch (e) {
    console.warn('[sync] init failed, offline mode', e)
    syncState.online = false
  }
}

export function saveNow() { localStorage.setItem(LS_KEY, serialize()) }

export function setUser(userId) {
  session.userId = userId
  if (userId) localStorage.setItem(SESSION_KEY, userId)
  else localStorage.removeItem(SESSION_KEY)
}
export function currentUser() { return db.users.find(u => u.id === session.userId) || null }

export function resetDB() {
  const fresh = buildSeed()
  Object.keys(db).forEach(k => { delete db[k] })
  Object.assign(db, fresh)
  saveNow()
}

// ---- 通用查找 ----
export const child = () => db.users.find(u => u.role === 'child')
export const pet = () => db.pet_profile[0]
export const petAttrs = () => db.pet_attributes[0]
export const streak = () => db.streaks[0]
export const credit = () => db.credit_profile[0]
export const bank = () => db.time_bank_accounts[0]
export const mainTask = () => db.tasks.find(t => t.task_type === 'main')

// ---- 审计日志 ----
export function audit(actorId, targetType, targetId, action, detail = {}) {
  db.audit_logs.unshift({
    id: 'a_' + Math.random().toString(36).slice(2, 9),
    actor_id: actorId, target_type: targetType, target_id: targetId,
    action, detail, created_at: nowISO()
  })
  if (db.audit_logs.length > 500) db.audit_logs.pop()
}
