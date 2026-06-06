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

// 确认属实:解锁宠物互动(道具出现在宠物页),加诚信分。
// 英语上课(lesson)可传 gameMinutes:确认时把这节课换成的游戏时间存进时间银行。
export function confirm(checkinId, actorId, gameMinutes) {
  const c = db.checkins.find(x => x.id === checkinId); if (!c) return
  const task = getTask(c)
  c.status = 'confirmed'; c.verified_by = actorId; c.verified_at = nowISO()
  log(checkinId, actorId, 'confirm')
  creditSvc.applyConfirm(checkinId, actorId)
  if (task?.lesson && gameMinutes > 0) {
    bankSvc.addBonus({ minutes: gameMinutes, description: `英语外教课:${task.name}`, createdBy: actorId })
    c.game_minutes = gameMinutes
  }
  audit(actorId, 'checkin', checkinId, 'confirm', { task: task?.name, gameMinutes: gameMinutes || 0 })
}

export function markFalse(checkinId, actorId, reason) {
  const c = db.checkins.find(x => x.id === checkinId); if (!c) return
  const task = getTask(c)
  const wasInteracted = !!c.interacted
  c.status = 'false_reported'; c.verified_by = actorId; c.verified_at = nowISO()
  log(checkinId, actorId, 'mark_false', reason)
  // 只有已经互动过(长过属性)才回退属性;否则只扣心情/信任/风险
  petSvc.applyFalseReportPenalty(task, wasInteracted)
  creditSvc.applyFalsePenalty(task, checkinId, actorId)
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
