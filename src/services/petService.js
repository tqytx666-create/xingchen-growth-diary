import { db, pet, petAttrs } from '../lib/store.js'
import { clamp, nowISO, uid, todayStr, addDays } from '../lib/util.js'
import { STAGES, MAX_LEVEL, expForLevel, tierFromLevel, HATCH_EXP,
  HEALTH_MAX, HEALTH_SICK, DECAY, healthState, REGEN_CHECKIN_MAIN, REGEN_CHECKIN_SIDE, REGEN_ITEM } from '../lib/petConfig.js'

const ATTR_KEYS = ['wisdom', 'cleanliness', 'vitality', 'charm', 'discipline']
function isEnglishTask(t) { return !!t && (t.task_type === 'main' || t.lesson || t.category === 'english') }
// 某天是否有有效打卡 / 是否打了英语主线
function dayActivity(dateStr) {
  let any = false, main = false
  for (const c of db.checkins || []) {
    if (c.checkin_date !== dateStr) continue
    if (c.status === 'false_reported' || c.status === 'revoked') continue
    any = true
    if (isEnglishTask((db.tasks || []).find(t => t.id === c.task_id))) main = true
  }
  return { any, main }
}

// 每日健康结算:把"上次结算日"到"昨天"的每个完整过去日按打卡情况衰减/回血。
// 幂等(只处理 last_decay_date 之后的日子);首次缺字段则只初始化、不追溯历史(不冤枉老数据)。
// 健康归零 → 死亡回蛋。返回 { died, processed, state } 或 null(无需处理)。
export function settleHealth() {
  const p = pet(); const a = petAttrs()
  if (!p) return null
  if (p.health == null) p.health = HEALTH_MAX
  const today = todayStr()
  if (!p.last_decay_date) { p.last_decay_date = today; return null }
  if ((p.stage_idx || 0) <= 0) { p.last_decay_date = today; return null }   // 蛋阶段不衰减
  if (p.last_decay_date >= today) return null

  let d = p.last_decay_date, processed = 0, died = false
  while (d < today && processed < DECAY.catchupCap) {
    d = addDays(d, 1)
    if (d >= today) break                       // 今天还没过完,不罚今天
    const { any, main } = dayActivity(d)
    if (!any) {                                  // 完全没打卡:属性普减 + 健康大降
      for (const k of ATTR_KEYS) a[k] = clamp((a[k] || 0) - (k === 'charm' ? DECAY.missAllCharm : DECAY.missAllAttr))
      p.health = clamp((p.health || 0) - DECAY.missAllHealth)
    } else if (!main) {                          // 打了卡但没打英语主线
      a.wisdom = clamp((a.wisdom || 0) - DECAY.missMainWisdom)
      p.health = clamp((p.health || 0) - DECAY.missMainHealth)
    } else {                                     // 完成主线:健康回升
      p.health = Math.min(HEALTH_MAX, (p.health || 0) + DECAY.regenMain)
    }
    processed++
    if (p.health <= 0) { died = true; break }
  }
  p.last_decay_date = died ? today : d
  a.updated_at = nowISO()

  const st = healthState(p)
  if (st === 'sick') p.mood = 'low'
  else if (st === 'weak' && p.mood === 'happy') p.mood = 'normal'

  if (died) { reviveAsEgg('neglect'); return { died: true, processed, state: 'dead' } }
  if (processed) event('decay', null, 'mood_change', {}, st === 'sick' ? `${p.name} 太久没人陪,生病了…快打卡照顾它` : (st === 'weak' ? `${p.name} 状态有点下滑了` : `${p.name} 状态稳住了`))
  return { died: false, processed, state: st }
}

// 死亡:变回一颗蛋重新孵化。保留收集(星币/皮肤/房间/家具/最长连签/已得里程碑),只重养形态。
export function reviveAsEgg(reason) {
  const p = pet(); const a = petAttrs()
  const wasLevel = p.level
  p.level = 0; p.exp = 0; p.stage_idx = 0; p.mood = 'normal'; p.risk = 0
  p.health = HEALTH_MAX; p.skin = 'default'; p.displayForm = null; p.last_decay_date = todayStr()
  a.wisdom = 12; a.cleanliness = 8; a.vitality = 6; a.charm = 4; a.discipline = 5
  a.mood_score = 60; a.updated_at = nowISO()
  db.pending_death = { name: p.name, level: wasLevel, reason: reason || 'neglect', at: nowISO() }
  event('evolution', null, 'death', {}, `💔 ${p.name} 太久没被照顾,变回了一颗蛋…重新孵化、再陪它长大吧。`)
}

// 打卡/喂食回血
function regen(amount) { const p = pet(); p.health = Math.min(HEALTH_MAX, (p.health == null ? HEALTH_MAX : p.health) + amount) }

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
  return { leveledUp, newLevel: p.level, tierUp, hatched: false }
}

// 任务完成加属性 + 经验
export function applyTaskExp(task, sourceId) {
  const a = petAttrs(); const p = pet()
  const delta = {}
  a[task.attribute_key] = clamp((a[task.attribute_key] || 0) + task.base_exp)
  delta[task.attribute_key] = task.base_exp
  if (task.attribute_key2) {
    a[task.attribute_key2] = clamp((a[task.attribute_key2] || 0) + task.base_exp2)
    delta[task.attribute_key2] = task.base_exp2
  }
  a.mood_score = clamp(a.mood_score + 4)
  a.updated_at = nowISO()
  regen(task.task_type === 'main' ? REGEN_CHECKIN_MAIN : REGEN_CHECKIN_SIDE)   // 打卡回血(能从生病中救回来)
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
  regen(REGEN_ITEM)                                  // 喂食回血
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
    a[task.attribute_key] = clamp((a[task.attribute_key] || 0) - back)
    delta[task.attribute_key] = -back
    if (task.attribute_key2) { a[task.attribute_key2] = clamp((a[task.attribute_key2] || 0) - (task.base_exp2 || 0)); delta[task.attribute_key2] = -(task.base_exp2 || 0) }
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
