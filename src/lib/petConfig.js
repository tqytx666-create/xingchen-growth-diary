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

export const FORM_LABEL = {
  wisdom: '会发光的学者犬 📚',
  cleanliness: '闪亮的香香犬 🛁',
  vitality: '敏捷的运动犬 🏸',
  charm: '优雅的魅力犬 ✨'
}

export function isLow(pet) {
  return pet.mood === 'low' || pet.mood === 'disappointed'
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
