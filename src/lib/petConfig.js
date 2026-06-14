// 宠物等级、阶段、形态、进化规则

// ===== 30 级体系 =====
export const MAX_LEVEL = 30
// 每级所需经验:Lv1~5 前期轻快(24→32),从 Lv6 起明显加大,放慢中后期升级节奏
// Lv5→6 仍是 32;Lv6→7 起跳到 90,之后每级 +20(Lv7:110…Lv12:210…Lv29:550)
export function expForLevel(level) {
  return level <= 5 ? 24 + (level - 1) * 2 : 90 + (level - 6) * 20
}

// 初遇蛋:攒够这么多经验(≈5~6 次打卡)才孵化成幼犬 Lv.1
export const HATCH_EXP = 30

// 形态总表(单一数据源):每 2 级一形态,一路到 Lv29。stage_idx = 在本数组里的下标(0=蛋)。
// f6~f14 暂无专属美术,先占位(图/活视频回落御星),逐轮用即梦补齐。
export const FORMS = [
  { key: 'egg',  name: '初遇蛋',   lv: 0,  rare: 'n', d: '一切的起点' },
  { key: 'base', name: '幼犬',     lv: 1,  rare: 'n', d: 'Lv.1 · 奶油白幼犬' },
  { key: 'evo2', name: '星纹犬',   lv: 3,  rare: 'n', d: 'Lv.3 · 长出金色星纹' },
  { key: 'evo3', name: '翼星犬',   lv: 5,  rare: 'r', d: 'Lv.5 · 长出星光翅膀' },
  { key: 'evo4', name: '辉光犬',   lv: 7,  rare: 'r', d: 'Lv.7 · 星光环绕' },
  { key: 'evo5', name: '御星犬',   lv: 9,  rare: 'e', d: 'Lv.9 · 皇冠星空斗篷' },
  { key: 'f6',   name: '流光犬',   lv: 11, rare: 'e', d: 'Lv.11 · 流光溢彩' },
  { key: 'f7',   name: '星河犬',   lv: 13, rare: 'e', d: 'Lv.13 · 星河披风' },
  { key: 'f8',   name: '月华犬',   lv: 15, rare: 'e', d: 'Lv.15 · 月华加身' },
  { key: 'f9',   name: '极光犬',   lv: 17, rare: 'l', d: 'Lv.17 · 极光环绕' },
  { key: 'f10',  name: '苍穹犬',   lv: 19, rare: 'l', d: 'Lv.19 · 苍穹之力' },
  { key: 'f11',  name: '星陨犬',   lv: 21, rare: 'l', d: 'Lv.21 · 星陨降临' },
  { key: 'f12',  name: '璀璨犬',   lv: 23, rare: 'l', d: 'Lv.23 · 璀璨星辉' },
  { key: 'f13',  name: '星皇犬',   lv: 25, rare: 'l', d: 'Lv.25 · 星之皇者' },
  { key: 'f14',  name: '天河犬',   lv: 27, rare: 'l', d: 'Lv.27 · 天河之主' },
  { key: 'god',  name: '星愿神犬', lv: 29, rare: 'l', d: 'Lv.29 · 终极形态' }
]
// 视觉阶段(stage_idx),由 FORMS 派生
export const STAGES = FORMS.map(f => ({ name: f.name, lv: f.lv }))
// 等级 → stage_idx:孵化后(level≥1)取 lv≤level 的最大形态下标
export function tierFromLevel(level) {
  let idx = 1
  for (let i = 1; i < FORMS.length; i++) { if (level >= FORMS[i].lv) idx = i; else break }
  return idx
}
// 每个阶段的起始等级(用于"距离下一形态还有几级")
export const TIER_START = FORMS.map(f => f.lv)
// 实际显示的形态下标:玩家在图鉴选了某个已解锁形态(displayForm)就用它,否则用当前等级形态
export function effectiveStage(pet) {
  const s = pet.stage_idx || 0
  const d = pet.displayForm
  return (d != null && d >= 1 && d <= s) ? d : s
}

// ===== 多物种(化身可以是不同动物)=====
// 设计:等级/经验/阶段/进化"数学结构"所有物种共享(同样 16 段、同样 lv 节点),
// 只有"形态名 + 立绘图 + 活动画"按物种区分。新物种缺图时回落到 dog,不会破图。
// pet.species_key 决定物种;老存档无该字段时默认 'dog'(见 store.ensurePet)。
export const SPECIES = {
  dog: { key: 'dog', name: '星愿犬', emoji: '🐶', forms: FORMS }
  // 下一轮接入:dragon(星愿龙)/ cat(星愿猫)…,各自 forms 同结构、不同名,配套即梦立绘
}
export const SPECIES_LIST = Object.values(SPECIES)
export function speciesKey(pet) { return (pet && pet.species_key) || 'dog' }
export function speciesMeta(key) { return SPECIES[key] || SPECIES.dog }
export function formsOf(key) { return (SPECIES[key] || SPECIES.dog).forms }
// 某宠物当前形态名(按物种取;缺则回落 dog 名)
export function formNameOf(pet, stage) {
  const f = formsOf(speciesKey(pet))[stage] || FORMS[stage]
  return f ? f.name : ''
}

