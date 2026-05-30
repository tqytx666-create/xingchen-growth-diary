import { reactive, watch } from 'vue'
import { buildSeed, SEED_VERSION } from './seed.js'
import { nowISO } from './util.js'

/*
  数据层抽象:第一版用浏览器 localStorage,结构完全对齐 DATA_MODEL.md 的表。
  以后接 Supabase 时,只需把 services 里对 db.xxx 的读写替换为 supabase 调用,
  其余业务逻辑(streak/pet/credit/timebank/reward)保持不变。
*/

const LS_KEY = 'xingchen_growth_db'
const SESSION_KEY = 'xingchen_session'

function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 结构升级:旧版本数据直接重建(早期阶段,尚无重要数据)
      if (parsed && parsed.meta && parsed.meta.version === SEED_VERSION) return parsed
    }
  } catch (e) { /* ignore */ }
  return buildSeed()
}

export const db = reactive(loadDB())

export const session = reactive({
  userId: localStorage.getItem(SESSION_KEY) || null
})

let saveTimer = null
watch(db, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(db))
  }, 120)
}, { deep: true })

export function saveNow() {
  localStorage.setItem(LS_KEY, JSON.stringify(db))
}

export function setUser(userId) {
  session.userId = userId
  if (userId) localStorage.setItem(SESSION_KEY, userId)
  else localStorage.removeItem(SESSION_KEY)
}

export function currentUser() {
  return db.users.find(u => u.id === session.userId) || null
}

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
