import { db, pet, petAttrs } from '../lib/store.js'
import { clamp, nowISO, uid, todayStr, addDays } from '../lib/util.js'
import { earnCoins } from './coinService.js'
import { STAGES, MAX_LEVEL, expForLevel, tierFromLevel, HATCH_EXP,
  HEALTH_MAX, HEALTH_SICK, HEALTH_WARN, DECAY, DAILY_HABITS, healthState, REGEN_CHECKIN_MAIN, REGEN_CHECKIN_SIDE, REGEN_ITEM,
  ATTR_MAX, TIER_ATTRS, ATTR_CN, ATTR_SKIN, tierName } from '../lib/petConfig.js'

// 属性满值晋级(A+B):某项 ≥100 → 星级 +1、溢出保留;首次满值解锁专属皮肤(已有则标记发星币)
function checkPromote(a, k, promotions) {
  if (!TIER_ATTRS.includes(k)) return
  if (!a.tiers) a.tiers = {}
  let guard = 0
  while ((a[k] || 0) >= ATTR_MAX && guard++ < 10) {
    a[k] = (a[k] || 0) - ATTR_MAX
    a.tiers[k] = (a.tiers[k] || 0) + 1
    const tier = a.tiers[k]
    const skinKey = ATTR_SKIN[k]
    let gotSkin = null, needCoin = false
    if (tier === 1 && skinKey && !(db.owned_skins || []).includes(skinKey)) {
      if (!db.owned_skins) db.owned_skins = ['default']
      db.owned_skins.push(skinKey); gotSkin = skinKey
    } else needCoin = true
    event('evolution', null, 'promote', {}, `🎉 ${ATTR_CN[k]}突破上限,晋升「${tierName(tier)}${ATTR_CN[k]}」!${gotSkin ? '解锁专属皮肤 🎁' : ''}`)
    promotions.push({ attr: k, tier, gotSkin, needCoin })
  }
}