// 体型随等级从小到大
export function sizeForLevel(level, max = 200) {
  const t = Math.min(1, (level - 1) / (MAX_LEVEL - 1))
  return Math.round(130 + t * (max - 130))
}
// 每个阶段不同的待机动作(超出已定义形态用最后一个)
export function animClassForLevel(level) {
  const a = [null, 'anim-pup', 'anim-grow', 'anim-form', 'anim-form', 'anim-elite', 'anim-god']
  return a[Math.min(tierFromLevel(level), a.length - 1)]
}

export function dominant(a) {
  const m = { wisdom: a.wisdom, cleanliness: a.cleanliness, vitality: a.vitality, charm: a.charm }
  return Object.keys(m).reduce((x, y) => (m[y] > m[x] ? y : x))
}

// 魅力 = 基础魅力 + 收集加成:越会打扮、收集的形态越多越有魅力 ✨
// 每拥有 1 款皮肤 +3,每解锁 1 个图鉴形态 +2(纯展示派生,不改存储值)
export const CHARM_PER_SKIN = 3
export const CHARM_PER_DEX = 2
export function charmTotal(baseCharm, skinCount, dexUnlocked) {
  return Math.round((baseCharm || 0) + (skinCount || 0) * CHARM_PER_SKIN + (dexUnlocked || 0) * CHARM_PER_DEX)
}

// ===== 属性满值机制(A 段位晋级 + B 解锁专属皮肤)=====
// 通过打卡增长、会封顶的三项:满 100 不再卡住,而是「晋级一星」,数值溢出保留继续涨。
export const ATTR_MAX = 100
export const TIER_ATTRS = ['wisdom', 'cleanliness', 'vitality']
export const ATTR_CN = { wisdom: '智慧', cleanliness: '清洁', vitality: '活力', charm: '魅力', discipline: '自律' }
export const TIER_NAMES = ['', '闪耀', '璀璨', '辉煌', '传说', '神话']   // index = 星级
export function tierName(t) { return TIER_NAMES[Math.min(t, TIER_NAMES.length - 1)] || `${t}阶` }
// B:某属性「首次」满值解锁的专属皮肤(已拥有则改发星币)
export const ATTR_SKIN = { wisdom: 'wizard', cleanliness: 'angel', vitality: 'dino' }
export const PROMOTE_COIN = 60   // 已拥有专属皮肤时,晋级改发的星币

export const FORM_LABEL = {
  wisdom: '会发光的学者犬 📚',
  cleanliness: '闪亮的香香犬 🛁',
  vitality: '敏捷的运动犬 🏸',
  charm: '优雅的魅力犬 ✨'
}

export function isLow(pet) {
  return pet.mood === 'low' || pet.mood === 'disappointed'
}

