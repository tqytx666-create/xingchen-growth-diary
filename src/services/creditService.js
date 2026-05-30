import { db, credit, child } from '../lib/store.js'
import { clamp, nowISO, uid } from '../lib/util.js'

const LEVELS = [
  { min: 90, name: '完全信任', stars: 5 },
  { min: 75, name: '很信任', stars: 4 },
  { min: 60, name: '信任', stars: 3 },
  { min: 40, name: '观察中', stars: 2 },
  { min: 0, name: '需努力', stars: 1 }
]

export function levelInfo(score = credit().credit_score) {
  return LEVELS.find(l => score >= l.min) || LEVELS[LEVELS.length - 1]
}

function txn(sourceType, sourceId, delta, reason, createdBy) {
  const c = credit()
  c.credit_score = clamp(c.credit_score + delta, 0, 120)
  c.credit_level = levelInfo().name
  c.updated_at = nowISO()
  db.credit_transactions.unshift({
    id: uid('ct_'), child_id: c.child_id, source_type: sourceType, source_id: sourceId,
    delta, reason, created_by: createdBy, created_at: nowISO()
  })
}

export function applyConfirm(checkinId, actorId) {
  txn('verification', checkinId, +3, '打卡被确认属实', actorId)
}

export function applyFalsePenalty(task, checkinId, actorId) {
  const d = task.task_type === 'main' ? -20 : -10
  txn('penalty', checkinId, d, `虚报:${task.name}`, actorId)
}

export function initIfNeeded() {
  if (!db.credit_profile.length) {
    db.credit_profile.push({ id: 'credit_1', child_id: child().id, credit_score: 100, credit_level: '完全信任', reward_discount_rate: 1, updated_at: nowISO() })
  }
}
