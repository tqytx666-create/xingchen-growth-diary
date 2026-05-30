import { db, child, audit } from '../lib/store.js'
import { todayStr, nowISO, uid } from '../lib/util.js'
import * as streakSvc from './streakService.js'
import * as petSvc from './petService.js'
import * as bankSvc from './timeBankService.js'
import * as rewardSvc from './rewardService.js'

export function todayCheckins(date = todayStr()) {
  const cid = child().id
  return db.checkins.filter(c => c.child_id === cid && c.checkin_date === date)
}

export function statusOf(taskId, date = todayStr()) {
  const c = todayCheckins(date).find(x => x.task_id === taskId && x.status !== 'revoked')
  return c || null
}

// 星晨自主打卡
export function createCheckin(taskId, opts = {}) {
  const date = opts.date || todayStr()
  const task = db.tasks.find(t => t.id === taskId)
  if (!task) throw new Error('任务不存在')
  if (statusOf(taskId, date)) throw new Error('今天已经打过卡啦')

  const cid = child().id
  const checkin = {
    id: uid('c_'), task_id: taskId, child_id: cid, checkin_date: date,
    status: 'self_reported', self_reported_at: nowISO(),
    verified_by: null, verified_at: null, note: opts.note || null,
    exercise_minutes: opts.exerciseMinutes || null
  }
  db.checkins.unshift(checkin)

  // 宠物属性
  const delta = petSvc.applyTaskExp(task, checkin.id)
  // 主线:连签重算 + 周奖励
  let weeklyGranted = []
  if (task.task_type === 'main') {
    streakSvc.recompute()
    weeklyGranted = rewardSvc.checkWeeklyRewards(cid)
  }
  // 羽毛球:时间银行存入
  let deposited = 0
  if (task.id === 't_badminton' && opts.exerciseMinutes > 0) {
    deposited = bankSvc.deposit({ exerciseType: 'badminton', exerciseMinutes: opts.exerciseMinutes, description: `羽毛球 ${opts.exerciseMinutes} 分钟`, createdBy: cid, sourceId: checkin.id })
  }
  const evolved = petSvc.checkEvolution()
  audit(cid, 'checkin', checkin.id, 'self_report', { task: task.name, date })
  return { checkin, delta, deposited, evolved, weeklyGranted, task }
}