// ---- 健康 / 衰减机制 ----
// 不打卡 → 属性减少 + 健康下降;健康越低状态越差:健康→虚弱→生病→死亡(变回蛋)。
// 随时打卡/喂食都能回血,所以"死亡"只会发生在长期完全不管的情况(约连续 10 天彻底不打卡)。
export const HEALTH_MAX = 100
export const HEALTH_SICK = 25   // ≤ 此值:生病(明显病恹恹 + 强提醒)
export const HEALTH_WARN = 50   // ≤ 此值:虚弱(状态下滑,温和提醒)
export const DECAY = {
  missAllAttr: 3, missAllCharm: 2,                    // 一整天完全没打卡:属性普减(健康由习惯明细扣)
  missMainHealth: 4, missMainWisdom: 3,               // 打了卡但没打英语主线:额外扣
  regenMain: 8,                                       // 当天完成主线 + 生活习惯全做齐:健康回升
  missHabitAttr: 1,                                   // 每漏一项每日习惯:对应属性 -1(健康按下方明细扣)
  sickDailyDecay: 10,                                 // 生病(≤25)后每天固定扣 10(倒计时,必须吃药才能停)
  catchupCap: 60                                      // 单次最多回补处理的天数(防卡顿)
}
// 生活习惯漏打的「健康扣分明细」(差异化:洗澡最重、睡觉/刷牙中、房间轻)。每天判;漏一项扣对应分。
export const HABIT_PENALTY = { t_bath: 10, t_sleep: 8, t_teeth_am: 5, t_teeth_pm: 5, t_room: 3 }
// 给孩子看的明细表(图标+名称+扣分)
export const HABIT_PENALTY_LABEL = [
  { ic: '🛁', name: '洗澡', pen: 10 }, { ic: '🌜', name: '按时睡觉(23:00睡·07:00起)', pen: 8 },
  { ic: '🌞', name: '早上刷牙', pen: 5 }, { ic: '🌙', name: '晚上刷牙', pen: 5 },
  { ic: '🧹', name: '房间整洁', pen: 3 }, { ic: '🚿', name: '洗头(连续3天没洗)', pen: 20 }
]
// 洗头:周期性,不用每天打卡;连续 HAIR_CYCLE 天没洗 → 扣一次重的 HAIR_PENALTY
export const HAIR_TASK = 't_hair', HAIR_PENALTY = 20, HAIR_CYCLE = 3
// 今日待办提示用(每日必做项)
export const DAILY_HABITS = Object.keys(HABIT_PENALTY)
// 健康越低 → 日常奖励(打卡金币/宝箱)系数越低;生病(≤SICK)归零;健康良好(≥85)不打折。
// 英语主线打卡 + 连续签到里程碑奖励不受此影响。
// 日常奖励「总倍率」:健康 <50 暂停(0);健康但不满血=1;满血(≥85)+连续签到→超额(连签3→1.5 / 7→2 / 14→3)。
// 英语主线打卡 + 连续签到里程碑不受此影响。超出 1 的部分也作为开宝箱「升档暴率」。
export function rewardMultiplier(h, streak = 0) {
  const v = h == null ? HEALTH_MAX : h
  if (v < HEALTH_WARN) return 0             // 健康 <50:虚弱/生病,日常奖励暂停
  if (v < HEALTH_MAX) return 1              // 没满血(<100):基础 1 倍(超额必须满血100)
  if (streak < 2) return 1                  // 满血但连签<2天:还没超额
  if (streak === 2) return 1.2              // 连签2天:1.2倍起步
  if (streak <= 7) return Math.round((1.5 + (streak - 3) * 0.125) * 100) / 100   // 3→1.5 …7→2.0(每天涨)
  if (streak <= 14) return Math.round((2 + (streak - 7) / 7) * 100) / 100          // 7→2.0 …14→3.0(每天涨)
  return 3                                   // ≥14天:三倍封顶
}
// 精神状态档(给 UI 显示文案/配色):≥3神采/≥2超饱满火焰/>1元气绿光
export function spiritTier(m) {
  if (m >= 3) return { txt: '神采奕奕', lvl: 'super', c: '#ff9ec7' }
  if (m >= 2) return { txt: '超饱满', lvl: 'great', c: '#ffd86b' }
  if (m > 1) return { txt: '元气满满', lvl: 'good', c: '#6bffb0' }
  return { txt: '正常', lvl: 'normal', c: '#6bffb0' }
}
export const REGEN_CHECKIN_MAIN = 15  // 打主线卡回血
export const REGEN_CHECKIN_SIDE = 8   // 打支线卡回血
export const REGEN_ITEM = 10          // 喂道具回血
// 健康状态:egg(蛋,不生病) / healthy / weak(虚弱) / sick(生病) / dead(死亡→回蛋)
export function healthState(pet) {
  if (!pet || (pet.stage_idx || 0) <= 0) return 'egg'
  const h = pet.health == null ? HEALTH_MAX : pet.health
  if (h <= 0) return 'dead'
  if (h <= HEALTH_SICK) return 'sick'
  if (h <= HEALTH_WARN) return 'weak'
  return 'healthy'
}

export const SKINS = [
  { key: 'default', t: '默认', d: '星愿犬本来的样子', rare: 'n', o: {}, unlock: () => true, why: '' },
  { key: 'scholar', t: '英语学者', d: '小圆眼镜 + 知识星光', rare: 'r', o: { glasses: true, sparkle: true }, unlock: a => a.wisdom >= 50, why: '智慧达到 50' },
  { key: 'fresh', t: '香香浴袍', d: '浴巾 + 闪亮毛发', rare: 'r', o: { towel: true, sparkle: true }, unlock: a => a.cleanliness >= 45, why: '清洁达到 45' },
  { key: 'champ', t: '羽球冠军', d: '运动发带 + 小球拍', rare: 'e', o: { hat: true, racket: true }, unlock: a => a.vitality >= 45, why: '活力达到 45' },
  { key: 'god', t: '星愿神犬', d: '传说级,星空光环', rare: 'l', o: { halo: true, wings: true }, unlock: (a, pet) => pet.level >= 30, why: '升到 Lv.30' }
]

// 图鉴:由 FORMS 派生(蛋常显;其余按 stage_idx 解锁)
export const DEX = FORMS.map((f, i) => ({
  key: f.key, t: f.name, d: f.d, rare: f.rare,
  cond: i === 0 ? (p => (p.stage_idx || 0) >= 0) : (p => (p.stage_idx || 0) >= i)
}))

export const RARE_TXT = { n: '普通', r: '稀有', e: '史诗', l: '传说' }
