import { db, bank, child, pet } from '../lib/store.js'
import { round2, todayStr, daysBetween, nowISO, uid } from '../lib/util.js'
import { rewardMultiplier } from '../lib/petConfig.js'

function txn(type, fields) {
  db.time_bank_transactions.unshift({
    id: uid('tb_'), child_id: bank().child_id, type,
    exercise_type: null, exercise_minutes: null, screen_minutes: 0,
    description: '', created_by: null, created_at: nowISO(), ended_at: null,
    ...fields
  })
  if (db.time_bank_transactions.length > 500) db.time_bank_transactions.pop()
}

// 羽毛球 1:2,其他 1:1
export function deposit({ exerciseType, exerciseMinutes, description, createdBy, sourceId }) {
  const ratio = exerciseType === 'badminton' ? 2 : 1
  const screen = round2(Number(exerciseMinutes) * ratio)
  if (!(screen > 0)) throw new Error('运动时长必须大于 0')
  const b = bank()
  b.current_balance_minutes = round2(b.current_balance_minutes + screen)
  b.updated_at = nowISO()
  txn('deposit', { exercise_type: exerciseType, exercise_minutes: Number(exerciseMinutes), screen_minutes: screen, description: description || `运动存入`, created_by: createdBy, source_id: sourceId })
  return screen
}

export function addBonus({ minutes, description, createdBy }) {
  const add = round2(minutes)
  if (!(add > 0)) throw new Error('奖励时间必须大于 0')
  const b = bank()
  b.current_balance_minutes = round2(b.current_balance_minutes + add)
  b.updated_at = nowISO()
  txn('bonus', { screen_minutes: add, description: description || '奖励时间', created_by: createdBy })
  return add
}

// 游戏支出:不足 1 分钟向上取整
export function spendSeconds({ seconds, description, createdBy }) {
  const minutes = Math.ceil(seconds / 60)
  return spendMinutes({ minutes, seconds, description, createdBy })
}

export function spendMinutes({ minutes, seconds, description, createdBy }) {
  const mins = Math.ceil(Number(minutes))
  if (mins <= 0) throw new Error('分钟数必须大于 0')
  const b = bank()
  if (mins > Math.floor(b.current_balance_minutes)) throw new Error('余额不足')
  b.current_balance_minutes = round2(b.current_balance_minutes - mins)
  b.updated_at = nowISO()
  txn('withdraw', { screen_minutes: -mins, description: description || (seconds ? `使用 ${mins} 分钟(实际${seconds}秒)` : `使用 ${mins} 分钟`), created_by: createdBy, ended_at: nowISO() })
  return mins
}

export function penalty({ minutes, description, createdBy }) {
  const m = round2(minutes)
  const b = bank()
  b.current_balance_minutes = round2(b.current_balance_minutes - m)
  b.updated_at = nowISO()
  txn('penalty', { screen_minutes: -m, description: description || '扣减', created_by: createdBy })
}

// 待收利息(累计未领,不自动入账):余额 × 日利率 × 天数(最多累计 30 天)
export function pendingInterest() {
  const b = bank()
  if (!b || !b.interest_enabled) return 0
  const days = Math.min(30, daysBetween(b.last_interest_date || todayStr(), todayStr()))
  if (days <= 0) return 0
  const base = Math.max(0, Math.round((b.current_balance_minutes || 0) * (b.daily_interest_rate || 0.01) * days))
  // 利息也纳入健康奖励倍率:健康<50→0(不计息);满血+连签→超额(×1.2~3,跟其它日常奖励一致)
  const pp = pet(); const h = pp ? (pp.health == null ? 100 : pp.health) : 100
  const streak = (db.streaks && db.streaks[0] && db.streaks[0].current_streak) || 0
  return Math.round(base * rewardMultiplier(h, streak))
}
// 孩子在宠物页手动收取利息:入账 + 重置计息日 + 返回收取的分钟数
export function collectInterest() {
  const amt = pendingInterest()
  const b = bank()
  b.last_interest_date = todayStr()
  if (amt > 0) {
    b.current_balance_minutes = round2(b.current_balance_minutes + amt)
    b.updated_at = nowISO()
    txn('interest', { screen_minutes: amt, description: '✨ 收取每日利息' })
  }
  return amt
}

// (旧)每日 1% 利息自动逐天累加——已改为手动收取,保留函数不再调用
export function settleInterest() {
  const b = bank()
  if (!b.interest_enabled) return 0
  const today = todayStr()
  if (!b.last_interest_date) { b.last_interest_date = today; return 0 }
  const days = daysBetween(b.last_interest_date, today)
  if (days <= 0) return 0
  let added = 0
  for (let i = 0; i < days; i++) {
    const itr = round2(b.current_balance_minutes * (b.daily_interest_rate || 0.01))
    if (itr > 0) {
      b.current_balance_minutes = round2(b.current_balance_minutes + itr)
      added = round2(added + itr)
      txn('interest', { screen_minutes: itr, description: '每日 1% 利息' })
    }
  }
  b.last_interest_date = today
  b.updated_at = nowISO()
  return added
}
