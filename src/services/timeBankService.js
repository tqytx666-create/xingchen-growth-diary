import { db, bank, child } from '../lib/store.js'
import { round2, todayStr, daysBetween, nowISO, uid } from '../lib/util.js'

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

// 每日 1% 利息(逐天累加),由管理员开关
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
