// 宠物等级、阶段、形态、进化规则

// ===== 30 级体系 =====
export const MAX_LEVEL = 30
// 每级所需经验(随级数缓慢增长):Lv1→2 需 24,Lv29→30 需 82
export function expForLevel(level) { return 24 + (level - 1) * 2 }

// 初遇蛋:攒够这么多经验(≈5~6 次打卡)才孵化成幼犬 Lv.1
export const HATCH_EXP = 30

// 视觉阶段(stage_idx 1-6),由等级映射,0 号留给"蛋"。进化门槛前置、更频繁,早期每 2-3 级一变。
export const STAGES = [
  { name: '初遇蛋', lv: 0 },
  { name: '幼犬',   lv: 1 },   // Lv 1-2
  { name: '星纹犬', lv: 2 },   // Lv 3-4
  { name: '翼星犬', lv: 3 },   // Lv 5-7
  { name: '辉光犬', lv: 4 },   // Lv 8-11
  { name: '御星犬', lv: 5 },   // Lv 12-17
  { name: '星愿神犬', lv: 6 }  // Lv 18-30
]
export function tierFromLevel(level) {
  if (level >= 18) return 6
  if (level >= 12) return 5
  if (level >= 8) return 4
  if (level >= 5) return 3
  if (level >= 3) return 2
  return 1
}
// 每个阶段的起始等级(用于"距离下一形态还有几级")
export const TIER_START = [0, 1, 3, 5, 8, 12, 18]

// 体型随等级从小到大
export function sizeForLevel(level, max = 200) {
  const t = Math.min(1, (level - 1) / (MAX_LEVEL - 1))
  return Math.round(130 + t * (max - 130))
}
// 每个阶段不同的待机动作
export function animClassForLevel(level) {
  return [null, 'anim-pup', 'anim-grow', 'anim-form', 'anim-form', 'anim-elite', 'anim-god'][tierFromLevel(level)]
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

export const DEX = [
  { key: 'egg',  t: '初遇蛋', d: '一切的起点', rare: 'n', cond: p => (p.stage_idx || 0) >= 0 },
  { key: 'base', t: '幼犬',   d: 'Lv.1 · 奶油白幼犬', rare: 'n', cond: p => p.stage_idx >= 1 },
  { key: 'evo2', t: '星纹犬', d: 'Lv.3 · 长出金色星纹', rare: 'n', cond: p => p.stage_idx >= 2 },
  { key: 'evo3', t: '翼星犬', d: 'Lv.5 · 长出星光翅膀', rare: 'r', cond: p => p.stage_idx >= 3 },
  { key: 'evo4', t: '辉光犬', d: 'Lv.8 · 星光环绕', rare: 'r', cond: p => p.stage_idx >= 4 },
  { key: 'evo5', t: '御星犬', d: 'Lv.12 · 皇冠星空斗篷', rare: 'e', cond: p => p.stage_idx >= 5 },
  { key: 'god',  t: '星愿神犬', d: 'Lv.18 · 最强形态', rare: 'l', cond: p => p.stage_idx >= 6 }
]

export const RARE_TXT = { n: '普通', r: '稀有', e: '史诗', l: '传说' }