const ATTR_KEYS = ['wisdom', 'cleanliness', 'vitality', 'charm', 'discipline']
function isEnglishTask(t) { return !!t && (t.task_type === 'main' || t.lesson || t.category === 'english') }
// 某天是否有有效打卡 / 是否打了英语主线 / 当天打了哪些任务
function dayActivity(dateStr) {
  let any = false, main = false; const done = new Set()
  for (const c of db.checkins || []) {
    if (c.checkin_date !== dateStr) continue
    if (c.status === 'false_reported' || c.status === 'revoked') continue
    any = true; done.add(c.task_id)
    if (isEnglishTask((db.tasks || []).find(t => t.id === c.task_id))) main = true
  }
  return { any, main, done }
}
// 当天漏打的「每日必做习惯」任务(只算仍启用的)
function missedDailyHabits(done) {
  const res = []
  for (const id of DAILY_HABITS) {
    const t = (db.tasks || []).find(x => x.id === id && x.is_active !== false)
    if (t && !done.has(id)) res.push(t)
  }
  return res
}
// 漏打每日习惯的代价:对应属性各 -missHabitAttr,健康按漏打项数小扣(封顶)。返回扣的健康值
function applyHabitMiss(missed, a, p) {
  if (!missed.length) return 0
  for (const t of missed) { const k = t.attribute_key || 'cleanliness'; a[k] = clamp((a[k] || 0) - DECAY.missHabitAttr) }
  const hCut = Math.min(DECAY.missHabitHealthCap, missed.length * DECAY.missHabitHealth)
  p.health = clamp((p.health || 0) - hCut)
  return hCut
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
    const { any, main, done } = dayActivity(d)
    if (!any) {                                  // 完全没打卡:属性普减 + 健康大降
      for (const k of ATTR_KEYS) a[k] = clamp((a[k] || 0) - (k === 'charm' ? DECAY.missAllCharm : DECAY.missAllAttr))
      p.health = clamp((p.health || 0) - DECAY.missAllHealth)
    } else if (!main) {                          // 打了卡但没打英语主线
      a.wisdom = clamp((a.wisdom || 0) - DECAY.missMainWisdom)
      p.health = clamp((p.health || 0) - DECAY.missMainHealth)
      applyHabitMiss(missedDailyHabits(done), a, p)   // 生活习惯漏打照样扣
    } else {                                     // 完成英语主线:生活习惯都做齐才给回血奖励;漏了就照扣(让健康真能看到降)
      const missed = missedDailyHabits(done)
      if (missed.length) applyHabitMiss(missed, a, p)
      else p.health = Math.min(HEALTH_MAX, (p.health || 0) + DECAY.regenMain)
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

// 打卡/喂食回血:健康良好(>虚弱线)时不再无脑回满——否则"漏生活习惯"的下降会被一次打卡刷掉。
// 只在虚弱/生病(≤50)时回血,把宠物从濒危拉回来(救命机制保留)。健康反映的是整体照顾程度,不是打了一次卡。
function regen(amount) {
  const p = pet()
  const cur = p.health == null ? HEALTH_MAX : p.health
  if (cur > HEALTH_WARN) return
  p.health = Math.min(HEALTH_MAX, cur + amount)
}

function event(sourceType, sourceId, eventType, delta, message) {
  db.pet_events.unshift({
    id: uid('pe_'), pet_id: pet().id, source_type: sourceType, source_id: sourceId,
    event_type: eventType, attribute_delta: delta, message, created_at: nowISO()
  })
  if (db.pet_events.length > 300) db.pet_events.pop()
}

// 升级礼包:每升一级发星币红包,逢5整级加道具;进化大礼包(宝箱+星币);孵化欢迎红包。收集到 rewards 给 UI 展示。
const GIFT_ITEMS = ['bone', 'fish', 'ball', 'wand']
function grantLevelGift(level, rewards) {
  const coin = 10 + Math.floor(level / 5) * 5            // Lv1~4:10 / 5~9:15 / 10~14:20 …
  earnCoins(coin, `🎉 升到 Lv.${level} 升级红包`)
  rewards.push({ type: 'coin', n: coin })
  if (level % 5 === 0) {                                  // 逢 5 整级加送一个道具
    const it = GIFT_ITEMS[(level / 5 - 1) % GIFT_ITEMS.length]
    if (!db.items) db.items = {}
    db.items[it] = (db.items[it] || 0) + 1
    rewards.push({ type: 'item', key: it })
  }
}
function grantEvolveGift(level, stageName, rewards) {
  if (!db.boxes) db.boxes = []
  const tier = level >= 29 ? 'diamond' : (level >= 15 ? 'gold' : 'silver')
  db.boxes.unshift({ id: uid('bx_'), tier, source_task: `进化礼包·${stageName}`, earned_at: nowISO(), opened_at: null, minutes: null, coinsOnly: false })
  earnCoins(20, `🌟 进化礼包·${stageName}`)
  rewards.push({ type: 'evobox', tier }, { type: 'coin', n: 20 })
}

// 加经验并处理升级 / 跨阶段进化。返回 { leveledUp, newLevel, tierUp, hatched, rewards }
function addExp(amount, sourceId) {
  const p = pet()
  if (p.level == null) { p.level = 0; p.exp = 0; p.stage_idx = 0 }

  // 蛋阶段(stage 0):攒经验到 HATCH_EXP 才孵化成幼犬 Lv.1
  if ((p.stage_idx || 0) <= 0) {
    p.exp = (p.exp || 0) + amount
    if (p.exp >= HATCH_EXP) {
      p.exp = 0; p.level = 1; p.stage_idx = 1
      event('evolution', sourceId, 'evolution', {}, `🥚✨ 初遇蛋孵化啦!${p.name} 出生成了幼犬!`)
      const rewards = []
      earnCoins(15, '🥚 孵化欢迎红包'); rewards.push({ type: 'coin', n: 15 })
      return { leveledUp: false, newLevel: 1, tierUp: STAGES[1], hatched: true, rewards }
    }
    return { leveledUp: false, newLevel: 0, tierUp: null, hatched: false, rewards: [] }
  }

  const beforeTier = tierFromLevel(p.level)
  p.exp = (p.exp || 0) + amount
  let leveledUp = false
  const rewards = []
  while (p.level < MAX_LEVEL && p.exp >= expForLevel(p.level)) {
    p.exp -= expForLevel(p.level)
    p.level += 1
    leveledUp = true
    event('evolution', sourceId, 'levelup', {}, `升到 Lv.${p.level} 啦!`)
    grantLevelGift(p.level, rewards)               // 每升一级:升级红包(+逢5道具)
  }
  if (p.level >= MAX_LEVEL) p.exp = 0
  const newTier = tierFromLevel(p.level)
  p.stage_idx = newTier
  let tierUp = null
  if (newTier > beforeTier) {
    tierUp = STAGES[newTier]
    event('evolution', sourceId, 'evolution', {}, `进化成了 ${STAGES[newTier].name}!`)
    grantEvolveGift(p.level, STAGES[newTier].name, rewards)   // 进化大礼包:宝箱 + 星币
  }
  return { leveledUp, newLevel: p.level, tierUp, hatched: false, rewards }
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
  // 满值晋级检测(在 mood/updated 之前算,溢出保留)
  const promotions = []
  checkPromote(a, task.attribute_key, promotions)
  if (task.attribute_key2) checkPromote(a, task.attribute_key2, promotions)
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
  return { delta, ...lv, promotions }
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

function labelDelta(delta) {
  const names = { wisdom: '智慧', cleanliness: '清洁', vitality: '活力', charm: '魅力' }
  return Object.entries(delta).map(([k, v]) => `${names[k] || k}${v >= 0 ? '+' : ''}${v}`).join(' ')
}
