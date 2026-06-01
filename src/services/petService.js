import { db, pet, petAttrs } from '../lib/store.js'
import { clamp, nowISO, uid } from '../lib/util.js'
import { STAGES, MAX_LEVEL, expForLevel, tierFromLevel, HATCH_EXP } from '../lib/petConfig.js'

function event(sourceType, sourceId, eventType, delta, message) {
  db.pet_events.unshift({
    id: uid('pe_'), pet_id: pet().id, source_type: sourceType, source_id: sourceId,
    event_type: eventType, attribute_delta: delta, message, created_at: nowISO()
  })
  if (db.pet_events.length > 300) db.pet_events.pop()
}

// 加经验并处理升级 / 跨阶段进化。返回 { leveledUp, newLevel, tierUp, hatched }
function addExp(amount, sourceId) {
  const p = pet()
  if (p.level == null) { p.level = 0; p.exp = 0; p.stage_idx = 0 }

  // 蛋阶段(stage 0):攒经验到 HATCH_EXP 才孵化成幼犬 Lv.1
  if ((p.stage_idx || 0) <= 0) {
    p.exp = (p.exp || 0) + amount
    if (p.exp >= HATCH_EXP) {
      p.exp = 0; p.level = 1; p.stage_idx = 1
      event('evolution', sourceId, 'evolution', {}, `🥚✨ 初遇蛋孵化啦!${p.name} 出生成了幼犬!`)
      return { leveledUp: false, newLevel: 1, tierUp: STAGES[1], hatched: true }
    }
    return { leveledUp: false, newLevel: 0, tierUp: null, hatched: false }
  }

  const beforeTier = tierFromLevel(p.level)
  p.exp = (p.exp || 0) + amount
  let leveledUp = false
  while (p.level < MAX_LEVEL && p.exp >= expForLevel(p.level)) {
    p.exp -= expForLevel(p.level)
    p.level += 1
    leveledUp = true
    event('evolution', sourceId, 'levelup', {}, `升到 Lv.${p.level} 啦!`)
  }
  if (p.level >= MAX_LEVEL) p.exp = 0
  const newTier = tierFromLevel(p.level)
  p.stage_idx = newTier
  let tierUp = null
  if (newTier > beforeTier) {
    tierUp = STAGES[newTier]
    event('evolution', sourceId, 'evolution', {}, `进化成了 ${STAGES[newTier].name}!`)
  }
  return { leveledUp, newLevel: p.level, tierUp }
}

// 任务完成加属性 + 经验
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
  if (task.task_type === 'main') {
    if (p.mood === 'low') p.mood = 'normal'
    if (p.risk > 0) p.risk = Math.max(0, p.risk - 1)
  }
  p.mood = 'happy'
  event('checkin', sourceId, 'exp_gain', delta, `${task.name}完成,${labelDelta(delta)}`)
  const expGain = (task.base_exp || 0) + (task.base_exp2 || 0)
  const lv = addExp(expGain, sourceId)
  return { delta, ...lv }
}

// 使用道具:加心情(变开心、消退阶风险)+ 少量经验(可触发孵化/升级)。返回 addExp 的结果(含 hatched/tierUp)
export function applyItem(item) {
  const a = petAttrs(); const p = pet()
  if (item.mood) a.mood_score = clamp(a.mood_score + item.mood)
  p.mood = 'happy'
  if (p.risk > 0) p.risk = Math.max(0, p.risk - 1)
  a.updated_at = nowISO()
  event('item', item.key, 'item_use', {}, `用了${item.name},${item.msg}`)
  return item.exp ? addExp(item.exp, 'item_' + item.key) : { leveledUp: false, newLevel: p.level, tierUp: null, hatched: false }
}

// 虚报惩罚
export function applyFalseReportPenalty(task, interacted) {
  const a = petAttrs(); const p = pet()
  const delta = {}
  if (interacted) {
    const back = (task.base_exp || 0) + 3
    a[task.attribute_key] = clamp(a[task.attribute_key] - back)
    delta[task.attribute_key] = -back
    if (task.attribute_key2) { a[task.attribute_key2] = clamp(a[task.attribute_key2] - (task.base_exp2 || 0)); delta[task.attribute_key2] = -(task.base_exp2 || 0) }
  }
  a.mood_score = clamp(a.mood_score - 14)
  a.trust_bond = clamp(a.trust_bond - 10)
  a.updated_at = nowISO()
  p.mood = 'disappointed'
  p.risk = Math.min(3, p.risk + (task.task_type === 'main' ? 2 : 1))
  maybeRegress()
  event('penalty', null, 'penalty', delta, `被标记虚报:${task.name},信任能量下降`)
}

// 英语未完成(断签)
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

// 退阶:风险满 → 温和退 2 级
function maybeRegress() {
  const p = pet()
  if (p.risk >= 3 && p.level > 1) {
    p.level = Math.max(1, p.level - 2)
    p.exp = 0
    p.risk = 1
    p.stage_idx = tierFromLevel(p.level)
    event('evolution', null, 'evolution', {}, `${p.name} 退回了 Lv.${p.level}`)
  }
}

// 兼容旧调用(现在升级在 applyTaskExp 内完成)
export function checkEvolution() { return null }

function labelDelta(delta) {
  const names = { wisdom: '智慧', cleanliness: '清洁', vitality: '活力', charm: '魅力' }
  return Object.entries(delta).map(([k, v]) => `${names[k] || k}${v >= 0 ? '+' : ''}${v}`).join(' ')
}
