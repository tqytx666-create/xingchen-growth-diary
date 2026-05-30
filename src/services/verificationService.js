import { db, audit } from '../lib/store.js'
import { nowISO, uid } from '../lib/util.js'
import * as streakSvc from './streakService.js'
import * as petSvc from './petService.js'
import * as creditSvc from './creditService.js'
import * as bankSvc from './timeBankService.js'

function log(checkinId, actorId, action, reason) {
  db.verification_logs.unshift({
    id: uid('vl_'), checkin_id: checkinId, actor_id: actorId, action, reason: reason || null, created_at: nowISO()
  })
}

function getTask(checkin) { return db.tasks.find(t => t.id === checkin.task_id) }

export function confirm(checkinId, actorId) {
  const c = db.checkins.find(x => x.id === checkinId); if (!c) return
  c.status = 'confirmed'; c.verified_by = actorId; c.verified_at = nowISO()
  log(checkinId, actorId, 'confirm')
  creditSvc.applyConfirm(checkinId, actorId)
  audit(actorId, 'checkin', checkinId, 'confirm', { task: getTask(c)?.name })
}

export function markFalse(checkinId, actorId, reason) {
  const c = db.checkins.find(x => x.id === checkinId); if (!c) return
  const task = getTask(c)
  c.status = 'false_reported'; c.verified_by = actorId; c.verified_at = nowISO()
  log(checkinId, actorId, 'mark_false', reason)
  // 宠物惩罚
  petSvc.applyFalseReportPenalty(task, checkinId)
  // 诚信扣分
  creditSvc.applyFalsePenalty(task, checkinId, actorId)
  // 羽毛球虚报 → 回滚时间银行
  if (task.id === 't_badminton' && c.exercise_minutes > 0) {
    bankSvc.penalty({ minutes: c.exercise_minutes * 2, description: `虚报回滚:羽毛球`, createdBy: actorId })
  }
  // 主线 → 重算连签
  if (task.task_type === 'main') streakSvc.recompute()
  audit(actorId, 'checkin', checkinId, 'mark_false', { task: task?.name, reason })
}

export function dispute(checkinId, actorId, reason) {
  const c = db.checkins.find(x => x.id === checkinId); if (!c) return
  c.status = 'disputed'; c.verified_by = actorId; c.verified_at = nowISO()
  log(checkinId, actorId, 'dispute', reason)
  audit(actorId, 'checkin', checkinId, 'dispute', { reason })
}

export function revoke(checkinId, actorId) {
  const c = db.checkins.find(x => x.id === checkinId); if (!c) return
  const task = getTask(c)
  c.status = 'revoked'; c.verified_by = actorId; c.verified_at = nowISO()
  log(checkinId, actorId, 'revoke')
  if (task.task_type === 'main') streakSvc.recompute()
  audit(actorId, 'checkin', checkinId, 'revoke', { task: task?.name })
}
