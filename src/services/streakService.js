import { db, streak, mainTask, child } from '../lib/store.js'
import { todayStr, weekStart, addDays, nowISO } from '../lib/util.js'

// 有效的英语打卡日期(虚报/撤销不算)
function validMainDates() {
  const mt = mainTask()
  const set = new Set()
  for (const c of db.checkins) {
    if (c.task_id === mt.id && c.status !== 'false_reported' && c.status !== 'revoked') {
      set.add(c.checkin_date)
    }
  }
  return [...set].sort()
}

// 任何英语打卡变化后统一重算(打卡 / 虚报 / 撤销都走这里)
export function recompute() {
  const s = streak()
  const dates = validMainDates()
  const setD = new Set(dates)
  const today = todayStr()

  s.total_main_checkin_days = dates.length
  s.current_week_start = weekStart(today)
  s.current_week_count = dates.filter(d => d >= s.current_week_start && d <= today).length

  // 当前连续:从今天或昨天往回数
  let cur = 0
  let anchor = setD.has(today) ? today : (setD.has(addDays(today, -1)) ? addDays(today, -1) : null)
  if (anchor) {
    let d = anchor
    while (setD.has(d)) { cur++; d = addDays(d, -1) }
  }
  s.current_streak = cur

  // 历史最长
  let longest = 0, run = 0, prev = null
  for (const d of dates) {
    if (prev && addDays(prev, 1) === d) run++
    else run = 1
    longest = Math.max(longest, run)
    prev = d
  }
  s.longest_streak = Math.max(longest, s.longest_streak || 0)
  s.updated_at = nowISO()
}

export function weeklyProgress() {
  const s = streak()
  return { count: s.current_week_count, weekStart: s.current_week_start, rules: db.weekly_reward_rules }
}

export function nextCumulative() {
  const s = streak()
  const rule = db.cumulative_reward_rules.find(r => r.streak > s.current_streak)
  return { current: s.current_streak, longest: s.longest_streak, total: s.total_main_checkin_days, next: rule || null }
}

// 断签判定:进入新的一天时,如果昨天没有英语打卡 → 触发未完成
export function checkMissedYesterday() {
  const dates = new Set(validMainDates())
  const y = addDays(todayStr(), -1)
  // 只有当存在更早记录(说明已经在用)才提醒,避免首日误报
  if (dates.size > 0 && !dates.has(y)) return true
  return false
}
