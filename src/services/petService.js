import { db, pet, petAttrs } from '../lib/store.js'
import { clamp, nowISO, uid } from '../lib/util.js'
import { STAGES } from '../lib/petConfig.js'

function event(sourceType, sourceId, eventType, delta, message) {
  db.pet_events.unshift({
    id: uid('pe_'), pet_id: pet().id, source_type: sourceType, source_id: sourceId,
    event_type: eventType, attribute_delta: delta, message, created_at: nowISO()
  })
  if (db.pet_events.length > 300) db.pet_events.pop()
}

// 任务完成加属性
export function applyTaskExp(task, sourceId) {
  const a = petAttrs(); const p = pet()
  const delta = {}
  a[task.attribute_key] = clamp(a[task.attribute_key] + task.base_exp)
  delta[task.attribute_key] = task.base_exp
  if (task.attribute_key2) {
    a[task.attribute_key2] = clamp(a[task.attribute_key2] + task.base_exp2)
    delta[task.attribute_key2] = task.base_exp2
  }
  a.mood_score = clamp(a.mood_score + 4)
  a.updated_at = nowISO()
  // 英语完成:解除低落、降低退阶风险
  if (task.task_type === 'main') {
    if (p.mood === 'low') p.mood = 'normal'
    if (p.risk > 0) p.risk = Math.max(0, p.risk - 1)
  }
  p.mood = 'happy'
  event('checkin', sourceId, 'exp_gain', delta, `${task.name}完成,${labelDelta(delta)}`)
  checkEvolution()
  return delta
}

// 虚报惩罚:回退属性 + 降心情/信任 + 风险上升
export function applyFalseReportPenalty(task, sourceId) {
  const a = petAttrs(); const p = pet()
  const back = (task.base_exp || 0) + 3
  const delta = {}
  a[task.attribute_key] = clamp(a[task.attribute_key] - back)
  delta[task.attribute_key] = -back
  if (task.attribute_key2) { a[task.attribute_key2] = clamp(a[task.attribute_key2] - (task.base_exp2 || 0)); delta[task.attribute_key2] = -(task.base_exp2 || 0) }
  a.mood_score = clamp(a.mood_score - 14)
  a.trust_bond = clamp(a.trust_bond - 10)
  a.updated_at = nowISO()
  p.mood = 'disappointed'
  p.risk = Math.min(3, p.risk + (task.task_type === 'main' ? 2 : 1))
  maybeRegress()
  event('penalty', sourceId, 'penalty', delta, `被标记虚报:${task.name},信任能量下降`)
}

// 英语未完成(断签):低落 + 智慧受损 + 风险+1
export function applyMissPenalty() {
  const a = petAttrs(); const p = pet()
  a.wisdom = clamp(a.wisdom - 4)
  a.mood_score = clamp(a.mood_score - 12)
  a.updated_at = nowISO()
  p.mood = 'low'
  p.risk = Math.min(3, p.risk + 1)
  maybeRegress()
  event('penalty', null, 'mood_change', { wisdom: -4 }, '今天没完成英语,智慧能量变弱了')
}

function maybeRegress() {
  const p = pet()
  if (p.risk >= 3 && p.stage_idx > 1) {
    p.stage_idx -= 1
    p.risk = 1
    event('evolution', null, 'evolution', {}, `${p.name} 退回了 ${STAGES[p.stage_idx].name}`)
  }
}

export function checkEvolution() {
  const a = petAttrs(); const p = pet()
  const total = a.wisdom + a.cleanliness + a.vitality + a.charm
  const next = STAGES[p.stage_idx + 1]
  if (!next) return null
  if (next.lv === 5) {
    const balanced = Math.min(a.wisdom, a.cleanliness, a.vitality, a.charm) >= 50
    const cr = db.credit_profile[0].credit_score
    if (!(total >= next.min && balanced && cr >= 90)) return null
  } else if (total < next.min) return null
  p.stage_idx += 1
  event('evolution', null, 'evolution', {}, `进化成了 ${STAGES[p.stage_idx].name}!`)
  return STAGES[p.stage_idx]
}

function labelDelta(delta) {
  const names = { wisdom: '智慧', cleanliness: '清洁', vitality: '活力', charm: '魅力' }
  return Object.entries(delta).map(([k, v]) => `${names[k] || k}${v >= 0 ? '+' : ''}${v}`).join(' ')
}
