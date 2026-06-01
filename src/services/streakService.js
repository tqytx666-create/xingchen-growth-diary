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

// 每日"全勤"要求的支线任务:早刷牙+晚刷牙+洗澡+房间整洁(洗头是3天一次、羽毛球无每日要求,均不计)
const DAILY_SIDE_TASKS = ['t_teeth_am', 't_teeth_pm', 't_bath', 't_room']

// 本周"支线全勤天数":本周内有几天把上面 4 个每日支线任务全部打卡(虚报/撤销不算)
export function sideFullDays() {
  const s = streak()
  const today = todayStr()
  const wkStart = s.current_week_start || weekStart(today)
  // 按日期归集本周有效的支线打卡
  const byDate = {}
  for (const c of db.checkins) {
    if (c.status === 'false_reported' || c.status === 'revoked') continue
    if (c.checkin_date < wkStart || c.checkin_date > today) continue
    if (!DAILY_SIDE_TASKS.includes(c.task_id)) continue
    ;(byDate[c.checkin_date] ||= new Set()).add(c.task_id)
  }
  let full = 0
  for (const date in byDate) {
    if (DAILY_SIDE_TASKS.every(t => byDate[date].has(t))) full++
  }
  return full
}

export function weeklyProgress() {
  const s = streak()
  return { count: s.current_week_count, weekStart: s.current_week_start, rules: db.weekly_reward_rules, sideFull: sideFullDays() }
}

export function nextCumulative() {
  const s = streak()
  const rules = db.cumulative_reward_rules || []
  const rule = rules.find(r => r.streak > s.current_streak)
  return { current: s.current_streak, longest: s.longest_streak, total: s.total_main_checkin_days, next: rule || null }
}

// 可补卡的"漏打英语日":从 max(本周一, 首次英语打卡日) 到昨天,缺英语打卡的日期。
// 不含今天(今天可正常打卡),也不offer用户开始用之前的日子。
export function missedMainDays() {
  const mt = mainTask()
  const today = todayStr()
  const s = streak()
  const valid = []
  for (const c of db.checkins) {
    if (c.task_id === mt.id && c.status !== 'false_reported' && c.status !== 'revoked') valid.push(c.checkin_date)
  }
  if (!valid.length) return []
  const set = new Set(valid)
  const firstDate = valid.slice().sort()[0]
  const wkStart = s.current_week_start || weekStart(today)
  let d = wkStart > firstDate ? wkStart : firstDate
  const missed = []
  while (d < today) {
    if (!set.has(d)) missed.push(d)
    d = addDays(d, 1)
  }
  return missed
}

// 断签判定:进入新的一天时,如果昨天没有英语打卡 → 触发未完成
export function checkMissedYesterday() {
  const dates = new Set(validMainDates())
  const y = addDays(todayStr(), -1)
  // 只有当存在更早记录(说明已经在用)才提醒,避免首日误报
  if (dates.size > 0 && !dates.has(y)) return true
  return false
}
